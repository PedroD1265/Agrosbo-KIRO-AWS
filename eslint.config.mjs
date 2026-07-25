import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    // Global ignores. Build outputs live in per-workspace dist/ folders
    // (web/dist, api/dist, infra/dist), so the glob must be recursive.
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/cdk.out/**',
      '**/*.tsbuildinfo',
      'spikes/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // React hooks linting for the web app. rules-of-hooks stays an error
    // (real bugs); exhaustive-deps is a warning (advisory, may be silenced
    // deliberately with a scoped disable directive).
    files: ['web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Node-executed maintenance scripts.
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
  {
    // Service worker runs in a dedicated worker global scope. Declare only the
    // SW globals it uses instead of disabling no-undef globally.
    files: ['web/public/sw.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        clients: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        URL: 'readonly',
        location: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        addEventListener: 'readonly',
      },
    },
  },
);
