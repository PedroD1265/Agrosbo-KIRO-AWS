/**
 * S4 Harness — Token Externo Seguro
 *
 * Validates ADR 017 decisions:
 * - Opaque token generation (crypto.randomBytes(32), base64url)
 * - SHA-256 hash-only persistence
 * - Validation (valid, invalid, expired, revoked)
 * - Idempotent state transitions
 * - State machine (sent → opened_link → responded → completed)
 * - Illegal transitions rejected
 * - TTL enforcement
 * - Revocation
 * - Timing-safe comparison
 *
 * Part B (PostgreSQL concurrency) runs only with --pg flag.
 *
 * DISPOSABLE — not production code.
 */

import { generateToken, hashToken, TokenStore } from './token-service.js';
import { runPgTests } from './pg-concurrency.js';

// ---------- Test infrastructure ----------

interface TestResult {
  name: string;
  pass: boolean;
  detail: string;
}

const results: TestResult[] = [];

function assert(name: string, condition: boolean, detail: string): void {
  results.push({ name, pass: condition, detail });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- Part A: Crypto + in-memory tests ----------

async function runPartA(): Promise<void> {
  const store = new TokenStore();

  // 1. Token generation
  const token1 = generateToken();
  const token1Bytes = Buffer.from(token1, 'base64url');
  assert(
    'Generation: 32 bytes, base64url',
    token1Bytes.length === 32 && /^[A-Za-z0-9_-]+$/.test(token1),
    `length=${token1Bytes.length}, format=${token1.substring(0, 8)}...`,
  );

  // Entropy: all unique tokens
  const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
  assert('Generation: 100 tokens all unique', tokens.size === 100, `unique=${tokens.size}/100`);

  // 2. Hash and persistence
  const rawToken = generateToken();
  const hash = hashToken(rawToken);
  assert(
    'Hash: SHA-256 produces 64-char hex',
    hash.length === 64 && /^[0-9a-f]+$/.test(hash),
    `hash=${hash.substring(0, 16)}...`,
  );

  // Verify hash matches
  const hash2 = hashToken(rawToken);
  assert('Hash: deterministic (same input → same output)', hash === hash2, 'hashes match');

  // Different tokens → different hashes
  const otherToken = generateToken();
  const otherHash = hashToken(otherToken);
  assert('Hash: different tokens → different hashes', hash !== otherHash, 'hashes differ');

  // 3. Validation: valid token
  const validToken = generateToken();
  store.create(validToken, 'task-100', 60_000);
  const validResult = store.validate(validToken);
  assert(
    'Validation: valid token accepted',
    validResult.valid === true,
    `valid=${validResult.valid}`,
  );

  // 4. Validation: invalid token rejected
  const fakeToken = generateToken();
  const invalidResult = store.validate(fakeToken);
  assert(
    'Validation: unknown token rejected',
    invalidResult.valid === false &&
      !invalidResult.valid &&
      invalidResult.reason === 'token_not_found',
    `valid=${invalidResult.valid}`,
  );

  // 5. TTL expiration
  const shortLivedToken = generateToken();
  store.create(shortLivedToken, 'task-101', 500); // 500ms TTL
  await sleep(600);
  const expiredResult = store.validate(shortLivedToken);
  assert(
    'TTL: expired token rejected',
    expiredResult.valid === false &&
      !expiredResult.valid &&
      expiredResult.reason === 'token_expired',
    `valid=${expiredResult.valid}`,
  );

  // 6. Revocation
  const revokeToken = generateToken();
  store.create(revokeToken, 'task-102', 60_000);
  const revokeResult = store.revoke(revokeToken);
  assert(
    'Revocation: transition succeeds',
    revokeResult.success === true && revokeResult.newState === 'revoked',
    `success=${revokeResult.success}`,
  );
  const afterRevoke = store.validate(revokeToken);
  assert(
    'Revocation: revoked token rejected',
    afterRevoke.valid === false && !afterRevoke.valid && afterRevoke.reason === 'token_revoked',
    `reason=${!afterRevoke.valid ? afterRevoke.reason : 'n/a'}`,
  );

  // 7. State transitions: happy path
  const stateToken = generateToken();
  store.create(stateToken, 'task-103', 60_000);

  const t1 = store.transition(stateToken, 'opened_link');
  assert(
    'Transition: sent → opened_link',
    t1.success && t1.previousState === 'sent' && t1.newState === 'opened_link',
    `${t1.previousState} → ${t1.newState}`,
  );

  const t2 = store.transition(stateToken, 'responded');
  assert(
    'Transition: opened_link → responded',
    t2.success && t2.previousState === 'opened_link' && t2.newState === 'responded',
    `${t2.previousState} → ${t2.newState}`,
  );

  const t3 = store.transition(stateToken, 'completed');
  assert(
    'Transition: responded → completed',
    t3.success && t3.previousState === 'responded' && t3.newState === 'completed',
    `${t3.previousState} → ${t3.newState}`,
  );

  // 8. Illegal transition rejected
  const illegalToken = generateToken();
  store.create(illegalToken, 'task-104', 60_000);
  const illegalResult = store.transition(illegalToken, 'completed');
  assert(
    'Transition: illegal (sent → completed) rejected',
    illegalResult.success === false &&
      (illegalResult.error?.includes('invalid_transition') ?? false),
    `error=${illegalResult.error}`,
  );

  // Reverse transition rejected
  const reverseToken = generateToken();
  store.create(reverseToken, 'task-105', 60_000);
  store.transition(reverseToken, 'opened_link');
  store.transition(reverseToken, 'responded');
  const reverseResult = store.transition(reverseToken, 'opened_link');
  assert(
    'Transition: reverse (responded → opened_link) rejected',
    reverseResult.success === false &&
      (reverseResult.error?.includes('invalid_transition') ?? false),
    `error=${reverseResult.error}`,
  );

  // 9. Idempotency: same transition repeated
  const idempToken = generateToken();
  store.create(idempToken, 'task-106', 60_000);
  store.transition(idempToken, 'opened_link');
  const idemp1 = store.transition(idempToken, 'opened_link');
  assert(
    'Idempotency: repeated transition returns idempotent=true',
    idemp1.success && idemp1.idempotent,
    `idempotent=${idemp1.idempotent}`,
  );

  // State doesn't change on idempotent call
  const record = store.getRecord(idempToken);
  assert(
    'Idempotency: state unchanged after repeat',
    record?.state === 'opened_link',
    `state=${record?.state}`,
  );

  // 10. Throughput measurement
  const iterations = 10_000;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const t = generateToken();
    hashToken(t);
  }
  const elapsed = performance.now() - start;
  const opsPerSec = Math.round(iterations / (elapsed / 1000));
  assert(
    'Throughput: generate+hash > 1000 ops/sec',
    opsPerSec > 1000,
    `${opsPerSec} ops/sec (${iterations} iterations in ${Math.round(elapsed)}ms)`,
  );

  store.clear();
}

