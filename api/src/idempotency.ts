import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db, hasDatabaseUrl } from './db.js';
import { usesTransactionalDatabaseStorage } from './storage.js';
import { idempotencyKeys } from '@agrosbo/shared/schema.js';
import { createLogger } from './logger.js';

const idemLog = createLogger('idempotency');

export type ClaimResult =
  | { type: 'completed'; status: number; body: unknown }
  | { type: 'processing' }
  | { type: 'claimed'; token: string }
  | { type: 'unavailable' };

const IDEM_TTL_MS = 24 * 60 * 60 * 1000;
const PROCESSING_STALE_MS = 10 * 60 * 1000;
const IDEM_MAX_MEM = 5000;
const CLEANUP_PROBABILITY = 0.01;

interface MemEntry {
  state: 'processing' | 'completed';
  attemptId: string;
  status?: number;
  body?: unknown;
  expires: number;
  createdAt: number;
}

const memCache = new Map<string, MemEntry>();

function pruneMem() {
  const now = Date.now();
  for (const [k, v] of memCache) {
    if (v.expires < now) memCache.delete(k);
  }
  while (memCache.size > IDEM_MAX_MEM) {
    const first = memCache.keys().next().value;
    if (!first) break;
    memCache.delete(first);
  }
}

async function cleanupExpiredDb() {
  if (!usesTransactionalDatabaseStorage()) return;
  try {
    await db.execute(
      sql`delete from idempotency_keys where expires_at < ${new Date().toISOString()}`,
    );
  } catch (err) {
    idemLog.error('cleanup failed', { err });
  }
}

async function clearOrphanProcessingDb() {
  if (!usesTransactionalDatabaseStorage()) return;
  try {
    // Only clear processing entries that are STALE (older than PROCESSING_STALE_MS).
    // Do NOT delete all processing rows — other instances may have valid in-flight claims.
    const staleCutoff = new Date(Date.now() - PROCESSING_STALE_MS).toISOString();
    const result = await db.execute(
      sql`delete from idempotency_keys where state = 'processing' and created_at < ${staleCutoff}`,
    );
    const count = (result as unknown as { rowCount?: number }).rowCount ?? 0;
    if (count > 0) {
      idemLog.info('cleared stale processing rows', { count, staleCutoff });
    }
  } catch (err) {
    idemLog.error('orphan cleanup failed', { err });
  }
}

function claimMem(key: string): ClaimResult {
  pruneMem();
  const existing = memCache.get(key);
  const now = Date.now();
  if (existing && existing.expires > now) {
    if (existing.state === 'completed') {
      return {
        type: 'completed',
        status: existing.status as number,
        body: existing.body,
      };
    }
    if (now - existing.createdAt < PROCESSING_STALE_MS) {
      return { type: 'processing' };
    }
  }
  const token = randomUUID();
  memCache.set(key, {
    state: 'processing',
    attemptId: token,
    expires: now + IDEM_TTL_MS,
    createdAt: now,
  });
  return { type: 'claimed', token };
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code === '23505' || e.cause?.code === '23505';
}

export async function claimTx(tx: any, key: string): Promise<ClaimResult> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const expiresIso = new Date(now + IDEM_TTL_MS).toISOString();
  const staleCutoffIso = new Date(now - PROCESSING_STALE_MS).toISOString();
  const token = randomUUID();

  try {
    const inserted = await tx
      .insert(idempotencyKeys)
      .values({
        key,
        state: 'processing',
        attemptId: token,
        status: null,
        body: null,
        expiresAt: expiresIso,
        createdAt: nowIso,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted.length > 0) {
      return { type: 'claimed', token };
    }

    const existing = await tx
      .select()
      .from(idempotencyKeys)
      .where(eq(idempotencyKeys.key, key))
      .limit(1);

    const row = existing[0];
    if (!row) {
      return { type: 'unavailable' };
    }

    if (Date.parse(row.expiresAt) > now) {
      if (row.state === 'completed') {
        return {
          type: 'completed',
          status: row.status as number,
          body: row.body,
        };
      }
      if (row.createdAt > staleCutoffIso) {
        return { type: 'processing' };
      }
    }

    const reclaimed = await tx
      .update(idempotencyKeys)
      .set({
        state: 'processing',
        attemptId: token,
        status: null,
        body: null,
        createdAt: nowIso,
        expiresAt: expiresIso,
      })
      .where(
        and(
          eq(idempotencyKeys.key, key),
          sql`(${idempotencyKeys.expiresAt} < ${nowIso} OR (${idempotencyKeys.state} = 'processing' AND ${idempotencyKeys.createdAt} <= ${staleCutoffIso}))`,
        ),
      )
      .returning();

    if (reclaimed.length > 0) {
      return { type: 'claimed', token };
    }

    return { type: 'processing' };
  } catch (err) {
    idemLog.error('claimTx failed', { err, key });
    return { type: 'unavailable' };
  }
}

