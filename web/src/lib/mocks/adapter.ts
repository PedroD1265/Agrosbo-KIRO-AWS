/**
 * Mock adapter for the frontend API client (B0).
 *
 * Activation: `import.meta.env.VITE_USE_MOCKS === '1'`.
 *
 * Integration point: the central API client only (`web/src/lib/api-config.ts`,
 * consumed by `queryClient.ts`, `auth.tsx`, `useWeatherForecast.ts`).
 * There is NO monkey-patch of `window.fetch`, NO global interceptor, and NO
 * modification of `web/src/lib/sync/**`.
 *
 * When the flag is absent, `apiFetch()` behaves exactly like `fetch()` and
 * production paths are untouched.
 */
import { handleMockRequest } from './handlers';

export function isDemoMode(): boolean {
  return import.meta.env.VITE_USE_MOCKS === '1';
}

function toURL(input: RequestInfo | URL): URL {
  if (input instanceof URL) return input;
  if (typeof input === 'string') {
    return new URL(input, 'http://demo.local');
  }
  return new URL(input.url, 'http://demo.local');
}

/**
 * Drop-in replacement for `fetch` used inside the API client layer.
 * - In demo mode: resolves to a mock Response (or `UNMOCKED_ENDPOINT` 501).
 * - Otherwise: forwards to global `fetch` unchanged.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!isDemoMode()) {
    return fetch(input, init);
  }
  const url = toURL(input);
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const mocked = handleMockRequest(url, method);
  if (mocked) return mocked;
  return fetch(input, init);
}
