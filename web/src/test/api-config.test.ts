import { describe, it, expect } from 'vitest';
import { resolveApiUrl, buildFetchInit, getAuthProvider, setAuthProvider } from '@/lib/api-config';

describe('Frontend API Config Tests', () => {
  it('allows VITE_API_BASE_URL and resolves relative URLs correctly', () => {
    expect(resolveApiUrl('/api/blocks')).toBe('/api/blocks');
    expect(resolveApiUrl('api/blocks')).toBe('api/blocks');
  });

  it('buildFetchInit uses cookie-based session by default (credentials: include)', async () => {
    const init = await buildFetchInit({ method: 'GET' });
    expect(init.credentials).toBe('include');
  });

  it('custom AuthTokenProvider attaches Bearer header when token is available', async () => {
    const mockProvider = {
      name: 'cognito-mock',
      getToken: async () => 'fake-jwt-token-12345',
    };
    setAuthProvider(mockProvider);
    try {
      const init = await buildFetchInit({ method: 'GET' });
      const headers = init.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer fake-jwt-token-12345');
      expect(init.credentials).toBeUndefined();
    } finally {
      // Restore default
      setAuthProvider({
        name: 'local-session',
        getToken: async () => null,
      });
    }
  });

  it('frontend code contains no server secret keys', () => {
    // Verify frontend environment object has no DB or AWS secret variables
    const envKeys = Object.keys(import.meta.env);
    expect(envKeys).not.toContain('DATABASE_URL');
    expect(envKeys).not.toContain('AWS_RDS_SECRET_ARN');
    expect(envKeys).not.toContain('SESSION_SECRET');
  });
});
