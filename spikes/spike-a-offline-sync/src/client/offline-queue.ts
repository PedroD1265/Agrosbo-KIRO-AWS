/**
 * Simulates the client-side offline queue (IndexedDB in production).
 * Stores operations locally, manages status and retry attempts.
 * DISPOSABLE.
 */
import { SyncOperation, OperationStatus, OperationType, SyncBatch } from '../domain/types.js';
import { randomUUID } from 'crypto';

export class OfflineQueue {
  private operations: SyncOperation[] = [];
  private deviceId: string;

  constructor(deviceId?: string) {
    this.deviceId = deviceId || `device-${randomUUID().slice(0, 8)}`;
  }

  /**
   * Add an operation to the local queue (simulates IndexedDB write).
   */
  enqueue(params: {
    operationType: OperationType;
    payload: Record<string, unknown>;
    dependencyOpIds?: string[];
    tempEntityId?: string;
  }): SyncOperation {
    const op: SyncOperation = {
      client_op_id: randomUUID(),
      temp_entity_id: params.tempEntityId || randomUUID(),
      operation_type: params.operationType,
      payload: params.payload,
      dependency_op_ids: params.dependencyOpIds || [],
      created_at: new Date().toISOString(),
      attempts: 0,
      status: 'pending',
      last_error: null,
    };
    this.operations.push(op);
    return op;
  }

  /**
   * Get all pending operations as a batch for sync.
   */
  buildBatch(): SyncBatch {
    return {
      device_id: this.deviceId,
      operations: this.operations.filter((op) => op.status === 'pending'),
    };
  }

  /**
   * Update local operations with results from the server.
   */
  applyResults(
    results: { client_op_id: string; status: string; error?: string }[],
    reconciliationMap: Record<string, string>,
  ): void {
    for (const result of results) {
      const op = this.operations.find((o) => o.client_op_id === result.client_op_id);
      if (op) {
        op.status = result.status as OperationStatus;
        op.attempts += 1;
        if (result.error) {
          op.last_error = result.error;
        }
      }
    }

    // Update temp_entity_ids in payloads to use resolved server IDs
    for (const op of this.operations) {
      for (const [key, value] of Object.entries(op.payload)) {
        if (typeof value === 'string' && reconciliationMap[value]) {
          op.payload[key] = reconciliationMap[value];
        }
      }
    }
  }

  /**
   * Get all operations (for inspection/testing).
   */
  getAll(): SyncOperation[] {
    return [...this.operations];
  }

  /**
   * Get operations by status.
   */
  getByStatus(status: OperationStatus): SyncOperation[] {
    return this.operations.filter((op) => op.status === status);
  }

  get size(): number {
    return this.operations.length;
  }
}
