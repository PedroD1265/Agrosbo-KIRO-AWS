import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration for AGROSBO.
 * Schema source: shared/schema.ts (the canonical Drizzle + Zod definitions).
 * Migrations output: api/migrations/ (SQL files, versioned).
 *
 * Usage:
 *   npx drizzle-kit generate   → create a new migration from schema changes
 *   npx drizzle-kit migrate    → apply pending migrations to DATABASE_URL
 *   npx drizzle-kit check      → verify schema ↔ migrations consistency
 *
 * Requires DATABASE_URL to point at a PostgreSQL instance for migrate/push.
 */
export default defineConfig({
  schema: '../shared/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://agrosbo:agrosbo@localhost:5432/agrosbo',
  },
});
