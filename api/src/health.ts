import type { Router } from 'express';
import { env } from './env.js';
import { db, hasDatabaseUrl } from './db.js';
import { sql } from 'drizzle-orm';
import { createLogger } from './logger.js';

const log = createLogger('health');

/**
 * Readiness state — tracks whether initialization completed successfully.
 * When false, /health/ready returns 503 and the Lambda handler rejects traffic.
 */
let ready = false;

export function markReady(): void {
  ready = true;
}

export function isReady(): boolean {
  return ready;
}

/**
 * Register health check routes.
 *
 * GET /health/live  — Process is active. No dependency on DB or external services.
 *                     Used by container orchestrators / load balancers for liveness.
 *
 * GET /health/ready — Full readiness: config valid, schema accessible, storage OK,
 *                     initialization complete. Returns 503 if not ready.
 */
export function registerHealthRoutes(router: Router): void {
  router.get('/health/live', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

  router.get('/health/ready', async (_req, res) => {
    if (!ready) {
      return res.status(503).json({
        ok: false,
        reason: 'initialization incomplete',
      });
    }

    const checks: Record<string, boolean> = {
      config: true,
      database: false,
    };

    // Database connectivity & schema check
    if (hasDatabaseUrl) {
      try {
        await db.execute(sql`SELECT key FROM idempotency_keys LIMIT 0`);
        checks.database = true;
      } catch (err) {
        log.warn('readiness check: database unreachable or schema missing', {
          err: (err as Error).message,
        });
      }
    } else {
      // Memory mode — always "ready" for storage
      checks.database = true;
    }

    const allOk = Object.values(checks).every(Boolean);
    res.status(allOk ? 200 : 503).json({
      ok: allOk,
      checks,
      now: new Date().toISOString(),
    });
  });
}
