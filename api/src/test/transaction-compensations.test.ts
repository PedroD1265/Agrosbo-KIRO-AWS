import { describe, it, expect, vi } from 'vitest';
import type { Request } from 'express';
import {
  registerTransactionCompensation,
  runTransactionCompensations,
  type TransactionCompensation,
} from '../transaction-compensations.js';

describe('Transaction Compensations Mechanism', () => {
  it('registerTransactionCompensation throws when called outside active transactional request', () => {
    const req: Partial<Request> = {};
    expect(() => registerTransactionCompensation(req as Request, async () => {})).toThrow(
      'registerTransactionCompensation debe llamarse',
    );
  });

  it('registerTransactionCompensation appends compensation function to request list', () => {
    const list: TransactionCompensation[] = [];
    const req: Partial<Request> = { transactionCompensations: list };

    const comp: TransactionCompensation = async () => {};
    registerTransactionCompensation(req as Request, comp);

    expect(list.length).toBe(1);
    expect(list[0]).toBe(comp);
  });

  it('runTransactionCompensations runs functions in reverse order (LIFO)', async () => {
    const executionOrder: number[] = [];

    const comp1: TransactionCompensation = async () => {
      executionOrder.push(1);
    };
    const comp2: TransactionCompensation = async () => {
      executionOrder.push(2);
    };

    const compensations = [comp1, comp2];
    await runTransactionCompensations(compensations, new Error('Primary error'));

    expect(executionOrder).toEqual([2, 1]);
  });

  it('runTransactionCompensations continues executing remaining compensations if one fails', async () => {
    const executionOrder: number[] = [];

    const comp1: TransactionCompensation = async () => {
      executionOrder.push(1);
    };
    const compFailing: TransactionCompensation = async () => {
      executionOrder.push(2);
      throw new Error('Cleanup storage failed');
    };
    const comp3: TransactionCompensation = async () => {
      executionOrder.push(3);
    };

    const compensations = [comp1, compFailing, comp3];
    const primaryError = new Error('Primary DB Commit Failure');

    // Must resolve cleanly without throwing secondary cleanup error
    await expect(runTransactionCompensations(compensations, primaryError)).resolves.toBeUndefined();

    // Executed in reverse order: 3 -> 2 (fails) -> 1
    expect(executionOrder).toEqual([3, 2, 1]);
  });
});
