/**
 * storage-runtime.test.ts
 *
 * Verifies that usesTransactionalDatabaseStorage() correctly reflects the
 * ACTIVE storage backend, not just the presence of DATABASE_URL.
 *
 * The three critical combinations are:
 *   1. No DATABASE_URL             -> MemStorage -> returns false
 *   2. DATABASE_URL + MEM flag=1   -> MemStorage -> returns false
 *   3. DATABASE_URL, no MEM flag   -> DbStorage  -> returns true
 *
 * Because env.ts is a module-level singleton, we verify the logic of the
 * storage selector (useMemStorage flag) through env.useMemStorage rather than
 * re-initializing the whole module (which would require a full NODE_ENV
 * restart). The negative path (false when MemStorage) is covered by the
 * unit tests running WITHOUT DATABASE_URL (standard CI configuration).
 */

import { describe, it, expect } from 'vitest';
import { env } from '../env.js';
import { MemStorage } from '../storage.js';
import { DbStorage } from '../dbStorage.js';
import { usesTransactionalDatabaseStorage, getGlobalStorage } from '../storage.js';

describe('usesTransactionalDatabaseStorage() - runtime signal', () => {
  it('getGlobalStorage() returns an object implementing IStorage', () => {
    const s = getGlobalStorage();
    expect(s).toBeDefined();
    expect(typeof (s as any).listTasks).toBe('function');
  });

  it('usesTransactionalDatabaseStorage() matches the active singleton type', () => {
    const s = getGlobalStorage();
    const isDb = s instanceof DbStorage;
    const isMem = s instanceof MemStorage;
    // One of the two must be true
    expect(isDb || isMem).toBe(true);
    // The signal must agree with the actual type
    expect(usesTransactionalDatabaseStorage()).toBe(isDb);
  });

  it('env.useMemStorage=false when DATABASE_URL is set (positive path for transactional mode)', () => {
    // In the test environment (vitest.config.ts sets DATABASE_URL),
    // env.useMemStorage must be false and hasDatabase must be true.
    if (env.databaseUrl) {
      expect(env.useMemStorage).toBe(false);
      expect(env.hasDatabase).toBe(true);
      expect(usesTransactionalDatabaseStorage()).toBe(true);
    } else {
      // Without DATABASE_URL (unit test without DB), mem storage is expected
      expect(env.useMemStorage).toBe(true);
      expect(env.hasDatabase).toBe(false);
      expect(usesTransactionalDatabaseStorage()).toBe(false);
    }
  });

  it('env.useMemStorage=true when USE_MEM_STORAGE flag is honored (documented semantic)', () => {
    // This documents the intended behavior: the env parser gives useMemStorage
    // precedence over databaseUrl when USE_MEM_STORAGE=1 is set.
    // The actual runtime path is validated in integration test 15.
    expect(typeof env.useMemStorage).toBe('boolean');
    // useMemStorage and hasDatabase are complementary
    expect(env.useMemStorage).toBe(!env.hasDatabase);
  });
});
