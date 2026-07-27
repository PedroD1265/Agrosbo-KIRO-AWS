/**
 * S4 PostgreSQL Concurrency Test — Spike implementation.
 *
 * Tests ADR 017 decisions under concurrent access:
 * - 10 concurrent requests with same token attempting same transition.
 * - Exactly ONE must succeed; others get conflict or idempotent response.
 * - Replay of already-applied action is idempotent.
 * - Contradictory transitions produce controlled conflict.
 *
 * Requires dedicated spike PostgreSQL container:
 *   container: agrosbo-spike-token-db
 *   host port: 54322
 *   database:  agrosbo_spike_token
 *
 * DO NOT use agrosbo-local-db (port 54321) — that is reserved for the
 * application's development database.
 *
 * Uses a temporary table (spike_collab_tokens) that is dropped after test.
 *
 * DISPOSABLE — not production code.
 */

import pg from 'pg';
import { randomBytes, createHash } from 'node:crypto';

const { Pool } = pg;

interface PgTestResult {
  name: string;
  pass: boolean;
  detail: string;
}

const DB_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/agrosbo_spike_token';

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

async function setup(pool: pg.Pool): Promise<void> {
  await pool.query(`
    DROP TABLE IF EXISTS spike_collab_tokens;
    CREATE TABLE spike_collab_tokens (
      hash TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'sent',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      revoked BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);
}

async function cleanup(pool: pg.Pool): Promise<void> {
  await pool.query('DROP TABLE IF EXISTS spike_collab_tokens;');
}

/**
 * Attempt a state transition using SELECT FOR UPDATE + conditional UPDATE.
 * Returns: 'transitioned' | 'idempotent' | 'conflict' | 'error:<msg>'
 */
async function attemptTransition(
  pool: pg.Pool,
  tokenHash: string,
  fromState: string,
  toState: string,
): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockResult = await client.query(
      'SELECT state FROM spike_collab_tokens WHERE hash = $1 FOR UPDATE',
      [tokenHash],
    );
    if (lockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return 'error:not_found';
    }
    const currentState = lockResult.rows[0].state;

    // Idempotent: already at target
    if (currentState === toState) {
      await client.query('COMMIT');
      return 'idempotent';
    }

    // Not at expected source state
    if (currentState !== fromState) {
      await client.query('ROLLBACK');
      return 'conflict';
    }

    // Perform transition
    await client.query('UPDATE spike_collab_tokens SET state = $1 WHERE hash = $2 AND state = $3', [
      toState,
      tokenHash,
      fromState,
    ]);
    await client.query('COMMIT');
    return 'transitioned';
  } catch (err) {
    await client.query('ROLLBACK');
    return `error:${(err as Error).message}`;
  } finally {
    client.release();
  }
}

async function testConcurrentTransition(pool: pg.Pool): Promise<PgTestResult> {
  const token = generateToken();
  const hash = hashToken(token);
  const ttl = new Date(Date.now() + 3600_000);

  // Insert token in 'opened_link' state (simulating already opened)
  await pool.query(
    `INSERT INTO spike_collab_tokens (hash, task_id, state, expires_at)
     VALUES ($1, 'task-001', 'opened_link', $2)`,
    [hash, ttl],
  );

  // Launch 10 concurrent transitions: opened_link → responded
  const promises = Array.from({ length: 10 }, () =>
    attemptTransition(pool, hash, 'opened_link', 'responded'),
  );
  const results = await Promise.all(promises);

  const transitioned = results.filter((r) => r === 'transitioned').length;
  const idempotent = results.filter((r) => r === 'idempotent').length;
  const conflict = results.filter((r) => r === 'conflict').length;

  // Verify final state in DB
  const finalRow = await pool.query('SELECT state FROM spike_collab_tokens WHERE hash = $1', [
    hash,
  ]);
  const finalState = finalRow.rows[0]?.state;

  const pass = transitioned === 1 && conflict + idempotent === 9 && finalState === 'responded';

  return {
    name: 'Concurrency: 10 requests → exactly 1 transition',
    pass,
    detail: `transitioned=${transitioned}, idempotent=${idempotent}, conflict=${conflict}, finalState=${finalState}`,
  };
}

async function testReplayIdempotent(pool: pg.Pool): Promise<PgTestResult> {
  const token = generateToken();
  const hash = hashToken(token);
  const ttl = new Date(Date.now() + 3600_000);

  await pool.query(
    `INSERT INTO spike_collab_tokens (hash, task_id, state, expires_at)
     VALUES ($1, 'task-002', 'opened_link', $2)`,
    [hash, ttl],
  );

  // First transition
  const first = await attemptTransition(pool, hash, 'opened_link', 'responded');
  // Replay
  const replay = await attemptTransition(pool, hash, 'opened_link', 'responded');

  const pass = first === 'transitioned' && replay === 'idempotent';

  return {
    name: 'Replay: identical action is idempotent',
    pass,
    detail: `first=${first}, replay=${replay}`,
  };
}

async function testContradictoryTransition(pool: pg.Pool): Promise<PgTestResult> {
  const token = generateToken();
  const hash = hashToken(token);
  const ttl = new Date(Date.now() + 3600_000);

  await pool.query(
    `INSERT INTO spike_collab_tokens (hash, task_id, state, expires_at)
     VALUES ($1, 'task-003', 'opened_link', $2)`,
    [hash, ttl],
  );

  // Two contradictory transitions simultaneously
  const [resultA, resultB] = await Promise.all([
    attemptTransition(pool, hash, 'opened_link', 'responded'),
    attemptTransition(pool, hash, 'opened_link', 'revoked'),
  ]);

  // Exactly one should transition, the other should conflict
  const outcomes = [resultA, resultB];
  const transitioned = outcomes.filter((r) => r === 'transitioned').length;
  const conflict = outcomes.filter((r) => r === 'conflict').length;

  const pass = transitioned === 1 && conflict === 1;

  return {
    name: 'Contradictory: responded vs revoked → one wins, one conflicts',
    pass,
    detail: `resultA=${resultA}, resultB=${resultB}`,
  };
}

export async function runPgTests(): Promise<PgTestResult[]> {
  const pool = new Pool({ connectionString: DB_URL, max: 15 });
  const results: PgTestResult[] = [];

  try {
    await setup(pool);

    results.push(await testConcurrentTransition(pool));
    results.push(await testReplayIdempotent(pool));
    results.push(await testContradictoryTransition(pool));
  } finally {
    await cleanup(pool);
    await pool.end();
  }

  return results;
}