export async function completeTx(
  tx: any,
  key: string,
  token: string,
  status: number,
  body: unknown,
): Promise<void> {
  const result = await tx
    .update(idempotencyKeys)
    .set({ state: 'completed', status, body: body as object })
    .where(
      and(
        eq(idempotencyKeys.key, key),
        eq(idempotencyKeys.attemptId, token),
        eq(idempotencyKeys.state, 'processing'),
      ),
    )
    .returning({ key: idempotencyKeys.key });

  if (result.length === 0) {
    throw new Error(`[idempotency] complete: claim lost (key stolen or expired) for ${key}`);
  }
}

export async function releaseTx(tx: any, key: string, token: string): Promise<void> {
  try {
    await tx
      .delete(idempotencyKeys)
      .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.attemptId, token)));
  } catch (err) {
    idemLog.error('releaseTx failed', { err, key });
  }
}

async function claimDb(key: string): Promise<ClaimResult> {
  return await db.transaction(async (tx: any) => {
    return await claimTx(tx, key);
  });
}

export async function claim(key: string): Promise<ClaimResult> {
  // Use DB-backed idempotency only when the active storage is actually
  // a transactional DbStorage. When USE_MEM_STORAGE=1 is set (even with
  // DATABASE_URL present), we must use memory-based idempotency to avoid
  // attempting a PostgreSQL connection that may not be intended.
  if (usesTransactionalDatabaseStorage()) {
    const result = await claimDb(key);
    if (Math.random() < CLEANUP_PROBABILITY) void cleanupExpiredDb();
    return result;
  }
  return claimMem(key);
}

export async function complete(
  key: string,
  token: string,
  status: number,
  body: unknown,
): Promise<void> {
  if (usesTransactionalDatabaseStorage()) {
    const result = await db
      .update(idempotencyKeys)
      .set({ state: 'completed', status, body: body as object })
      .where(
        and(
          eq(idempotencyKeys.key, key),
          eq(idempotencyKeys.attemptId, token),
          eq(idempotencyKeys.state, 'processing'),
        ),
      )
      .returning({ key: idempotencyKeys.key });
    if (result.length === 0) {
      throw new Error(`[idempotency] complete: claim lost (key stolen or expired) for ${key}`);
    }
    return;
  }
  const existing = memCache.get(key);
  if (!existing || existing.attemptId !== token || existing.state !== 'processing') {
    throw new Error(`[idempotency] complete: claim lost (key stolen or expired) for ${key}`);
  }
  existing.state = 'completed';
  existing.status = status;
  existing.body = body;
}

export async function release(key: string, token: string): Promise<void> {
  if (usesTransactionalDatabaseStorage()) {
    try {
      await db
        .delete(idempotencyKeys)
        .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.attemptId, token)));
      return;
    } catch (err) {
      idemLog.error('release failed', { err, key });
    }
    return;
  }
  const existing = memCache.get(key);
  if (existing && existing.attemptId === token) {
    memCache.delete(key);
  }
}

export async function verifyIdempotencyTable(): Promise<void> {
  if (!usesTransactionalDatabaseStorage()) return;
  try {
    await db.execute(
      sql`select key, state, attempt_id, status, body, expires_at, created_at from idempotency_keys limit 0`,
    );
  } catch (err) {
    throw new Error(
      `[idempotency] schema check failed for 'idempotency_keys' — run 'npm run db:migrate' to apply latest schema. Original: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function initIdempotency() {
  await verifyIdempotencyTable();
  await clearOrphanProcessingDb();
  await cleanupExpiredDb();
}
