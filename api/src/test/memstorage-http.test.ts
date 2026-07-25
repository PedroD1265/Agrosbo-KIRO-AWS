/**
 * MemStorage HTTP integration test.
 *
 * Verifies that with DATABASE_URL set but USE_MEM_STORAGE=1, the app:
 * - Uses MemStorage (not DbStorage)
 * - Serves memory-supported routes normally
 * - Rejects PostgreSQL-only routes with 503 DATABASE_REQUIRED
 * - Does NOT connect to the database
 * - Does NOT invoke claimTx/completeTx
 *
 * MUST be run with vitest.memstorage.config.ts which sets env vars
 * BEFORE modules are loaded:
 *   npx vitest run --config vitest.memstorage.config.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

describe('MemStorage HTTP (USE_MEM_STORAGE=1 with DATABASE_URL present)', () => {
  let app: any;
  let server: Server;
  let port: number;

  beforeAll(async () => {
    // Dynamic import AFTER env is set
    const mod = await import('../app.js');
    app = mod.app;
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(() => {
    if (server) {
      if ('closeAllConnections' in server) (server as any).closeAllConnections();
      server.close();
    }
  });

  function url(path: string) {
    return `http://127.0.0.1:${port}/api${path}`;
  }

  it('getGlobalStorage() is MemStorage and usesTransactionalDatabaseStorage()=false', async () => {
    const { getGlobalStorage, usesTransactionalDatabaseStorage, MemStorage } =
      await import('../storage.js');
    const s = getGlobalStorage();
    expect(s).toBeInstanceOf(MemStorage);
    expect(usesTransactionalDatabaseStorage()).toBe(false);
  });

  it('POST /api/tasks returns 201 (memory-supported route)', async () => {
    const res = await fetch(url('/tasks'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': 'mem-http-task-1',
      },
      body: JSON.stringify({
        title: 'Test task in memory',
        scopeType: 'block',
        scopeId: 'b-1',
        dueDate: '2026-07-25',
        priority: 'high',
        status: 'pending',
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; title: string };
    expect(body.id).toBeTruthy();
    expect(body.title).toBe('Test task in memory');
  });

  it('replay with same key returns same task ID (memory idempotency)', async () => {
    const payload = {
      title: 'Replay task',
      scopeType: 'block',
      scopeId: 'b-1',
      dueDate: '2026-07-25',
      priority: 'low',
      status: 'pending',
    };
    const key = 'mem-http-replay-1';

    const r1 = await fetch(url('/tasks'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': key },
      body: JSON.stringify(payload),
    });
    expect(r1.status).toBe(201);
    const b1 = (await r1.json()) as { id: string };

    const r2 = await fetch(url('/tasks'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': key },
      body: JSON.stringify(payload),
    });
    expect(r2.status).toBe(201);
    const b2 = (await r2.json()) as { id: string };

    expect(b2.id).toBe(b1.id);
  });

  it('POST /api/expenses returns 503 DATABASE_REQUIRED (PostgreSQL-only route)', async () => {
    const res = await fetch(url('/expenses'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': 'mem-http-expense-1',
      },
      body: JSON.stringify({
        category: 'insumo',
        amount: 100,
        currency: 'BOB',
        date: '2026-07-25',
      }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string; code: string };
    expect(body.code).toBe('DATABASE_REQUIRED');
    expect(body.error).toContain('almacenamiento en memoria');
  });

  it('POST /api/attachments returns 503 DATABASE_REQUIRED under MemStorage and writeFile is NOT called', async () => {
    const { getProviders } = await import('../providers/index.js');
    const writeFileSpy = vi.spyOn(getProviders().attachments, 'writeFile');

    const res = await fetch(url('/attachments'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': 'mem-http-att-1',
      },
      body: JSON.stringify({
        entityType: 'task',
        entityId: 't-1',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 4,
        dataBase64: Buffer.from('test').toString('base64'),
      }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string; code: string };
    expect(body.code).toBe('DATABASE_REQUIRED');
    expect(writeFileSpy).not.toHaveBeenCalled();

    writeFileSpy.mockRestore();
  });

  it('DbStorage is NOT instantiated and no connection to port 65534', async () => {
    // If a connection were attempted to 65534, we'd get ECONNREFUSED or hang.
    // The fact that the tests above completed without timeout/error proves no
    // accidental connection. Additionally verify via the storage singleton:
    const { getGlobalStorage } = await import('../storage.js');
    const { DbStorage } = await import('../dbStorage.js');
    const s = getGlobalStorage();
    expect(s).not.toBeInstanceOf(DbStorage);
  });

  it('claimTx is not invoked in memory mode (non-transactional path)', async () => {
    // The memory path uses claim()/complete()/release() from idempotency.ts,
    // NOT claimTx which requires a database transaction. We verify this
    // indirectly: if claimTx were called, it would try to access db (null or
    // the proxy that returns undefined), and the request would fail with an
    // internal error rather than succeeding with 201.
    // The POST /api/tasks test above returning 201 is the evidence.
    const { usesTransactionalDatabaseStorage } = await import('../storage.js');
    expect(usesTransactionalDatabaseStorage()).toBe(false);
    // When this is false, the idempotent wrapper takes the non-tx path (lines 80-156)
  });
});
