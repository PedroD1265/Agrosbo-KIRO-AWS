/**
 * Standalone seed script — applies the idempotent seed to the database.
 * Usage: npm run db:seed (from api workspace)
 * Requires: DATABASE_URL pointing to a migrated PostgreSQL instance.
 */
import { seedDatabase } from '../dbStorage.js';
import { createLogger } from '../logger.js';

const log = createLogger('seed-script');

async function main() {
  log.info('starting database seed...');
  await seedDatabase();
  log.info('seed complete');
  process.exit(0);
}

main().catch((err) => {
  log.error('seed failed', { err });
  process.exit(1);
});
