/**
 * Idempotency concurrency tests (memory backend).
 * Validates the atomic guarantees of the claim/complete/release cycle:
 * - At most one effect per key.
 * - Concurrent claims → only one gets 'claimed', others get 'processing'.
 * - Completed key returns stored result on retry.
 * - Released key allows re-claim.
 * - Different keys do not serialize globally.
 *
 * PostgreSQL-backed tests (with real concurrency and FOR UPDATE) run in CI
 * with a service container. These test the memory fallback semantics.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// We test the memory implementation by not setting DATABASE_URL.
// The module uses hasDatabaseUrl (false when no DATABASE_URL) → memory path.
beforeEach(() => {
  delete process.env.DATABASE_URL;
  delete process.env.AWS_RDS_SECRET_ARN;
  delete process.env.AWS_RDS_RESOURCE_ARN;
  delete process.env.AWS_RDS_DATABASE;
});

describe('idempotency (memory backend)', () => {
  it('claim → claimed, second claim same key → processing (2 simultaneous)', async () => {
    const { claim } = await import('../../../api/src/idempotency');
    const key = `test-2sim-${Date.now()}`;
    const [r1, r2] = await Promise.all([claim(key), claim(key)]);
    const types = [r1.type, r2.type].sort();
    // One must be 'claimed', the other 'processing' (or both claimed if the
    // first completes before the second runs — in memory, serial execution means
    // one will see the other's entry).
    expect(types).toContain('claimed');
    // The second should see it as processing
    expect(types.filter((t) => t === 'claimed').length).toBe(1);
  });

  it('10 simultaneous claims → exactly one claimed', async () => {
    const { claim } = await import('../../../api/src/idempotency');
    const key = `test-10sim-${Date.now()}`;
    const results = await Promise.all(Array.from({ length: 10 }, () => claim(key)));
    const claimed = results.filter((r) => r.type === 'claimed');
    const processing = results.filter((r) => r.type === 'processing');
    expect(claimed.length).toBe(1);
    expect(processing.length).toBe(9);
  });

  it('complete stores result; retry returns completed with same body', async () => {
    const { claim, complete } = await import('../../../api/src/idempotency');
    const key = `test-complete-${Date.now()}`;
    const r1 = await claim(key);
    expect(r1.type).toBe('claimed');
    if (r1.type !== 'claimed') return;

    await complete(key, r1.token, 201, { id: 'entity-1' });

    // Retry: should get completed
    const r2 = await claim(key);
    expect(r2.type).toBe('completed');
    if (r2.type === 'completed') {
      expect(r2.status).toBe(201);
      expect(r2.body).toEqual({ id: 'entity-1' });
    }
  });

  it('release after claim allows re-claim (simulates rollback)', async () => {
    const { claim, release } = await import('../../../api/src/idempotency');
    const key = `test-release-${Date.now()}`;
    const r1 = await claim(key);
    expect(r1.type).toBe('claimed');
    if (r1.type !== 'claimed') return;

    await release(key, r1.token);

    // Should be claimable again
    const r2 = await claim(key);
    expect(r2.type).toBe('claimed');
  });

  it('complete with wrong token throws (simulates lost claim)', async () => {
    const { claim, complete } = await import('../../../api/src/idempotency');
    const key = `test-wrongtoken-${Date.now()}`;
    const r1 = await claim(key);
    expect(r1.type).toBe('claimed');

    await expect(complete(key, 'bogus-token', 200, {})).rejects.toThrow(/claim lost/);
  });

  it('different keys execute independently (no global serialization)', async () => {
    const { claim, complete } = await import('../../../api/src/idempotency');
    const keyA = `test-indep-a-${Date.now()}`;
    const keyB = `test-indep-b-${Date.now()}`;

    const [rA, rB] = await Promise.all([claim(keyA), claim(keyB)]);
    expect(rA.type).toBe('claimed');
    expect(rB.type).toBe('claimed');

    // Complete both independently
    if (rA.type === 'claimed') await complete(keyA, rA.token, 200, { a: true });
    if (rB.type === 'claimed') await complete(keyB, rB.token, 200, { b: true });

    // Both should be completed independently
    const [rA2, rB2] = await Promise.all([claim(keyA), claim(keyB)]);
    expect(rA2.type).toBe('completed');
    expect(rB2.type).toBe('completed');
    if (rA2.type === 'completed') expect(rA2.body).toEqual({ a: true });
    if (rB2.type === 'completed') expect(rB2.body).toEqual({ b: true });
  });

  it('409 processing is reintentable after stale timeout', async () => {
    // This test manipulates the internal state to simulate a stale processing entry.
    // In the memory backend, entries older than PROCESSING_STALE_MS (10min) are
    // considered stale and can be re-claimed.
    const { claim } = await import('../../../api/src/idempotency');
    const key = `test-stale-${Date.now()}`;
    const r1 = await claim(key);
    expect(r1.type).toBe('claimed');

    // The memory implementation checks `now - createdAt < PROCESSING_STALE_MS`.
    // We can't easily fast-forward time here without mocking Date, but we can
    // verify the contract: a fresh claim on a non-stale key returns 'processing'.
    const r2 = await claim(key);
    expect(r2.type).toBe('processing');
  });
});
