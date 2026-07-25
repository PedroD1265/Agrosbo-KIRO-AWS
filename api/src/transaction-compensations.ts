import type { Request } from 'express';
import { createLogger } from './logger.js';

const compensationLog = createLogger('compensations');

export type TransactionCompensation = () => Promise<void>;

declare module 'express-serve-static-core' {
  interface Request {
    transactionCompensations?: TransactionCompensation[];
  }
}

export function registerTransactionCompensation(
  req: Request,
  compensation: TransactionCompensation,
): void {
  if (!req.transactionCompensations) {
    throw new Error(
      'registerTransactionCompensation debe llamarse dentro de una operación transaccional activa',
    );
  }
  req.transactionCompensations.push(compensation);
}

export async function runTransactionCompensations(
  compensations: TransactionCompensation[],
  primaryError: unknown,
): Promise<void> {
  if (!compensations || compensations.length === 0) return;

  for (let i = compensations.length - 1; i >= 0; i--) {
    const fn = compensations[i];
    try {
      await fn();
    } catch (cleanupErr) {
      compensationLog.error('Error en compensación transaccional', {
        primaryError: primaryError instanceof Error ? primaryError.message : String(primaryError),
        cleanupErr: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
      });
    }
  }
}