// ---------- Main ----------

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  S4 — Token Externo Seguro (Spike Harness)');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('▶ Part A: Crypto + in-memory tests\n');
  await runPartA();

  // Part B: PostgreSQL (only with --pg flag)
  const runPg = process.argv.includes('--pg');
  if (runPg) {
    console.log('\n▶ Part B: PostgreSQL concurrency tests\n');
    try {
      const pgResults = await runPgTests();
      results.push(...pgResults);
    } catch (err) {
      results.push({
        name: 'PostgreSQL connection',
        pass: false,
        detail: `Failed to connect: ${(err as Error).message}`,
      });
    }
  } else {
    console.log('\n▶ Part B: PostgreSQL concurrency tests SKIPPED (use --pg flag)\n');
  }

  // ---------- Report ----------
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const icon = r.pass ? '✓' : '✗';
    const status = r.pass ? 'PASS' : 'FAIL';
    console.log(`  ${icon} [${status}] ${r.name}`);
    console.log(`           ${r.detail}`);
    if (r.pass) passed++;
    else failed++;
  }

  console.log('\n───────────────────────────────────────────────────────────');
  console.log(`  Total: ${results.length} | PASS: ${passed} | FAIL: ${failed}`);
  console.log('───────────────────────────────────────────────────────────\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
