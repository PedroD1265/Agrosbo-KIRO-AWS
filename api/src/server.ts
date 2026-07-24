import { createServer } from 'node:http';
import { app } from './app.js';
import { env, parsePort } from './env.js';
import { log } from './logger.js';
import { seedDatabase } from './dbStorage.js';
import { initIdempotency } from './idempotency.js';
import { initRevokedSessions } from './auth.js';
import { markReady } from './health.js';

const httpServer = createServer(app);

function resolvePort(): number {
  const argv = process.argv;
  const flagIdx = argv.findIndex((a) => a === '--port' || a === '-p');
  if (flagIdx !== -1 && argv[flagIdx + 1]) {
    return parsePort(argv[flagIdx + 1], env.port);
  }
  for (const a of argv) {
    if (a.startsWith('--port=')) {
      return parsePort(a.slice('--port='.length), env.port);
    }
  }
  return env.port;
}

const PORT = resolvePort();

export async function startServer() {
  if (env.hasDatabase) {
    try {
      await seedDatabase();
      log.info('database seed verified');
    } catch (err) {
      log.error('seed failed', { err });
    }
    try {
      await initIdempotency();
      log.info('idempotency cache initialized');
    } catch (err) {
      log.error('FATAL: idempotency init failed', { err });
      log.error('refusing to start — protected writes would all fail with 503');
      process.exit(1);
    }
    try {
      await initRevokedSessions();
    } catch (err) {
      log.warn('revoked sessions init failed — blocklist empty after restart', { err });
    }
  } else {
    log.info('skipping DB seed (in-memory mode)');
  }

  if (env.isProd) {
    const { setupStatic } = await import('./vite.js');
    setupStatic(app);
  } else {
    const { setupViteDev } = await import('./vite.js');
    await setupViteDev(app, httpServer);
  }

  if (env.authEnforcement === 'off') {
    log.warn("AUTH_ENFORCEMENT=off — API is open access (set to 'on' in production)");
  }

  markReady();

  if (!process.env.LAMBDA_TASK_ROOT) {
    httpServer.listen(PORT, '0.0.0.0', () => {
      log.info(`listening on http://0.0.0.0:${PORT}`, {
        port: PORT,
        env: env.nodeEnv,
        storage: env.hasDatabase ? 'postgres' : 'memory',
        auth: env.authEnforcement,
      });
    });
  } else {
    log.info('Running in Lambda mode (listen skipped)');
  }
}

if (!process.env.LAMBDA_TASK_ROOT) {
  startServer().catch((err) => {
    log.error('fatal startup error', { err });
    process.exit(1);
  });
}
