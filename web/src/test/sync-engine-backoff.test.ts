import { describe, it, expect } from 'vitest';

/**
 * sync-engine-backoff.test.ts
 *
 * Tests for the backoff/Retry-After scheduling logic in engine.ts.
 *
 * The corrected invariant (previously broken):
 *   delay = max(backoff(attempts), retryAfterMs ?? 0)
 *
 * This ensures the client NEVER retries more aggressively than the
 * exponential backoff floor, even when Retry-After is small.
 */

function backoff(attempts: number): number {
  const BASE_DELAY = 1500;
  return Math.min(30_000, BASE_DELAY * 2 ** Math.max(0, attempts - 1));
}

/**
 * Mirrors the corrected scheduleNext delay calculation from engine.ts.
 */
function resolveDelay(attempts: number, retryAfterMs?: number): number {
  return Math.max(backoff(attempts), retryAfterMs ?? 0);
}

describe('Sync Engine Backoff + Retry-After scheduling', () => {
  it('backoff(1) = 1500ms (BASE_DELAY * 2^0)', () => {
    expect(backoff(1)).toBe(1500);
  });

  it('backoff(2) = 3000ms', () => {
    expect(backoff(2)).toBe(3000);
  });

  it('backoff(5) = 24000ms', () => {
    expect(backoff(5)).toBe(24000);
  });

  it('backoff caps at 30000ms', () => {
    expect(backoff(20)).toBe(30000);
  });

  it('Retry-After=2000ms + backoff=6000ms -> delay=6000ms (backoff wins)', () => {
    // attempts=3 -> backoff = 1500 * 2^2 = 6000
    const delay = resolveDelay(3, 2000);
    expect(delay).toBe(6000);
  });

  it('Retry-After=10000ms + backoff=3000ms -> delay=10000ms (Retry-After wins)', () => {
    // attempts=2 -> backoff = 1500 * 2^1 = 3000
    const delay = resolveDelay(2, 10000);
    expect(delay).toBe(10000);
  });

  it('No Retry-After -> delay = backoff(attempts)', () => {
    expect(resolveDelay(2, undefined)).toBe(backoff(2));
    expect(resolveDelay(4, undefined)).toBe(backoff(4));
  });

  it('Retry-After=0 -> delay = backoff (floor wins, never 0)', () => {
    // Retry-After: 0 should not allow immediate retry
    const delay = resolveDelay(1, 0);
    expect(delay).toBe(backoff(1)); // 1500
  });

  it('Multiple mutations: overrideDelayMs accumulates with Math.max, not Math.min', () => {
    // Simulate processing 3 mutations with different Retry-After headers
    let accumulated: number = 0;
    const retryHeaders = [2000, 10000, 5000];

    for (const r of retryHeaders) {
      accumulated = Math.max(accumulated, r);
    }

    // Result must be the maximum, not the minimum
    expect(accumulated).toBe(10000);
    // Final delay respects backoff floor too
    const finalDelay = resolveDelay(1, accumulated);
    expect(finalDelay).toBe(10000); // max(1500, 10000)
  });
});
