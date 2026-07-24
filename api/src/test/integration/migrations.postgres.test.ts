import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { seedDatabase } from '../../dbStorage.js';
import { markReady, registerHealthRoutes } from '../../health.js';
import express from 'express';
import { createServer } from 'node:http';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for PostgreSQL integration tests');
}
const BASE_DB_URL = process.env.DATABASE_URL;

const CLEAN_DB_NAME = `agrosbo_clean_test_${Date.now()}`;

function parseDbUrl(raw: string) {
  const url = new URL(raw);
  const adminUrl = new URL(raw);
  adminUrl.pathname = '/postgres';
  return {
    raw,
    adminUrl: adminUrl.toString(),
    targetUrl: `${url.protocol}//${url.username}:${url.password}@${url.host}/${CLEAN_DB_NAME}`,
  };
}

describe('PostgreSQL Clean DB Migration & Readiness Integration Suite', () => {
  const { adminUrl, targetUrl } = parseDbUrl(BASE_DB_URL);
  let adminClient: pg.Client;
  let targetPool: pg.Pool;

  beforeAll(async () => {
    adminClient = new pg.Client({ connectionString: adminUrl });
    await adminClient.connect();

    await adminClient.query(`DROP DATABASE IF EXISTS "${CLEAN_DB_NAME}"`);
    await adminClient.query(`CREATE DATABASE "${CLEAN_DB_NAME}"`);

    targetPool = new pg.Pool({ connectionString: targetUrl });
    targetPool.on('error', () => {});
  });

  afterAll(async () => {
    try {
      if (targetPool) {
        await targetPool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;').catch(() => {});
        await targetPool.end().catch(() => {});
      }
    } catch {
      /* ignore */
    }
    if (adminClient) {
      await adminClient.end().catch(() => {});
    }
  });

  it('verifies clean database migration, seed, critical tables, and health endpoints', async () => {
    const migrationSqlPath = path.resolve(
      process.cwd(),
      'api/migrations/0000_light_skullbuster.sql',
    );
    const migrationSql = await fs.readFile(migrationSqlPath, 'utf8');
    await targetPool.query(migrationSql);

    const oldDbUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = targetUrl;

    try {
      await seedDatabase();

      const criticalTables = [
        'organizations',
        'farms',
        'users',
        'blocks',
        'tasks',
        'inventory_items',
        'idempotency_keys',
        'attachments',
      ];

      for (const table of criticalTables) {
        const res = await targetPool.query(`SELECT count(*)::int FROM "${table}"`);
        expect(res.rows[0].count).toBeGreaterThanOrEqual(0);
      }

      const app = express();
      const router = express.Router();
      registerHealthRoutes(router);
      app.use(router);

      const server = createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as { port: number }).port;

      try {
        const liveRes = await fetch(`http://127.0.0.1:${port}/health/live`);
        expect(liveRes.status).toBe(200);

        const notReadyRes = await fetch(`http://127.0.0.1:${port}/health/ready`);
        expect(notReadyRes.status).toBe(503);

        markReady();
        const readyRes = await fetch(`http://127.0.0.1:${port}/health/ready`);
        expect(readyRes.status).toBe(200);
        const readyJson = (await readyRes.json()) as {
          ok: boolean;
          checks: Record<string, boolean>;
        };
        expect(readyJson.ok).toBe(true);
        expect(readyJson.checks.database).toBe(true);
      } finally {
        server.close();
      }

      // Re-verify schema consistency and table availability
      const tableCheck = await targetPool.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
      );
      expect(tableCheck.rows.length).toBeGreaterThan(10);
    } finally {
      process.env.DATABASE_URL = oldDbUrl;
    }
  });
});
