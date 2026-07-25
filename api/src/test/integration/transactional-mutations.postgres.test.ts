/**
 * Transactional mutations PostgreSQL integration tests.
 *
 * Validates the full unit-of-work guarantee for complex mutations:
 * claimTx + business effect + completeTx in the same PostgreSQL transaction.
 *
 * Requires DATABASE_URL pointing to a PostgreSQL instance with migrations applied.
 */
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for transactional mutation integration tests');
}

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql, eq } from 'drizzle-orm';
import * as schema from '@agrosbo/shared/schema';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const TEST_DB_URL = process.env.DATABASE_URL;

describe('Transactional HTTP Mutations (PostgreSQL)', () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle>;
  let appModule: { app: any };
  let server: any;
  let port: number;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: TEST_DB_URL, max: 15 });

    // Apply migration if needed
    try {
      const migPath = path.resolve(process.cwd(), 'api/migrations/0000_light_skullbuster.sql');
      const migSql = await fs.readFile(migPath, 'utf8');
      await pool.query(migSql);
    } catch {
      /* already applied */
    }

    db = drizzle(pool, { schema });

    // Seed prerequisite data
    await db
      .insert(schema.organizations)
      .values({
        id: 'org-default',
        name: 'Test Org',
        location: 'Test',
        timezone: 'UTC',
        preferOffline: true,
        confirmBeforeSync: false,
        criticalAlertsBanner: true,
      })
      .onConflictDoNothing();

    await db
      .insert(schema.blocks)
      .values({
        id: 'b-test-1',
        name: 'Bloque Test',
        farm: 'Finca Test',
        areaHa: 2.0,
        crop: 'cafe',
        stage: 'harvest',
        lastIrrigation: new Date().toISOString(),
        status: 'ok',
        alerts: 0,
      })
      .onConflictDoNothing();

    await db
      .insert(schema.inventoryItems)
      .values({
        id: 'iv-test-1',
        name: 'Fertilizante Test',
        category: 'insumo',
        unit: 'kg',
        stock: 100,
        min: 10,
        lastMovement: new Date().toISOString().slice(0, 10),
      })
      .onConflictDoNothing();

    await db
      .insert(schema.apiaries)
      .values({
        id: 'ap-test-1',
        name: 'Apiario Test',
        location: 'Campo',
        status: 'ok',
        createdAt: new Date().toISOString(),
      })
      .onConflictDoNothing();

    await db
      .insert(schema.hives)
      .values({
        id: 'hv-test-1',
        apiaryId: 'ap-test-1',
        code: 'H-001',
        status: 'ok',
        queenStatus: 'seen',
        colonyStrength: 'strong',
        broodLevel: 'high',
        honeyStores: 'high',
        createdAt: new Date().toISOString(),
      })
      .onConflictDoNothing();

    // Start Express server
    appModule = await import('../../index.js');
    const { createServer } = await import('node:http');
    server = createServer(appModule.app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as { port: number }).port;
  });

  afterAll(async () => {
    if (server) {
      if ('closeAllConnections' in server) (server as any).closeAllConnections();
      server.close();
    }
    await pool.end();
  });

  // --- Helper ---
  function post(path: string, body: object, idemKey: string) {
    return fetch(`http://127.0.0.1:${port}/api${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Connection: 'close',
        'X-Idempotency-Key': idemKey,
      },
      body: JSON.stringify(body),
    });
  }

  async function retryUntilSettled(fn: () => Promise<Response>, maxRetries = 15) {
    let res = await fn();
    let retries = 0;
    while (res.status === 409 && retries < maxRetries) {
      await new Promise((r) => setTimeout(r, 50));
      res = await fn();
      retries++;
    }
    return res;
  }

  // ====================================================================
  // 1. POST /api/applications — 10 concurrent, 1 app + 1 movement + stock
  // ====================================================================
  it('10 concurrent POST /api/applications → 1 application, 1 movement, stock -5', async () => {
    const key = `app-concurrent-${Date.now()}`;
    const payload = {
      scopeType: 'block',
      scopeId: 'b-test-1',
      applicationType: 'fertilizer',
      productName: 'Fertilizante Test',
      inventoryItemId: 'iv-test-1',
      quantityUsed: 5,
      appliedAt: new Date().toISOString().slice(0, 10),
      responsible: 'Técnico Test',
    };

    // Record stock before
    const [before] = await db
      .select({ stock: schema.inventoryItems.stock })
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.id, 'iv-test-1'));
    const stockBefore = before.stock;

    const results = await Promise.all(
      Array.from({ length: 10 }, () => post('/applications', payload, key)),
    );
    const settled = await Promise.all(
      results.map((r) =>
        r.status === 201 ? r : retryUntilSettled(() => post('/applications', payload, key)),
      ),
    );

    // All converge to 201
    for (const r of settled) expect(r.status).toBe(201);

    // All return same application ID
    const ids = new Set(
      await Promise.all(settled.map(async (r) => ((await r.json()) as { id: string }).id)),
    );
    expect(ids.size).toBe(1);

    // Exactly 1 field_application row
    const appId = [...ids][0]!;
    const [{ realCount }] = await db
      .select({ realCount: sql<number>`count(*)::int` })
      .from(schema.fieldApplications)
      .where(eq(schema.fieldApplications.id, appId));
    expect(realCount).toBe(1);

    // Stock decreased exactly once
    const [after] = await db
      .select({ stock: schema.inventoryItems.stock })
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.id, 'iv-test-1'));
    expect(after.stock).toBe(stockBefore - 5);

    // 1 completed idempotency key
    const keys = await db
      .select()
      .from(schema.idempotencyKeys)
      .where(sql`${schema.idempotencyKeys.key} LIKE ${'%' + key}`);
    expect(keys.length).toBe(1);
    expect(keys[0].state).toBe('completed');
  });

  // ====================================================================
  // 2. POST /api/hive-inspections — 10 concurrent
  // ====================================================================
  it('10 concurrent POST /api/hive-inspections → 1 inspection, 1 movement, hive updated', async () => {
    const key = `insp-concurrent-${Date.now()}`;
    const payload = {
      hiveId: 'hv-test-1',
      inspectedAt: new Date().toISOString(),
      inspector: 'Inspector Test',
      queenSeen: true,
      queenStatus: 'seen',
      colonyStrength: 'strong',
      broodLevel: 'high',
      honeyStores: 'medium',
      inventoryItemId: 'iv-test-1',
      quantityUsed: 2,
    };

    const [before] = await db
      .select({ stock: schema.inventoryItems.stock })
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.id, 'iv-test-1'));
    const stockBefore = before.stock;

    const results = await Promise.all(
      Array.from({ length: 10 }, () => post('/hive-inspections', payload, key)),
    );
    const settled = await Promise.all(
      results.map((r) =>
        r.status === 201 ? r : retryUntilSettled(() => post('/hive-inspections', payload, key)),
      ),
    );

    for (const r of settled) expect(r.status).toBe(201);

    const ids = new Set(
      await Promise.all(settled.map(async (r) => ((await r.json()) as { id: string }).id)),
    );
    expect(ids.size).toBe(1);

    // 1 inspection row
    const inspId = [...ids][0]!;
    const [{ inspCount }] = await db
      .select({ inspCount: sql<number>`count(*)::int` })
      .from(schema.hiveInspections)
      .where(eq(schema.hiveInspections.id, inspId));
    expect(inspCount).toBe(1);

    // Stock decreased exactly once
    const [after] = await db
      .select({ stock: schema.inventoryItems.stock })
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.id, 'iv-test-1'));
    expect(after.stock).toBe(stockBefore - 2);

    // Hive updated
    const [hive] = await db.select().from(schema.hives).where(eq(schema.hives.id, 'hv-test-1'));
    expect(hive.honeyStores).toBe('medium');
  });

  // ====================================================================
  // 3. POST /api/labor-costs — 1 labor + 1 expense, same relation
  // ====================================================================
  it('POST /api/labor-costs → 1 labor_cost + 1 expense linked', async () => {
    const key = `labor-uow-${Date.now()}`;
    const payload = {
      workerName: 'Juan Test',
      date: new Date().toISOString().slice(0, 10),
      amount: 150,
      currency: 'BOB',
    };

    const res = await post('/labor-costs', payload, key);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; expenseId?: string };

    // Labor cost exists
    const [lc] = await db.select().from(schema.laborCosts).where(eq(schema.laborCosts.id, body.id));
    expect(lc).toBeDefined();
    expect(lc.expenseId).toBeTruthy();

    // Related expense exists
    const [exp] = await db
      .select()
      .from(schema.expenses)
      .where(eq(schema.expenses.relatedEntityId, body.id));
    expect(exp).toBeDefined();
    expect(exp.relatedEntityType).toBe('labor');
    expect(exp.amount).toBe(150);

    // Replay returns same result
    const replay = await post('/labor-costs', payload, key);
    expect(replay.status).toBe(201);
    const replayBody = (await replay.json()) as { id: string };
    expect(replayBody.id).toBe(body.id);
  });

  // ====================================================================
  // 4. POST /api/users — 2 concurrent, 1 user, no passwordHash exposed
  // ====================================================================
  it('2 concurrent POST /api/users → 1 user, same ID, no passwordHash', async () => {
    const key = `user-concurrent-${Date.now()}`;
    const payload = {
      name: 'User Test',
      email: `test-${Date.now()}@agrosbo.test`,
      role: 'operario',
      password: 'securepass123',
    };

    const [r1, r2] = await Promise.all([
      post('/users', payload, key),
      post('/users', payload, key),
    ]);
    const settled = await Promise.all(
      [r1, r2].map((r) =>
        r.status === 201 ? r : retryUntilSettled(() => post('/users', payload, key)),
      ),
    );

    for (const r of settled) expect(r.status).toBe(201);

    const bodies = await Promise.all(
      settled.map(async (r) => (await r.json()) as Record<string, any>),
    );
    expect(bodies[0].id).toBe(bodies[1].id);

    // No passwordHash exposed
    for (const b of bodies) {
      expect(b.passwordHash).toBeUndefined();
    }

    // 1 user row
    const [{ uCount }] = await db
      .select({ uCount: sql<number>`count(*)::int` })
      .from(schema.users)
      .where(eq(schema.users.id, bodies[0].id));
    expect(uCount).toBe(1);
  });

  // ====================================================================
  // 5. DELETE /api/expenses/:id — 204 first, 204 replay, 1 deletion
  // ====================================================================
  it('DELETE /api/expenses → 204 first call, 204 replay, single deletion', async () => {
    // Create an expense to delete
    const createRes = await fetch(`http://127.0.0.1:${port}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Connection: 'close' },
      body: JSON.stringify({ category: 'otro', amount: 5, currency: 'BOB', date: '2026-01-01' }),
    });
    expect(createRes.status).toBe(201);
    const { id } = (await createRes.json()) as { id: string };

    const key = `del-expense-${Date.now()}`;
    const doDelete = () =>
      fetch(`http://127.0.0.1:${port}/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { Connection: 'close', 'X-Idempotency-Key': key },
      });

    const del1 = await doDelete();
    expect(del1.status).toBe(204);

    const del2 = await doDelete();
    expect(del2.status).toBe(204);

    // Verify deleted
    const [{ remaining }] = await db
      .select({ remaining: sql<number>`count(*)::int` })
      .from(schema.expenses)
      .where(eq(schema.expenses.id, id));
    expect(remaining).toBe(0);
  });

  // ====================================================================
  // 6. POST /api/apiaries — 2 concurrent + 3rd replay
  // ====================================================================
  it('2 concurrent POST /api/apiaries + 3rd replay → exactly 1 apiary, 1 idempotency key', async () => {
    const key = `apiary-concurrent-${Date.now()}`;
    const payload = {
      name: `Apiario Concurrente ${Date.now()}`,
      location: 'Valle Central',
      status: 'ok',
    };

    const [r1, r2] = await Promise.all([
      post('/apiaries', payload, key),
      post('/apiaries', payload, key),
    ]);

    const settled = await Promise.all(
      [r1, r2].map((r) =>
        r.status === 201 ? r : retryUntilSettled(() => post('/apiaries', payload, key)),
      ),
    );

    for (const r of settled) expect(r.status).toBe(201);

    const ids = new Set(
      await Promise.all(settled.map(async (r) => ((await r.json()) as { id: string }).id)),
    );
    expect(ids.size).toBe(1);
    const apiaryId = [...ids][0]!;

    // 3rd request: replay call
    const replayRes = await post('/apiaries', payload, key);
    expect(replayRes.status).toBe(201);
    expect(replayRes.headers.get('X-Idempotent-Replay')).toBe('1');
    const replayBody = (await replayRes.json()) as { id: string };
    expect(replayBody.id).toBe(apiaryId);

    // Verify DB
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.apiaries)
      .where(eq(schema.apiaries.id, apiaryId));
    expect(count).toBe(1);

    const keys = await db
      .select()
      .from(schema.idempotencyKeys)
      .where(sql`${schema.idempotencyKeys.key} LIKE ${'%' + key}`);
    expect(keys.length).toBe(1);
    expect(keys[0].state).toBe('completed');
  });

  // ====================================================================
  // 7. POST /api/hives — 2 concurrent + 3rd replay
  // ====================================================================
  it('2 concurrent POST /api/hives + 3rd replay → exactly 1 hive, 1 idempotency key', async () => {
    const key = `hive-concurrent-${Date.now()}`;
    const payload = {
      apiaryId: 'ap-test-1',
      code: `H-${Date.now().toString().slice(-4)}`,
      status: 'ok',
      queenStatus: 'seen',
      colonyStrength: 'strong',
      broodLevel: 'high',
      honeyStores: 'high',
    };

    const [r1, r2] = await Promise.all([
      post('/hives', payload, key),
      post('/hives', payload, key),
    ]);

    const settled = await Promise.all(
      [r1, r2].map((r) =>
        r.status === 201 ? r : retryUntilSettled(() => post('/hives', payload, key)),
      ),
    );

    for (const r of settled) expect(r.status).toBe(201);

    const ids = new Set(
      await Promise.all(settled.map(async (r) => ((await r.json()) as { id: string }).id)),
    );
    expect(ids.size).toBe(1);
    const hiveId = [...ids][0]!;

    const replayRes = await post('/hives', payload, key);
    expect(replayRes.status).toBe(201);
    expect(replayRes.headers.get('X-Idempotent-Replay')).toBe('1');
    const replayBody = (await replayRes.json()) as { id: string };
    expect(replayBody.id).toBe(hiveId);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.hives)
      .where(eq(schema.hives.id, hiveId));
    expect(count).toBe(1);

    const keys = await db
      .select()
      .from(schema.idempotencyKeys)
      .where(sql`${schema.idempotencyKeys.key} LIKE ${'%' + key}`);
    expect(keys.length).toBe(1);
    expect(keys[0].state).toBe('completed');
  });

  // ====================================================================
  // 8. POST /api/honey-harvests — 2 concurrent + 3rd replay
  // ====================================================================
  it('2 concurrent POST /api/honey-harvests + 3rd replay → exactly 1 harvest, 1 idempotency key', async () => {
    const key = `harvest-concurrent-${Date.now()}`;
    const payload = {
      apiaryId: 'ap-test-1',
      date: new Date().toISOString().slice(0, 10),
      quantity: 50,
      unit: 'kg',
    };

    const [r1, r2] = await Promise.all([
      post('/honey-harvests', payload, key),
      post('/honey-harvests', payload, key),
    ]);

    const settled = await Promise.all(
      [r1, r2].map((r) =>
        r.status === 201 ? r : retryUntilSettled(() => post('/honey-harvests', payload, key)),
      ),
    );

    for (const r of settled) expect(r.status).toBe(201);

    const ids = new Set(
      await Promise.all(settled.map(async (r) => ((await r.json()) as { id: string }).id)),
    );
    expect(ids.size).toBe(1);
    const harvestId = [...ids][0]!;

    const replayRes = await post('/honey-harvests', payload, key);
    expect(replayRes.status).toBe(201);
    expect(replayRes.headers.get('X-Idempotent-Replay')).toBe('1');
    const replayBody = (await replayRes.json()) as { id: string };
    expect(replayBody.id).toBe(harvestId);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.honeyHarvests)
      .where(eq(schema.honeyHarvests.id, harvestId));
    expect(count).toBe(1);

    const keys = await db
      .select()
      .from(schema.idempotencyKeys)
      .where(sql`${schema.idempotencyKeys.key} LIKE ${'%' + key}`);
    expect(keys.length).toBe(1);
    expect(keys[0].state).toBe('completed');
  });

  // ====================================================================
  // 9. Composite Hive Inspection Rollback on FK Failure
  // ====================================================================
  it('Composite Inspection Rollback: FK failure on non-existent hiveId → 0 inspection, 0 movement, stock unchanged, key not completed', async () => {
    const key = `insp-rollback-${Date.now()}`;
    const nonExistentHiveId = 'hv-does-not-exist-999';

    const [beforeItem] = await db
      .select()
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.id, 'iv-test-1'));
    const stockBefore = beforeItem.stock;

    const [beforeMovCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.inventoryMovements)
      .where(eq(schema.inventoryMovements.itemId, 'iv-test-1'));

    const payload = {
      hiveId: nonExistentHiveId,
      inspectedAt: new Date().toISOString(),
      inspector: 'Inspector Test',
      queenSeen: true,
      queenStatus: 'seen',
      colonyStrength: 'strong',
      broodLevel: 'high',
      honeyStores: 'medium',
      inventoryItemId: 'iv-test-1',
      quantityUsed: 3,
    };

    const res = await post('/hive-inspections', payload, key);
    expect(res.status).toBeGreaterThanOrEqual(500);

    // Verify DB post-failure state
    const [{ inspCount }] = await db
      .select({ inspCount: sql<number>`count(*)::int` })
      .from(schema.hiveInspections)
      .where(eq(schema.hiveInspections.hiveId, nonExistentHiveId));
    expect(inspCount).toBe(0);

    const [afterMovCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.inventoryMovements)
      .where(eq(schema.inventoryMovements.itemId, 'iv-test-1'));
    expect(afterMovCount.count).toBe(beforeMovCount.count);

    const [afterItem] = await db
      .select()
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.id, 'iv-test-1'));
    expect(afterItem.stock).toBe(stockBefore);

    const keys = await db
      .select()
      .from(schema.idempotencyKeys)
      .where(sql`${schema.idempotencyKeys.key} LIKE ${'%' + key}`);
    const completedKey = keys.find((k: { state: string }) => k.state === 'completed');
    expect(completedKey).toBeUndefined();
  });
});
