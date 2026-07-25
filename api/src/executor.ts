/**
 * Typed database executor boundary.
 *
 * Provides a compile-time contract for passing the Drizzle db/tx executor
 * to service functions, eliminating `as any` casts. The actual executor is
 * an opaque object that supports Drizzle query methods (select, insert,
 * update, delete, execute, transaction).
 *
 * This module also provides a type-guard to check at runtime whether a
 * given IStorage instance is a TransactionalStorage that can provide an
 * executor for atomic operations.
 */

import type { IStorage } from './storage.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DatabaseExecutor = any;

/**
 * A storage implementation that supports PostgreSQL transactions.
 * DbStorage implements this; MemStorage does not.
 */
export interface TransactionalStorage extends IStorage {
  /** The underlying Drizzle executor (db or tx) for direct queries. */
  readonly executor: DatabaseExecutor;

  /**
   * Execute a function within a PostgreSQL transaction.
   * The callback receives a transactional storage and the raw tx executor.
   */
  withTransaction<T>(
    fn: (txStorage: TransactionalStorage, tx: DatabaseExecutor) => Promise<T>,
  ): Promise<T>;
}

/**
 * Runtime type-guard: returns true if the storage supports transactions.
 */
export function isTransactionalStorage(s: IStorage): s is TransactionalStorage {
  return (
    s !== null &&
    typeof s === 'object' &&
    'executor' in s &&
    'withTransaction' in s &&
    typeof (s as TransactionalStorage).withTransaction === 'function'
  );
}

/**
 * Extract the executor from a storage, or throw a controlled error if the
 * storage does not support transactions (e.g., MemStorage).
 *
 * Use this instead of `(getStorage(req) as any).executor ?? db`.
 */
export function requireDatabaseExecutor(s: IStorage): DatabaseExecutor {
  if (isTransactionalStorage(s)) {
    return s.executor;
  }
  throw new DatabaseRequiredError();
}

/**
 * Thrown when a PostgreSQL-only operation is attempted under MemStorage.
 * Routes should catch this and return 503 with code DATABASE_REQUIRED.
 */
export class DatabaseRequiredError extends Error {
  readonly code = 'DATABASE_REQUIRED';
  constructor() {
    super('Operación no disponible con almacenamiento en memoria');
    this.name = 'DatabaseRequiredError';
  }
}
