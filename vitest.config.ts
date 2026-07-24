import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Aliases mirror the ones production uses (web/vite.config.ts + web/tsconfig.json):
//   '@'       -> web/src
//   '@shared' -> shared
// This ensures modules imported through those aliases (e.g. web/src/lib/permissions
// -> '@/lib/auth', '@shared/schema') resolve under Vitest exactly as in production.
// Note: @rollup/plugin-alias only matches when a '/' follows the key, so the
// workspace package specifier '@agrosbo/shared' is NOT affected by the '@' alias.
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
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'spikes', '**/*.postgres.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
