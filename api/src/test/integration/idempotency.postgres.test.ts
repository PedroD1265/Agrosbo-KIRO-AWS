import { promises as fs } from 'node:fs';
import path from 'node:path';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for PostgreSQL integration tests');
}
const TEST_DB_URL = process.env.DATABASE_URL;

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql, eq } from 'drizzle-orm';
import * as schema from '@agrosbo/shared/schema';
import { claimTx, completeTx, releaseTx } from '../../idempotency.js';
import { DbStorage } from '../../dbStorage.js';

describe('PostgreSQL Idempotency & Concurrency Integration Tests', () => {
  let pool1: pg.Pool;
  let pool2: pg.Pool;
  let db1: any;
  let db2: any;

  beforeAll(async () => {
    pool1 = new pg.Pool({ connectionString: TEST_DB_URL, max: 5 });
    pool2 = new pg.Pool({ connectionString: TEST_DB_URL, max: 5 });

    // Apply migration SQL if schema not yet initialized
    try {
      const migrationSqlPath = path.resolve(
        process.cwd(),
        'api/migrations/0000_light_skullbuster.sql',
      );
      const migrationSql = await fs.readFile(migrationSqlPath, 'utf8');
      await pool1.query(migrationSql);
    } catch {
      /* Schema already exists */
    }

    db1 = drizzle(pool1, { schema });
    db2 = drizzle(pool2, { schema });
  });

  afterAll(async () => {
    await pool1.end();
    await pool2.end();
  });

  beforeEach(async () => {
    // Clear idempotency_keys and tasks created during tests
    await db1.execute(sql`DELETE FROM idempotency_keys WHERE key LIKE 'test-pg-%'`);
    await db1.execute(sql`DELETE FROM tasks WHERE id LIKE 't-pg-%'`);
  });

  it('1. 2 simultaneous requests with same key → exactly 1 entity created', async () => {
    const key = `test-pg-2sim-${Date.now()}`;

    const taskData = {
      title: 'Tarea simultanea 2',
      scopeType: 'block' as const,
      scopeId: 'b-1',
      dueDate: new Date().toISOString().slice(0, 10),
      priority: 'high' as const,
      status: 'pending' as const,
    };

    const runRequest = async (dbClient: any, clientId: string) => {
      return await dbClient.transaction(async (tx: any) => {
        const claimRes = await claimTx(tx, key);
        if (claimRes.type !== 'claimed') {
          return claimRes;
        }
        const storage = new DbStorage(tx);
        const task = await storage.createTask({
          id: `t-pg-${clientId}`,
          ...taskData,
        });
        const body = { id: task.id, title: task.title };
        await completeTx(tx, key, claimRes.token, 201, body);
        return { type: 'executed', status: 201, body };
      });
    };

    const [res1, res2] = await Promise.all([
      runRequest(db1, 'client1'),
      runRequest(db2, 'client2'),
    ]);

    const results = [res1, res2];
    const executed = results.filter((r) => r.type === 'executed');
    const duplicate = results.filter((r) => r.type === 'processing' || r.type === 'completed');

    expect(executed.length).toBe(1);
    expect(duplicate.length).toBe(1);

    // Verify DB count
    const [{ count }] = await db1
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.tasks)
      .where(sql`${schema.tasks.id} LIKE 't-pg-%'`);
    expect(count).toBe(1);
  });

  it('2. 10 simultaneous requests with same key → exactly 1 entity created', async () => {
    const key = `test-pg-10sim-${Date.now()}`;

    const runRequest = async (i: number) => {
      // Alternate database client connections
      const client = i % 2 === 0 ? db1 : db2;
      return await client.transaction(async (tx: any) => {
        const claimRes = await claimTx(tx, key);
        if (claimRes.type !== 'claimed') {
          return claimRes;
        }
        const storage = new DbStorage(tx);
        const task = await storage.createTask({
          id: `t-pg-10sim-${i}`,
          title: 'Tarea simultanea 10',
          scopeType: 'block' as const,
          scopeId: 'b-1',
          dueDate: new Date().toISOString().slice(0, 10),
          priority: 'med' as const,
          status: 'pending' as const,
        });
        const body = { id: task.id, title: task.title };
        await completeTx(tx, key, claimRes.token, 201, body);
        return { type: 'executed', status: 201, body };
      });
    };

    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => runRequest(i)));

    const executed = results.filter((r) => r.type === 'executed');
    expect(executed.length).toBe(1);

    // Verify entity count
    const [{ count }] = await db1
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.tasks)
      .where(sql`${schema.tasks.title} = 'Tarea simultanea 10'`);
    expect(count).toBe(1);

    // Verify idempotency keys count
    const [{ keyCount }] = await db1
      .select({ keyCount: sql<number>`count(*)::int` })
      .from(schema.idempotencyKeys)
      .where(eq(schema.idempotencyKeys.key, key));
    expect(keyCount).toBe(1);
  });

  it('3. Same canonical result for all retries', async () => {
    const key = `test-pg-retry-${Date.now()}`;
    const initialBody = { id: 't-pg-canon-1', title: 'Tarea Canonica' };

    // 1st request completes
    await db1.transaction(async (tx: any) => {
      const claimRes = await claimTx(tx, key);
      expect(claimRes.type).toBe('claimed');
      if (claimRes.type !== 'claimed') return;

      const storage = new DbStorage(tx);
      await storage.createTask({
        id: initialBody.id,
        title: initialBody.title,
        scopeType: 'block',
        scopeId: 'b-1',
        dueDate: '2026-07-24',
        priority: 'low',
        status: 'pending',
      });
      await completeTx(tx, key, claimRes.token, 201, initialBody);
    });

    // 2nd and 3rd retry requests receive identical canonical result
    const r2 = await db2.transaction(async (tx: any) => claimTx(tx, key));
    const r3 = await db1.transaction(async (tx: any) => claimTx(tx, key));

    expect(r2).toEqual({ type: 'completed', status: 201, body: initialBody });
    expect(r3).toEqual({ type: 'completed', status: 201, body: initialBody });
  });

  it('4. Failure after claim → zero entity and claim recoverable', async () => {
    const key = `test-pg-fail-claim-${Date.now()}`;

    // First attempt fails during transaction (throws exception)
    await expect(
      db1.transaction(async (tx: any) => {
        const claimRes = await claimTx(tx, key);
        expect(claimRes.type).toBe('claimed');
        throw new Error('Simulated crash before business logic');
      }),
    ).rejects.toThrow();

    // Verify transaction rolled back — zero entities and key removed
    const [{ keyCount }] = await db1
      .select({ keyCount: sql<number>`count(*)::int` })
      .from(schema.idempotencyKeys)
      .where(eq(schema.idempotencyKeys.key, key));
    expect(keyCount).toBe(0);

    // Second attempt can claim key cleanly
    const r2 = await db2.transaction(async (tx: any) => claimTx(tx, key));
    expect(r2.type).toBe('claimed');
  });

  it('5. Failure after executing mutation but before responding → transaction rollback, zero entity', async () => {
    const key = `test-pg-fail-mid-${Date.now()}`;

    // Transaction executes createTask but throws before completeTx
    await expect(
      db1.transaction(async (tx: any) => {
        const claimRes = await claimTx(tx, key);
        expect(claimRes.type).toBe('claimed');

        const storage = new DbStorage(tx);
        await storage.createTask({
          id: 't-pg-mid-1',
          title: 'Tarea abortada',
          scopeType: 'block',
          scopeId: 'b-1',
          dueDate: '2026-07-24',
          priority: 'med',
          status: 'pending',
        });

        throw new Error('Simulated network loss before commit');
      }),
    ).rejects.toThrow();

    // Verify entity was NOT saved (rolled back atomically)
    const [{ count }] = await db1
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.tasks)
      .where(eq(schema.tasks.id, 't-pg-mid-1'));
    expect(count).toBe(0);
  });

  it('6. Lost confirmation → replay of same result', async () => {
    const key = `test-pg-lost-ack-${Date.now()}`;

    // Client sends request; server commits business effect + idempotency record
    await db1.transaction(async (tx: any) => {
      const claimRes = await claimTx(tx, key);
      if (claimRes.type !== 'claimed') return;
      const storage = new DbStorage(tx);
      const t = await storage.createTask({
        id: 't-pg-lost-1',
        title: 'Confirmacion perdida',
        scopeType: 'block',
        scopeId: 'b-1',
        dueDate: '2026-07-24',
        priority: 'high',
        status: 'pending',
      });
      await completeTx(tx, key, claimRes.token, 201, { id: t.id, title: t.title });
    });

    // Client timed out waiting for ACK and retries
    const replay = await db2.transaction(async (tx: any) => claimTx(tx, key));
    expect(replay).toEqual({
      type: 'completed',
      status: 201,
      body: { id: 't-pg-lost-1', title: 'Confirmacion perdida' },
    });
  });

  it('7. Two distinct keys → both execute without global blocking', async () => {
    const keyA = `test-pg-indep-a-${Date.now()}`;
    const keyB = `test-pg-indep-b-${Date.now()}`;

    const [rA, rB] = await Promise.all([
      db1.transaction(async (tx: any) => {
        const c = await claimTx(tx, keyA);
        if (c.type !== 'claimed') return c;
        const s = new DbStorage(tx);
        const t = await s.createTask({
          id: 't-pg-indep-a',
          title: 'Indep A',
          scopeType: 'block',
          scopeId: 'b-1',
          dueDate: '2026-07-24',
          priority: 'low',
          status: 'pending',
        });
        await completeTx(tx, keyA, c.token, 201, { id: t.id });
        return { type: 'executed', id: t.id };
      }),
      db2.transaction(async (tx: any) => {
        const c = await claimTx(tx, keyB);
        if (c.type !== 'claimed') return c;
        const s = new DbStorage(tx);
        const t = await s.createTask({
          id: 't-pg-indep-b',
          title: 'Indep B',
          scopeType: 'block',
          scopeId: 'b-1',
          dueDate: '2026-07-24',
          priority: 'low',
          status: 'pending',
        });
        await completeTx(tx, keyB, c.token, 201, { id: t.id });
        return { type: 'executed', id: t.id };
      }),
    ]);

    expect(rA.type).toBe('executed');
    expect(rB.type).toBe('executed');

    const [{ count }] = await db1
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.tasks)
      .where(sql`${schema.tasks.id} IN ('t-pg-indep-a', 't-pg-indep-b')`);
    expect(count).toBe(2);
  });

  it('8. Incorrect token cannot complete claim', async () => {
    const key = `test-pg-wrong-token-${Date.now()}`;

    await expect(
      db1.transaction(async (tx: any) => {
        const claimRes = await claimTx(tx, key);
        expect(claimRes.type).toBe('claimed');
        // Try completing with invalid token
        await completeTx(tx, key, 'bogus-token-12345', 200, { ok: true });
      }),
    ).rejects.toThrow(/claim lost/);
  });

  it('9. Active processing cannot be stolen', async () => {
    const key = `test-pg-active-proc-${Date.now()}`;

    // Claim key on db1 connection
    const claimRes1 = await db1.transaction(async (tx: any) => claimTx(tx, key));
    expect(claimRes1.type).toBe('claimed');

    // Concurrent claim on active processing key from db2 returns 'processing'
    const claimRes2 = await db2.transaction(async (tx: any) => claimTx(tx, key));
    expect(claimRes2.type).toBe('processing');
  });

  it('10. Stale processing follows documented policy (reclaim after cutoff)', async () => {
    const key = `test-pg-stale-${Date.now()}`;

    // Manually insert a stale processing row (>10 minutes old)
    const staleTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    await db1.insert(schema.idempotencyKeys).values({
      key,
      state: 'processing',
      attemptId: 'old-dead-lambda-token',
      status: null,
      body: null,
      createdAt: staleTime,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    // New attempt reclaims the stale row atomically
    const reclaimRes = await db2.transaction(async (tx: any) => claimTx(tx, key));
    expect(reclaimRes.type).toBe('claimed');
    if (reclaimRes.type === 'claimed') {
      expect(reclaimRes.token).not.toBe('old-dead-lambda-token');
    }
  });

  it('11. Mandatory End-to-End HTTP Concurrent Idempotency Test via Express app.ts', async () => {
    const { app } = await import('../../app.js');
    const { createServer } = await import('node:http');

    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    const idemHeader = `http-idem-key-${Date.now()}`;
    const testTitle = `Tarea HTTP Concurrente Real ${Date.now()}`;
    const payload = {
      title: testTitle,
      scopeType: 'block',
      scopeId: 'b-1',
      dueDate: new Date().toISOString().slice(0, 10),
      priority: 'high',
      status: 'pending',
    };

    try {
      const sendHttp = async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Connection: 'close',
            'X-Idempotency-Key': idemHeader,
          },
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
        return { status: res.status, headers: res.headers, json };
      };

      const results = await Promise.all(Array.from({ length: 10 }, () => sendHttp()));

      // Retry any 409 in-progress responses until all 10 return completed 201 response
      const replayResults = await Promise.all(
        results.map(async (r) => {
          if (r.status === 201) return r;
          let retries = 0;
          let latest = r;
          while (latest.status === 409 && retries < 10) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            latest = await sendHttp();
            retries++;
          }
          return latest;
        }),
      );

      // Verify all 10 responses converged to HTTP 201
      for (const res of replayResults) {
        expect(res.status).toBe(201);
      }

      const returnedIds = new Set(
        replayResults.filter((r) => r.status === 201 && r.json?.id).map((r) => r.json?.id),
      );

      // Confirm all replays converged to the SAME single task ID
      expect(returnedIds.size).toBe(1);

      // Confirm exactly 1 row in tasks table
      const [{ taskCount }] = await db1
        .select({ taskCount: sql<number>`count(*)::int` })
        .from(schema.tasks)
        .where(eq(schema.tasks.title, testTitle));
      expect(taskCount).toBe(1);

      // Confirm exactly 1 canonical row in idempotency_keys table
      const allKeys = await db1.select().from(schema.idempotencyKeys);
      const matchingKeys = allKeys.filter((k: { key: string; state: string }) =>
        k.key.includes(idemHeader),
      );
      expect(matchingKeys.length).toBe(1);
      expect(matchingKeys[0].state).toBe('completed');
    } finally {
      if ('closeAllConnections' in server && typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      server.close();
    }
  });
});
