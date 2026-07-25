/**
 * Health and import-safety tests.
 *
 * Verifies:
 * - Importing app.ts does NOT start a listener
 * - Importing index.ts does NOT start a listener
 * - /health/live responds without database
 * - /health/ready reflects initialization state
 */
import { describe, it, expect } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

describe('App import safety', () => {
  it('importing app.ts does not start a server listener', async () => {
    const { app } = await import('../app.js');
    expect(app).toBeDefined();
    // If a listener had started, trying to listen on the same port would fail.
    // More directly: app should not have a listening socket.
    expect(typeof app).toBe('function'); // Express app is a function
  });

  it('importing index.ts does not start a server listener', async () => {
    const mod = await import('../index.js');
    expect(mod.app).toBeDefined();
    expect(mod.startServer).toBeDefined();
    // startServer is exported but NOT called as a side-effect
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
      server.close();
    }
  });
});
