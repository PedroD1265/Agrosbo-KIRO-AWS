import { describe, it, expect } from 'vitest';
import express from 'express';
import { createServer } from 'node:http';
import { registerHealthRoutes, markReady } from '../health.js';

describe('Health Checks Endpoint Suite', () => {
  it('GET /health/live returns 200 without DB dependency', async () => {
    const app = express();
    const router = express.Router();
    registerHealthRoutes(router);
    app.use(router);

    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/health/live`);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { ok: boolean; uptime: number };
      expect(json.ok).toBe(true);
      expect(typeof json.uptime).toBe('number');
    } finally {
      server.close();
    }
  });

  it('GET /health/ready returns 200 when ready', async () => {
    markReady();
    const app = express();
    const router = express.Router();
    registerHealthRoutes(router);
    app.use(router);

    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/health/ready`);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { ok: boolean; checks: Record<string, boolean> };
      expect(json.ok).toBe(true);
      expect(json.checks).toBeDefined();
      expect((json as any).sessionSecret).toBeUndefined();
      expect((json as any).databaseUrl).toBeUndefined();
    } finally {
      server.close();
    }
  });
});
