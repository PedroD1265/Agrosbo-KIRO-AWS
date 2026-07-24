import serverlessExpress from '@vendia/serverless-express';
import { app } from '../index.js';
import { seedDatabase } from '../dbStorage.js';
import { initIdempotency } from '../idempotency.js';
import { initRevokedSessions } from '../auth.js';
import { env } from '../env.js';

let initialized = false;

async function setup() {
  if (initialized) return;
  if (env.hasDatabase) {
    try {
      await seedDatabase();
      await initIdempotency();
      await initRevokedSessions();
    } catch (err) {
      console.error('Initialization error in Lambda', err);
    }
  }
  initialized = true;
}

const serverlessHandler = serverlessExpress({ app });

export const handler = async (event: any, context: any, callback: any) => {
  await setup();
  return serverlessHandler(event, context, callback);
};
