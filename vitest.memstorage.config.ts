import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Isolated Vitest config for MemStorage HTTP tests.
 * Sets USE_MEM_STORAGE=1 and a synthetic DATABASE_URL (unreachable port)
 * via the test env, ensuring modules evaluate with memory mode active.
 */
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
    include: ['api/src/test/memstorage-http.test.ts'],
    testTimeout: 15000,
    env: {
      DATABASE_URL: 'postgresql://synthetic:synthetic@127.0.0.1:65534/not_used',
      USE_MEM_STORAGE: '1',
      NODE_ENV: 'test',
      AUTH_ENFORCEMENT: 'off',
      APP_AUTH_PROVIDER: 'local-session',
      ATTACHMENTS_STORAGE_DRIVER: 'local',
      DOCUMENT_EXTRACTION_PROVIDER: 'none',
    },
  },
});
