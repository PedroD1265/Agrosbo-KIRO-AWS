/**
 * API configuration for the frontend.
 *
 * - VITE_API_BASE_URL: base URL of the API. Default '' (same-origin, local dev).
 *   In Amplify Hosting: full URL of the API Gateway (e.g. https://api.agrosbo.com).
 * - AuthTokenProvider: abstraction over how auth tokens are obtained.
 *   - LocalSessionAuthProvider: returns null (relies on credentials: 'include' for cookies).
 *   - CognitoAuthProvider (future): returns the Cognito JWT for Authorization Bearer.
 */

// --- API Base URL ---

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Resolve a relative API path (e.g. '/api/blocks') to a full URL.
 * When API_BASE_URL is empty, returns the path as-is (same-origin).
 * When set, prepends the base URL.
 */
export function resolveApiUrl(path: string): string {
  if (!API_BASE_URL) return path;
  // Avoid double slashes
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const rel = path.startsWith('/') ? path : `/${path}`;
  return `${base}${rel}`;
}

// --- Auth Token Provider ---

export interface AuthTokenProvider {
  /** Get the current auth token, or null if using cookie-based session. */
  getToken(): Promise<string | null>;
  /** Provider name for diagnostics. */
  readonly name: string;
}

/**
 * Local session provider — uses credentials: 'include' (cookie).
 * Returns null for the token so the fetch wrapper knows to use cookies.
 */
class LocalSessionAuthProvider implements AuthTokenProvider {
  readonly name = 'local-session';
  async getToken(): Promise<string | null> {
    return null;
  }
}

// Singleton — the active auth provider. Will be replaced by CognitoAuthProvider
// when APP_AUTH_PROVIDER=cognito-jwt in a future Spec.
let activeProvider: AuthTokenProvider = new LocalSessionAuthProvider();

export function getAuthProvider(): AuthTokenProvider {
  return activeProvider;
}

export function setAuthProvider(provider: AuthTokenProvider): void {
  activeProvider = provider;
}

// --- Fetch wrapper ---

import { apiFetch } from '@/lib/mocks/adapter';

/**
 * Build fetch init options with proper auth handling:
 * - If token is available (Cognito): sets Authorization Bearer header.
 * - If token is null (local-session): sets credentials: 'include' for cookies.
 */
export async function buildFetchInit(init?: RequestInit): Promise<RequestInit> {
  const token = await activeProvider.getToken();
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    // No credentials: 'include' needed for Bearer token auth
    return { ...init, headers };
  }

  // Local session: use cookies
  return { ...init, headers, credentials: 'include' as RequestCredentials };
}

/**
 * Central fetch used by queryClient, auth and any hook that would otherwise
 * call `fetch` directly. In demo mode (VITE_USE_MOCKS=1) it delegates to the
 * mock adapter; otherwise it is a straight passthrough to global fetch.
 * Kept here (not in queryClient) so every module using the API layer imports
 * from the same integration point.
 */
export { apiFetch };
