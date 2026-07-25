/**
 * Typed database executor boundary.
 *
 * The DatabaseExecutor type represents a Drizzle PostgreSQL executor that
 * can be either the main database instance (NodePgDatabase) or a transaction
 * (NodePgTransaction). Both extend PgDatabase, which is what service
 * functions actually need.
 *
 * This eliminates `any` casts while remaining compatible with both the
 * top-level db and any nested transaction.
 *
 * Note: AWS Data API adapter (drizzle-orm/aws-data-api/pg) will have its
 * own typed adapter in the infrastructure Spec. It is NOT included here.
 */

import type { IStorage } from './storage.js';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';

/**
 * Real Drizzle executor type — covers both NodePgDatabase and NodePgTransaction.
 * Service functions accept this instead of `any`.
 */
export type DatabaseExecutor = PgDatabase<NodePgQueryResultHKT, Record<string, unknown>>;

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
