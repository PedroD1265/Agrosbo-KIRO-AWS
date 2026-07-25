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

    // Insert legacy attachment row before 0001_object_key migration to test backfill
    await targetPool.query(`
      INSERT INTO "attachments" (
        id, entity_type, entity_id, file_name, mime_type, size_bytes, local_status, created_at
      ) VALUES (
        'att-legacy-1', 'observation', 'obs-leg-1', 'photo.jpg', 'image/jpeg', 2048, 'uploaded', '2026-07-25T00:00:00Z'
      )
    `);

    const migration1Path = path.resolve(process.cwd(), 'api/migrations/0001_object_key.sql');
    const migration1Sql = await fs.readFile(migration1Path, 'utf8');
    await targetPool.query(migration1Sql);

    // 1. Verify backfill of object_key
    const legacyRes = await targetPool.query(
      `SELECT * FROM "attachments" WHERE id = 'att-legacy-1'`,
    );
    expect(legacyRes.rows[0].object_key).toBe('observation/obs-leg-1/att-legacy-1-photo.jpg');

    // 2. Verify migration idempotency: re-execute 0001_object_key.sql a second time
    await targetPool.query(migration1Sql);

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

      // 3. PostgreSQL attachment persistence with object_key requirement
      const { createAttachment, deleteAttachment, AttachmentDeleteError } =
        await import('../../attachments.js');
      const { drizzle } = await import('drizzle-orm/node-postgres');
      const schema = await import('@agrosbo/shared/schema.js');
      const testDb = drizzle(targetPool, { schema });

      const dataBase64 = Buffer.from('PG attachment content').toString('base64');
      const mockProvider = {
        name: 'pg-test-provider',
        prepareUpload: async () => ({ key: 'k', method: 'POST' as const }),
        confirmUpload: async () => ({ exists: true }),
        getDownloadAccess: async (k: string) => ({ url: `/uploads/${k}`, expires: false }),
        deleteObject: async () => true,
        writeFile: async () => {},
        verifyObject: async () => ({ exists: true }),
      };

      const createdAtt = await createAttachment(
        {
          entityType: 'task',
          entityId: 't-pg-1',
          fileName: 'report.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 21,
          dataBase64,
        },
        { storageProvider: mockProvider, executor: testDb as any },
      );

      expect(createdAtt.objectKey).toMatch(/^task\/t-pg-1\/att-[a-f0-9-]+-report\.pdf$/);

      // Verify row in PostgreSQL table has non-null object_key
      const pgAttRow = await targetPool.query(`SELECT * FROM "attachments" WHERE id = $1`, [
        createdAtt.id,
      ]);
      expect(pgAttRow.rows[0].object_key).toBe(createdAtt.objectKey);

      // 4. Test deleteAttachment failure preserves DB metadata in PostgreSQL
      const failingProvider = {
        ...mockProvider,
        deleteObject: async () => {
          throw new Error('S3 DELETE network failure');
        },
      };

      const err = await deleteAttachment(createdAtt.id, {
        storageProvider: failingProvider,
        executor: testDb as any,
      }).catch((e) => e);

      expect(err).toBeInstanceOf(AttachmentDeleteError);
      expect(err.code).toBe('ATTACHMENT_DELETE_FAILED');

      // Metadata still exists in PostgreSQL!
      const rowStillExists = await targetPool.query(
        `SELECT count(*)::int FROM "attachments" WHERE id = $1`,
        [createdAtt.id],
      );
      expect(rowStillExists.rows[0].count).toBe(1);

      // 5. Successful delete removes DB metadata in PostgreSQL
      const deleteSuccess = await deleteAttachment(createdAtt.id, {
        storageProvider: mockProvider,
        executor: testDb as any,
      });
      expect(deleteSuccess).toBe(true);

      const rowDeleted = await targetPool.query(
        `SELECT count(*)::int FROM "attachments" WHERE id = $1`,
        [createdAtt.id],
      );
      expect(rowDeleted.rows[0].count).toBe(0);

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
