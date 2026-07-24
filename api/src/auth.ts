import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { env } from './env.js';
import { db, hasDatabaseUrl } from './db.js';
import { users, revokedSessions, type User } from '@agrosbo/shared/schema.js';
import { eq, sql } from 'drizzle-orm';
import { createLogger } from './logger.js';

const log = createLogger('auth');

export const COOKIE_NAME = 'agrosbo_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * In-memory blocklist of revoked session tokens.
 * Key: `${userId}.${expiresAt}` (the signed body).
 * Value: expiry timestamp for TTL-based cleanup.
 * Seeded from DB on startup; DB writes are fire-and-forget so logout is instant.
 */
const revokedTokens = new Map<string, number>();

function pruneRevoked(): void {
  const now = Date.now();
  for (const [key, exp] of revokedTokens) {
    if (now > exp) revokedTokens.delete(key);
  }
}

const REVOKED_CLEANUP_PROBABILITY = 0.05;

async function cleanupExpiredRevokedDb(): Promise<void> {
  if (!hasDatabaseUrl) return;
  try {
    await db.execute(
      sql`delete from revoked_sessions where expires_at < ${new Date().toISOString()}`,
    );
  } catch (err) {
    log.warn('cleanupExpiredRevokedDb failed', { err });
  }
}

async function persistRevokeToDb(tokenKey: string, expiresAt: number): Promise<void> {
  if (!hasDatabaseUrl) return;
  try {
    const expiresIso = new Date(expiresAt).toISOString();
    await db
      .insert(revokedSessions)
      .values({ tokenKey, expiresAt: expiresIso })
      .onConflictDoNothing();
  } catch (err) {
    log.warn('persistRevokeToDb failed', { err });
  }
}

export function revokeToken(token: string): void {
  const parts = token.split('.');
  if (parts.length !== 3) return;
  const [userId, expRaw] = parts;
  const expiresAt = Number(expRaw);
  if (!userId || !Number.isFinite(expiresAt)) return;
  const tokenKey = `${userId}.${expiresAt}`;
  revokedTokens.set(tokenKey, expiresAt);
  pruneRevoked();
  void persistRevokeToDb(tokenKey, expiresAt);
  if (Math.random() < REVOKED_CLEANUP_PROBABILITY) void cleanupExpiredRevokedDb();
}

function isRevoked(userId: string, expiresAt: number): boolean {
  return revokedTokens.has(`${userId}.${expiresAt}`);
}

/**
 * Verify that the revoked_sessions table exists and is queryable.
 * Throws if the table is missing (e.g. db:push was not run after deploy).
 */
async function verifyRevokedSessionsTable(): Promise<void> {
  if (!hasDatabaseUrl) return;
  try {
    await db.execute(sql`select token_key, expires_at from revoked_sessions limit 0`);
  } catch (err) {
    throw new Error(
      `[auth] schema check failed for 'revoked_sessions' — run 'npm run db:push' to apply latest schema. Original: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Seed the in-memory blocklist from DB and remove expired rows.
 * Called once at startup so logout protection survives server restarts.
 * Throws if the revoked_sessions table does not exist (schema not pushed).
 */
export async function initRevokedSessions(): Promise<void> {
  if (!hasDatabaseUrl) return;
  await verifyRevokedSessionsTable();
  const nowIso = new Date().toISOString();
  await db.execute(sql`delete from revoked_sessions where expires_at < ${nowIso}`);
  const rows = await db.select().from(revokedSessions);
  let loaded = 0;
  for (const row of rows) {
    const exp = Date.parse(row.expiresAt);
    if (exp > Date.now()) {
      revokedTokens.set(row.tokenKey, exp);
      loaded++;
    }
  }
  log.info('revoked sessions loaded from DB', { loaded });
}

export type Role = 'admin' | 'tecnico' | 'encargado' | 'operario' | 'finanzas';

/**
 * Synthetic admin used when AUTH_ENFORCEMENT=off and no real session exists.
 * Lets the legacy open-access flow continue without code changes.
 */
const DEMO_USER: User = {
  id: 'demo-admin',
  orgId: 'org-default',
  name: 'Demo (auth off)',
  role: 'admin',
  active: true,
  createdAt: new Date(0).toISOString(),
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    authBypass?: boolean;
  }
}

function sign(payload: string): string {
  return createHmac('sha256', env.sessionSecret).update(payload).digest('hex');
}

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function encodeToken(userId: string, expiresAt: number): string {
  const body = `${userId}.${expiresAt}`;
  return `${body}.${sign(body)}`;
}

export function decodeToken(token: string): { userId: string; expiresAt: number } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, expRaw, sig] = parts;
  const expiresAt = Number(expRaw);
  if (!userId || !Number.isFinite(expiresAt)) return null;
  if (!safeEq(sig, sign(`${userId}.${expiresAt}`))) return null;
  if (Date.now() > expiresAt) return null;
  if (isRevoked(userId, expiresAt)) return null;
  return { userId, expiresAt };
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function setSessionCookie(res: Response, userId: string): number {
  const expiresAt = Date.now() + MAX_AGE_MS;
  const token = encodeToken(userId, expiresAt);
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`,
  ];
  if (env.isProd) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
  return expiresAt;
}

export function clearSessionCookie(res: Response) {
  const attrs = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (env.isProd) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

async function loadUser(userId: string): Promise<User | null> {
  if (!env.hasDatabase) return null;
  try {
    const [row] = await db.select().from(users).where(eq(users.id, userId));
    if (!row || !row.active) return null;
    const u: User = {
      id: row.id,
      orgId: row.orgId,
      name: row.name,
      role: row.role,
      active: row.active,
      createdAt: row.createdAt,
    };
    if (row.email) u.email = row.email;
    if (row.username) u.username = row.username;
    return u;
  } catch (err) {
    log.warn('loadUser failed', { err });
    return null;
  }
}

/**
 * Always runs. Parses cookie → req.user. Never blocks.
 * When AUTH_ENFORCEMENT=off and no session, attaches DEMO_USER so audit
 * fields keep working.
 */
export function attachUser(): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = readCookie(req, COOKIE_NAME);
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        const u = await loadUser(decoded.userId);
        if (u) {
          req.user = u;
          return next();
        }
      }
    }
    if (env.authEnforcement === 'off') {
      req.user = DEMO_USER;
      req.authBypass = true;
    }
    next();
  };
}

export function requireAuth(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (env.authEnforcement === 'off') return next();
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    next();
  };
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (env.authEnforcement === 'off') return next();
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.role as Role)) {
      return res.status(403).json({ error: 'Permiso insuficiente', needed: roles });
    }
    next();
  };
}
