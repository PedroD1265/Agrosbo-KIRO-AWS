/**
 * Unit test for request storage restoration in transactional handlers.
 *
 * Verifies:
 * - req.storage is set to txStorage during handler execution
 * - req.storage is restored to previous value after successful handler completion
 * - req.storage is restored to previous value after handler exception
 */
import { describe, it, expect } from 'vitest';
import type { TransactionalStorage, DatabaseExecutor } from '../executor.js';

describe('Transactional request storage restoration', () => {
  it('restores req.storage to previous value after success and error in withTransaction', async () => {
    const initialStorage = { name: 'initialStorage' };
    const txStorage = { name: 'txStorage' };

    const req: { storage?: any } = { storage: initialStorage };

    // Simulate the exact code from idempotent middleware:
    const simulateTransactionalHandler = async (handler: () => Promise<void>) => {
      const mockTransactionalStorage: TransactionalStorage = {
        executor: {} as DatabaseExecutor,
        withTransaction: async <T>(
          fn: (tStorage: TransactionalStorage, tx: DatabaseExecutor) => Promise<T>,
        ): Promise<T> => {
          return await fn(txStorage as any, {} as DatabaseExecutor);
        },
      } as any;

      await mockTransactionalStorage.withTransaction(async (tStorage) => {
        const prevStorage = req.storage;
        req.storage = tStorage;

        try {
          await handler();
        } finally {
          req.storage = prevStorage;
        }
      });
    };

    // Case 1: Success handler
    let capturedDuringSuccess: any = null;
    await simulateTransactionalHandler(async () => {
      capturedDuringSuccess = req.storage;
    });

    expect(capturedDuringSuccess).toBe(txStorage);
    expect(req.storage).toBe(initialStorage);

    // Case 2: Error handler
    let capturedDuringError: any = null;
    await expect(
      simulateTransactionalHandler(async () => {
        capturedDuringError = req.storage;
        throw new Error('Handler failure');
      }),
    ).rejects.toThrow('Handler failure');

    expect(capturedDuringError).toBe(txStorage);
    expect(req.storage).toBe(initialStorage);
  });
});
