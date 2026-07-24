import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

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
  },
});
