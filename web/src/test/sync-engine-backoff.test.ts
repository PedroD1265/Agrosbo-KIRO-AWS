import { describe, it, expect } from 'vitest';
import { computeRetryDelay } from '@/lib/sync/engine';

/**
 * sync-engine-backoff.test.ts
 *
 * Tests the PRODUCTION computeRetryDelay function exported from engine.ts.
 * No local copies of the algorithm — imports the real function.
 *
 * Invariant: delay = max(backoff(attempts), retryAfterMs ?? 0)
 * where backoff(n) = min(30000, 1500 * 2^max(0, n-1))
 */

describe('computeRetryDelay (production export from engine.ts)', () => {
  it('attempts=1 → 1500ms (BASE_DELAY * 2^0)', () => {
    expect(computeRetryDelay(1)).toBe(1500);
  });

  it('attempts=2 → 3000ms (BASE_DELAY * 2^1)', () => {
    expect(computeRetryDelay(2)).toBe(3000);
  });

  it('attempts=3 → 6000ms', () => {
    expect(computeRetryDelay(3)).toBe(6000);
  });

  it('attempts=5 → 24000ms', () => {
    expect(computeRetryDelay(5)).toBe(24000);
  });

  it('caps at 30000ms regardless of attempts', () => {
    expect(computeRetryDelay(20)).toBe(30000);
    expect(computeRetryDelay(100)).toBe(30000);
  });

  it('backoff=6000 + Retry-After=2000 → 6000 (backoff wins)', () => {
    // attempts=3 → backoff = 1500 * 2^2 = 6000
    expect(computeRetryDelay(3, 2000)).toBe(6000);
  });

  it('backoff=3000 + Retry-After=10000 → 10000 (Retry-After wins)', () => {
    // attempts=2 → backoff = 1500 * 2^1 = 3000
    expect(computeRetryDelay(2, 10000)).toBe(10000);
  });

  it('no Retry-After → delay equals backoff', () => {
    expect(computeRetryDelay(2, undefined)).toBe(3000);
    expect(computeRetryDelay(4, undefined)).toBe(12000);
  });

  it('Retry-After=0 → delay = backoff (never retries at 0ms)', () => {
    expect(computeRetryDelay(1, 0)).toBe(1500);
  });

  it('multiple operations: max(Retry-After values) determines override', () => {
    // Simulate accumulation: the engine uses Math.max across mutations
    const retryHeaders = [2000, 10000, 5000];
    const accumulated = Math.max(...retryHeaders);
    expect(accumulated).toBe(10000);
    // Final delay: max(backoff(1)=1500, 10000) = 10000
    expect(computeRetryDelay(1, accumulated)).toBe(10000);
  });

  it('no retry occurs before the computed delay (contract)', () => {
    // For any attempts + retryAfter combination, the result must be >= both inputs
    for (let a = 1; a <= 6; a++) {
      for (const ra of [0, 500, 2000, 5000, 15000, 50000]) {
        const delay = computeRetryDelay(a, ra);
        expect(delay).toBeGreaterThanOrEqual(ra);
        expect(delay).toBeGreaterThanOrEqual(1500); // minimum backoff floor
      }
    }
  });
});
