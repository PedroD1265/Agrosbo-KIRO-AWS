import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, isDemoMode } from '@/lib/mocks/adapter';
import { B0_COVERED_ENDPOINTS } from '@/lib/mocks/handlers';

const ORIGINAL = import.meta.env.VITE_USE_MOCKS;

function setFlag(value: string | undefined) {
  // Vitest exposes import.meta.env as a mutable object.
  (import.meta.env as Record<string, unknown>).VITE_USE_MOCKS = value;
}

afterEach(() => {
  setFlag(ORIGINAL);
  vi.restoreAllMocks();
});

describe('mock adapter (B0)', () => {
  it('is a passthrough to global fetch when VITE_USE_MOCKS is unset', async () => {
    setFlag(undefined);
    expect(isDemoMode()).toBe(false);
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    const res = await apiFetch('/api/blocks');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  it('serves a mocked /api/tasks payload when VITE_USE_MOCKS=1', async () => {
    setFlag('1');
    expect(isDemoMode()).toBe(true);
    const spy = vi.spyOn(globalThis, 'fetch');
    const res = await apiFetch('/api/tasks');
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns UNMOCKED_ENDPOINT 501 for endpoints outside the B0 list', async () => {
    setFlag('1');
    const res = await apiFetch('/api/does-not-exist');
    expect(res.status).toBe(501);
    const body = (await res.json()) as { error: string; path: string; method: string };
    expect(body.error).toBe('UNMOCKED_ENDPOINT');
    expect(body.path).toBe('/api/does-not-exist');
    expect(body.method).toBe('GET');
  });

  it('rejects mutation methods in B0 with UNMOCKED_ENDPOINT (except auth)', async () => {
    setFlag('1');
    const res = await apiFetch('/api/tasks', { method: 'POST', body: '{}' });
    expect(res.status).toBe(501);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('UNMOCKED_ENDPOINT');
  });

  it('allows POST /api/auth/logout to succeed in demo mode', async () => {
    setFlag('1');
    const res = await apiFetch('/api/auth/logout', { method: 'POST' });
    expect(res.status).toBe(204);
  });

  it('advertises the exact B0 coverage list', () => {
    expect(B0_COVERED_ENDPOINTS).toContain('GET /api/tasks');
    expect(B0_COVERED_ENDPOINTS).toContain('GET /api/campaigns/:id/summary');
    expect(B0_COVERED_ENDPOINTS).toContain(
      'GET /api/spatial/features (empty valid FeatureCollection)',
    );
  });
});
