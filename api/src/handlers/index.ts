import serverlessExpress from '@vendia/serverless-express';
import { app } from '../app.js';
import { seedDatabase } from '../dbStorage.js';
import { initIdempotency } from '../idempotency.js';
import { initRevokedSessions } from '../auth.js';
import { markReady, isReady } from '../health.js';
import { env } from '../env.js';
import { createLogger } from '../logger.js';

const log = createLogger('lambda');

/**
 * Fail-closed initialization for Lambda.
 * - If init fails, `initialized` stays false and `markReady()` is never called.
 * - Every subsequent invocation retries init (not cached as success on failure).
 * - Traffic is rejected with 503 until init succeeds.
 */
let initialized = false;
let initError: Error | null = null;

async function setup() {
  if (initialized) return;
  try {
    if (env.hasDatabase) {
      await seedDatabase();
      await initIdempotency();
      await initRevokedSessions();
    }
    markReady();
    initialized = true;
    initError = null;
    log.info('Lambda initialization complete');
  } catch (err) {
    // Do NOT set initialized=true. Next invocation will retry.
    initError = err instanceof Error ? err : new Error(String(err));
    log.error('Lambda initialization FAILED — rejecting traffic', {
      err: initError.message,
    });
    throw initError; // Fail the invocation so Lambda runtime knows init failed.
  }
}

const serverlessHandler = serverlessExpress({ app });

export const handler = async (event: any, context: any, callback: any) => {
  await setup();
  // Double-check: if somehow setup returned without throwing but ready is false,
  // reject the request (should not happen, but defense in depth).
  if (!isReady()) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: 'Service not ready' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
  return serverlessHandler(event, context, callback);
};
