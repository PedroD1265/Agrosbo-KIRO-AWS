/**
 * S4 Token Service — Spike implementation.
 *
 * Validates ADR 017 decisions:
 * - Opaque token with cryptographic entropy (32 bytes, base64url).
 * - Only SHA-256 hash is persisted.
 * - TTL expiration.
 * - Revocation.
 * - Idempotent state transitions.
 *
 * DISPOSABLE — not production code.
 */

import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

// ---------- Types ----------

export type TokenState = 'sent' | 'opened_link' | 'responded' | 'completed' | 'revoked';

export interface TokenRecord {
  hash: string;
  taskId: string;
  state: TokenState;
  createdAt: Date;
  expiresAt: Date;
  revoked: boolean;
}

export interface TransitionResult {
  success: boolean;
  previousState: TokenState;
  newState: TokenState;
  idempotent: boolean;
  error?: string;
}

// ---------- Valid transitions ----------

const VALID_TRANSITIONS: Record<TokenState, TokenState[]> = {
  sent: ['opened_link', 'revoked'],
  opened_link: ['responded', 'revoked'],
  responded: ['completed', 'revoked'],
  completed: [],
  revoked: [],
};

// ---------- Token generation ----------

export function generateToken(): string {
  const bytes = randomBytes(32);
  return bytes.toString('base64url');
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Constant-time comparison for token hashes.
 * Prevents timing attacks even though we compare hex strings.
 */
export function secureCompareHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return timingSafeEqual(bufA, bufB);
}

// ---------- In-memory store ----------

export class TokenStore {
  private records = new Map<string, TokenRecord>();

  create(rawToken: string, taskId: string, ttlMs: number): TokenRecord {
    const hash = hashToken(rawToken);
    const now = new Date();
    const record: TokenRecord = {
      hash,
      taskId,
      state: 'sent',
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
      revoked: false,
    };
    this.records.set(hash, record);
    return record;
  }

  findByToken(rawToken: string): TokenRecord | undefined {
    const hash = hashToken(rawToken);
    for (const [storedHash, record] of this.records) {
      if (secureCompareHash(hash, storedHash)) {
        return record;
      }
    }
    return undefined;
  }

  validate(
    rawToken: string,
  ): { valid: true; record: TokenRecord } | { valid: false; reason: string } {
    const record = this.findByToken(rawToken);
    if (!record) {
      return { valid: false, reason: 'token_not_found' };
    }
    if (record.revoked) {
      return { valid: false, reason: 'token_revoked' };
    }
    if (new Date() > record.expiresAt) {
      return { valid: false, reason: 'token_expired' };
    }
    return { valid: true, record };
  }

  transition(rawToken: string, targetState: TokenState): TransitionResult {
    const validation = this.validate(rawToken);
    if (!validation.valid) {
      return {
        success: false,
        previousState: 'sent',
        newState: 'sent',
        idempotent: false,
        error: validation.reason,
      };
    }
    const record = validation.record;

    // Idempotent: already in target state
    if (record.state === targetState) {
      return {
        success: true,
        previousState: record.state,
        newState: targetState,
        idempotent: true,
      };
    }

    // Check if transition is valid
    const allowed = VALID_TRANSITIONS[record.state];
    if (!allowed.includes(targetState)) {
      return {
        success: false,
        previousState: record.state,
        newState: record.state,
        idempotent: false,
        error: `invalid_transition: ${record.state} -> ${targetState}`,
      };
    }

    const previousState = record.state;
    record.state = targetState;
    if (targetState === 'revoked') {
      record.revoked = true;
    }

    return {
      success: true,
      previousState,
      newState: targetState,
      idempotent: false,
    };
  }

  revoke(rawToken: string): TransitionResult {
    return this.transition(rawToken, 'revoked');
  }

  getRecord(rawToken: string): TokenRecord | undefined {
    return this.findByToken(rawToken);
  }

  clear(): void {
    this.records.clear();
  }
}
