import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Default DATABASE_URL for local execution if not explicitly provided by environment/CI
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://spike:spike_local_only@127.0.0.1:54320/agrosbo_spike';
}

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./web/src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['api/src/test/integration/**/*.postgres.test.ts'],
    exclude: ['node_modules', 'dist', 'spikes'],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      SEED_ADMIN_PASSWORD: 'integration_test_only_not_for_production',
      AUTH_ENFORCEMENT: 'off',
      NODE_ENV: 'test',
    },
  },
});
