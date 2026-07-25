import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  registerTransactionCompensation,
  runTransactionCompensations,
  type TransactionCompensation,
} from '../transaction-compensations.js';
import { idempotent } from '../routes.js';
import type { TransactionalStorage, DatabaseExecutor } from '../executor.js';
import { claimTx, completeTx } from '../idempotency.js';

vi.mock('../idempotency.js', () => ({
  claimTx: vi.fn(),
  completeTx: vi.fn(),
  claim: vi.fn(),
  complete: vi.fn(),
  release: vi.fn(),
}));

describe('Transaction Compensations Unit Suite', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.resetAllMocks();

    mockReq = {
      method: 'POST',
      baseUrl: '/api',
      path: '/test-route',
      header: vi.fn((name: string) =>
        name.toLowerCase() === 'x-idempotency-key' ? 'key-123' : null,
      ) as unknown as Request['header'],
      storage: undefined,
      transactionCompensations: undefined,
    };

    mockRes = {
      statusCode: 200,
      status: vi.fn().mockImplementation((code: number) => {
        mockRes.statusCode = code;
        return mockRes;
      }),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
    };

    mockNext = vi.fn() as unknown as NextFunction;
  });

  it('1. Success: handler succeeds, completeTx succeeds -> compensation NOT executed, req & res restored', async () => {
    const compSpy: TransactionCompensation = vi.fn(async () => {});
    const txStorage = { name: 'txStorage' } as unknown as TransactionalStorage;

    const mockTransactionalStorage: TransactionalStorage = {
      executor: {} as DatabaseExecutor,
      withTransaction: async <T>(
        fn: (tStorage: TransactionalStorage, tx: DatabaseExecutor) => Promise<T>,
      ): Promise<T> => {
        return await fn(txStorage, {} as DatabaseExecutor);
      },
    } as unknown as TransactionalStorage;

    mockReq.storage = mockTransactionalStorage;
    const initialCompensations = mockReq.transactionCompensations;

    vi.mocked(claimTx).mockResolvedValue({ type: 'claimed', token: 'token-abc' });
    vi.mocked(completeTx).mockResolvedValue();

    const handler = async (req: Request, res: Response) => {
      registerTransactionCompensation(req, compSpy);
      res.status(201).json({ id: '1' });
    };

    const middleware = idempotent(handler);
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(compSpy).not.toHaveBeenCalled();
    expect(mockReq.storage).toBe(mockTransactionalStorage);
    expect(mockReq.transactionCompensations).toBe(initialCompensations);
    expect(typeof mockRes.json).toBe('function');
    expect(typeof mockRes.send).toBe('function');
    expect(typeof mockRes.end).toBe('function');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('2. completeTx failure: handler succeeds, completeTx throws -> compensation executed once, PrimaryCompleteError propagated to next, req & res restored', async () => {
    const compSpy: TransactionCompensation = vi.fn(async () => {});
    const txStorage = { name: 'txStorage' } as unknown as TransactionalStorage;

    const mockTransactionalStorage: TransactionalStorage = {
      executor: {} as DatabaseExecutor,
      withTransaction: async <T>(
        fn: (tStorage: TransactionalStorage, tx: DatabaseExecutor) => Promise<T>,
      ): Promise<T> => {
        return await fn(txStorage, {} as DatabaseExecutor);
      },
    } as unknown as TransactionalStorage;

    mockReq.storage = mockTransactionalStorage;

    vi.mocked(claimTx).mockResolvedValue({ type: 'claimed', token: 'token-abc' });
    vi.mocked(completeTx).mockRejectedValue(new Error('PrimaryCompleteError'));

    const handler = async (req: Request, res: Response) => {
      registerTransactionCompensation(req, compSpy);
      res.status(201).json({ id: '1' });
    };

    const middleware = idempotent(handler);
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(compSpy).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'PrimaryCompleteError' }),
    );
    expect(mockReq.storage).toBe(mockTransactionalStorage);
    expect(mockReq.transactionCompensations).toBeUndefined();
    expect(typeof mockRes.json).toBe('function');
  });

  it('3. Commit failure: withTransaction throws PrimaryCommitError after handler -> compensation executed once, PrimaryCommitError preserved, req & res restored', async () => {
    const compSpy: TransactionCompensation = vi.fn(async () => {});
    const txStorage = { name: 'txStorage' } as unknown as TransactionalStorage;

    const mockFailingTransactionalStorage: TransactionalStorage = {
      executor: {} as DatabaseExecutor,
      withTransaction: async <T>(
        fn: (tStorage: TransactionalStorage, tx: DatabaseExecutor) => Promise<T>,
      ): Promise<T> => {
        await fn(txStorage, {} as DatabaseExecutor);
        throw new Error('PrimaryCommitError');
      },
    } as unknown as TransactionalStorage;

    mockReq.storage = mockFailingTransactionalStorage;

    vi.mocked(claimTx).mockResolvedValue({ type: 'claimed', token: 'token-abc' });
    vi.mocked(completeTx).mockResolvedValue();

    const handler = async (req: Request, res: Response) => {
      registerTransactionCompensation(req, compSpy);
      res.status(201).json({ id: '1' });
    };

    const middleware = idempotent(handler);
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(compSpy).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'PrimaryCommitError' }),
    );
    expect(mockReq.storage).toBe(mockFailingTransactionalStorage);
    expect(mockReq.transactionCompensations).toBeUndefined();
    expect(typeof mockRes.json).toBe('function');
  });

  it('4. Compensation failure: primary error occurs, compensation throws CleanupError -> primary error preserved, CleanupError logged', async () => {
    const failingCompSpy: TransactionCompensation = vi.fn(async () => {
      throw new Error('CleanupError: S3 delete failed');
    });

    const mockFailingTransactionalStorage: TransactionalStorage = {
      executor: {} as DatabaseExecutor,
      withTransaction: async <T>(
        fn: (tStorage: TransactionalStorage, tx: DatabaseExecutor) => Promise<T>,
      ): Promise<T> => {
        await fn({} as unknown as TransactionalStorage, {} as DatabaseExecutor);
        throw new Error('PrimaryDBError: Foreign Key Violation');
      },
    } as unknown as TransactionalStorage;

    mockReq.storage = mockFailingTransactionalStorage;

    vi.mocked(claimTx).mockResolvedValue({ type: 'claimed', token: 'token-abc' });

    const handler = async (req: Request, res: Response) => {
      registerTransactionCompensation(req, failingCompSpy);
      res.status(200).json({ ok: true });
    };

    const middleware = idempotent(handler);
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(failingCompSpy).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'PrimaryDBError: Foreign Key Violation' }),
    );
  });

  it('5. Reverse order: compensations A, B, C executed in LIFO order C -> B -> A upon failure', async () => {
    const order: string[] = [];

    const compA: TransactionCompensation = async () => {
      order.push('A');
    };
    const compB: TransactionCompensation = async () => {
      order.push('B');
    };
    const compC: TransactionCompensation = async () => {
      order.push('C');
    };

    const compensations = [compA, compB, compC];
    await runTransactionCompensations(compensations, new Error('Primary error'));

    expect(order).toEqual(['C', 'B', 'A']);
  });

  it('6. No active context: registerTransactionCompensation outside active transactional operation throws clear error', () => {
    const req: Partial<Request> = { transactionCompensations: undefined };
    expect(() => registerTransactionCompensation(req as Request, async () => {})).toThrow(
      'registerTransactionCompensation debe llamarse dentro de una operación transaccional activa',
    );
  });
});
