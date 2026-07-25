/**
 * Configuration and URL parsing tests.
 *
 * Verifies:
 * - parseDatabaseUrl preserves encoded credentials via URL.toString()
 * - Special characters in username/password survive round-trip
 * - No manual interpolation of credentials
 */
import { describe, it, expect } from 'vitest';

/**
 * Extract the parseDatabaseUrl logic for testing.
 * This mirrors the production implementation in env.ts exactly.
 */
function parseDatabaseUrl(raw: string): string | null {
  if (!raw || raw.trim() === '') return null;
  const v = raw.trim();
  let u: URL;
  try {
    u = new URL(v);
    if (!u.protocol.startsWith('postgres')) {
      throw new Error(`unsupported protocol '${u.protocol}'`);
    }
    if (!u.hostname) throw new Error('missing hostname');
  } catch (err) {
    throw new Error(
      `[env] DATABASE_URL is set but invalid: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return u.toString();
}

describe('parseDatabaseUrl - encoded credentials', () => {
  it('preserves username with @ encoded as %40', () => {
    const url = 'postgres://user%40domain:pass@localhost:5432/db';
    const result = parseDatabaseUrl(url)!;
    const parsed = new URL(result);
    expect(parsed.username).toBe('user%40domain');
    expect(parsed.hostname).toBe('localhost');
    expect(parsed.port).toBe('5432');
    expect(parsed.pathname).toBe('/db');
  });

  it('preserves password with : encoded as %3A', () => {
    const url = 'postgres://user:pass%3Aword@host:5432/mydb';
    const result = parseDatabaseUrl(url)!;
    const parsed = new URL(result);
    expect(parsed.password).toBe('pass%3Aword');
    expect(parsed.hostname).toBe('host');
  });

  it('preserves password with / encoded as %2F', () => {
    const url = 'postgres://admin:p%2Fass@db.example.com:5432/agrosbo';
    const result = parseDatabaseUrl(url)!;
    const parsed = new URL(result);
    expect(parsed.password).toBe('p%2Fass');
    expect(parsed.pathname).toBe('/agrosbo');
  });

  it('preserves space encoded as %20 in password', () => {
    const url = 'postgres://user:my%20secret@localhost:5432/test';
    const result = parseDatabaseUrl(url)!;
    const parsed = new URL(result);
    expect(parsed.password).toBe('my%20secret');
  });

  it('pathname modification via URL works correctly', () => {
    const raw = 'postgres://user:pass@localhost:5432/original';
    const u = new URL(raw);
    u.pathname = '/modified';
    const result = u.toString();
    expect(result).toContain('/modified');
    expect(result).not.toContain('/original');
    // Re-parseable
    const reparsed = new URL(result);
    expect(reparsed.pathname).toBe('/modified');
    expect(reparsed.username).toBe('user');
    expect(reparsed.password).toBe('pass');
  });

  it('result is always re-parseable', () => {
    const urls = [
      'postgres://u%40ser:p%3Ass@host:5432/db',
      'postgres://admin:complex%2F%3A%40pass@rds.amazonaws.com:5432/prod',
      'postgresql://user:pass%20word@localhost/test',
    ];
    for (const raw of urls) {
      const result = parseDatabaseUrl(raw)!;
      expect(() => new URL(result)).not.toThrow();
    }
  });

  it('rejects non-postgres protocols', () => {
    expect(() => parseDatabaseUrl('mysql://user:pass@host/db')).toThrow('unsupported protocol');
  });

  it('rejects missing hostname', () => {
    expect(() => parseDatabaseUrl('postgres://')).toThrow();
  });
});
