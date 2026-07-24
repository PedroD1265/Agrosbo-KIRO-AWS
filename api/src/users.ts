import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { eq, desc } from 'drizzle-orm';
import { db } from './db.js';
import { users, type User, type InsertUser } from '@agrosbo/shared/schema.js';

function rowToUser(r: typeof users.$inferSelect): User {
  const out: User = {
    id: r.id,
    orgId: r.orgId,
    name: r.name,
    role: r.role,
    active: r.active,
    createdAt: r.createdAt,
  };
  if (r.email) out.email = r.email;
  if (r.username) out.username = r.username;
  return out;
}

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hash] = parts;
  const test = scryptSync(plain, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (test.length !== expected.length) return false;
  return timingSafeEqual(test, expected);
}

export async function listUsers(): Promise<User[]> {
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));
  return rows.map(rowToUser);
}

export async function createUser(input: InsertUser & { password?: string }): Promise<User> {
  const id = `usr-${randomUUID().slice(0, 10)}`;
  const passwordHash = input.password ? hashPassword(input.password) : null;
  const [row] = await db
    .insert(users)
    .values({
      id,
      orgId: input.orgId ?? 'org-default',
      name: input.name,
      email: input.email ?? null,
      username: input.username ?? null,
      passwordHash,
      role: input.role,
      active: input.active ?? true,
      createdAt: new Date().toISOString(),
    })
    .returning();
  return rowToUser(row);
}

export async function getUserByLogin(
  login: string,
): Promise<{ user: User; passwordHash: string | null } | undefined> {
  const [row] = await db.select().from(users).where(eq(users.email, login));
  if (row) return { user: rowToUser(row), passwordHash: row.passwordHash };
  const [row2] = await db.select().from(users).where(eq(users.username, login));
  if (row2) return { user: rowToUser(row2), passwordHash: row2.passwordHash };
  return undefined;
}
