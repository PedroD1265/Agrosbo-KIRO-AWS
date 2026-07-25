/**
 * Health, import-safety, and explicit startup tests.
 *
 * Verifies:
 * - Importing app.ts does NOT start a listener (spyOn Server.prototype.listen)
 * - Importing index.ts does NOT start a listener (spyOn Server.prototype.listen)
 * - Importing server.ts does NOT start a listener (spyOn Server.prototype.listen)
 * - Explicit startServer() opens ephemeral port, responds to /health/live, and closes cleanly
 * - /health/live responds without database
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

describe('App import safety and explicit startup', () => {
  const originalLambdaEnv = process.env.LAMBDA_TASK_ROOT;

  beforeEach(() => {
    delete process.env.LAMBDA_TASK_ROOT;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalLambdaEnv !== undefined) {
      process.env.LAMBDA_TASK_ROOT = originalLambdaEnv;
    } else {
      delete process.env.LAMBDA_TASK_ROOT;
    }
    vi.restoreAllMocks();
  });

  it('importing app.ts does not start a server listener', async () => {
    const listenSpy = vi.spyOn(Server.prototype, 'listen');
    const { app } = await import('../app.js');
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
    expect(listenSpy).not.toHaveBeenCalled();
  });

  it('importing index.ts does not start a server listener', async () => {
    const listenSpy = vi.spyOn(Server.prototype, 'listen');
    const mod = await import('../index.js');
    expect(mod.app).toBeDefined();
    expect(mod.startServer).toBeDefined();
    expect(listenSpy).not.toHaveBeenCalled();
  });

  it('importing server.ts does not start a server listener', async () => {
    const listenSpy = vi.spyOn(Server.prototype, 'listen');
    const mod = await import('../server.js');
    expect(mod.startServer).toBeDefined();
    expect(listenSpy).not.toHaveBeenCalled();
  });

  it('explicit startServer() opens ephemeral port, serves health check, and closes cleanly', async () => {
    const { startServer } = await import('../server.js');

    const server = await startServer({
      port: 0,
      host: '127.0.0.1',
      initializeServices: false,
      setupFrontend: false,
    });

    try {
      expect(server).toBeInstanceOf(Server);
      expect(server.listening).toBe(true);

      const addr = server.address() as AddressInfo;
      expect(addr).toBeDefined();
      expect(addr.port).toBeGreaterThan(0);

      const res = await fetch(`http://127.0.0.1:${addr.port}/api/health/live`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; uptime: number };
      expect(body.ok).toBe(true);
      expect(typeof body.uptime).toBe('number');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      expect(server.listening).toBe(false);
    }
  });

  it('GET /health/live responds 200 without database dependency', async () => {
    const { app } = await import('../app.js');
    const server: Server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health/live`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; uptime: number };
      expect(body.ok).toBe(true);
      expect(typeof body.uptime).toBe('number');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
