/**
 * IndexedDB-backed offline queue.
 * Uses the real IndexedDB API (works in browser; fake-indexeddb for tests in Node).
 * Demonstrates persistence across queue instance destruction and recreation.
 * DISPOSABLE.
 */
import { SyncOperation, OperationStatus, OperationType, SyncBatch } from '../domain/types.js';
import { randomUUID } from 'crypto';

const DB_NAME = 'agrosbo_offline_queue';
const DB_VERSION = 1;
const STORE_OPS = 'operations';
const STORE_BLOBS = 'pending_blobs';

export interface PendingBlob {
  id: string;
  operationClientOpId: string;
  filename: string;
  content: ArrayBuffer;
  status: 'pending' | 'uploaded';
  storageKey: string | null;
}

export class IdbOfflineQueue {
  private db: IDBDatabase | null = null;
  private deviceId: string;

  constructor(deviceId?: string) {
    this.deviceId = deviceId || `device-${randomUUID().slice(0, 8)}`;
  }

  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_OPS)) {
          const store = db.createObjectStore(STORE_OPS, { keyPath: 'client_op_id' });
          store.createIndex('by_status', 'status', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_BLOBS)) {
          const blobStore = db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
          blobStore.createIndex('by_op', 'operationClientOpId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private getDb(): IDBDatabase {
    if (!this.db) throw new Error('Database not open. Call open() first.');
    return this.db;
  }

  /**
   * Enqueue an operation into IndexedDB.
   */
  async enqueue(params: {
    operationType: OperationType;
    payload: Record<string, unknown>;
    dependencyOpIds?: string[];
    tempEntityId?: string;
  }): Promise<SyncOperation> {
    const op: SyncOperation = {
      client_op_id: randomUUID(),
      temp_entity_id: params.tempEntityId || `temp-${randomUUID().slice(0, 12)}`,
      operation_type: params.operationType,
      payload: params.payload,
      dependency_op_ids: params.dependencyOpIds || [],
      created_at: new Date().toISOString(),
      attempts: 0,
      status: 'pending',
      last_error: null,
    };

    await this.put(STORE_OPS, op);
    return op;
  }

  /**
   * Add a pending blob linked to an operation.
   */
  async addPendingBlob(params: {
    operationClientOpId: string;
    filename: string;
    content: ArrayBuffer;
  }): Promise<PendingBlob> {
    const blob: PendingBlob = {
      id: randomUUID(),
      operationClientOpId: params.operationClientOpId,
      filename: params.filename,
      content: params.content,
      status: 'pending',
      storageKey: null,
    };
    await this.put(STORE_BLOBS, blob);
    return blob;
  }

  /**
   * Get all pending operations as a batch.
   */
  async buildBatch(): Promise<SyncBatch> {
    const all = await this.getAll(STORE_OPS);
    const pending = all.filter((op: SyncOperation) => op.status === 'pending');
    return { device_id: this.deviceId, operations: pending };
  }

  /**
   * Get all operations (any status).
   */
  async getAllOperations(): Promise<SyncOperation[]> {
    return this.getAll(STORE_OPS);
  }

  /**
   * Get pending blobs for an operation.
   */
  async getPendingBlobsForOp(clientOpId: string): Promise<PendingBlob[]> {
    const all = await this.getAll(STORE_BLOBS);
    return all.filter((b: PendingBlob) => b.operationClientOpId === clientOpId);
  }

  /**
   * Apply sync results: update statuses and reconcile temp_ids.
   */
  async applyResults(
    results: { client_op_id: string; status: string; error?: string }[],
    reconciliationMap: Record<string, string>,
  ): Promise<void> {
    const allOps = await this.getAll(STORE_OPS);

    for (const op of allOps) {
      const result = results.find((r) => r.client_op_id === op.client_op_id);
      if (result) {
        op.status = result.status as OperationStatus;
        op.attempts += 1;
        if (result.error) {
          op.last_error = result.error;
        }
      }

      // Update payload references with reconciled IDs
      for (const [key, value] of Object.entries(op.payload)) {
        if (typeof value === 'string' && reconciliationMap[value]) {
          op.payload[key] = reconciliationMap[value];
        }
      }

      await this.put(STORE_OPS, op);
    }
  }

  /**
   * Mark a blob as uploaded with its storage key.
   */
  async markBlobUploaded(blobId: string, storageKey: string): Promise<void> {
    const blob = await this.get(STORE_BLOBS, blobId);
    if (blob) {
      blob.status = 'uploaded';
      blob.storageKey = storageKey;
      await this.put(STORE_BLOBS, blob);
    }
  }

  /**
   * Remove an operation ONLY after it's been confirmed applied.
   * Failed operations stay for retry.
   */
  async archiveConfirmed(clientOpId: string): Promise<boolean> {
    const op = await this.get(STORE_OPS, clientOpId);
    if (!op || op.status !== 'applied') {
      return false; // Only archive confirmed ops
    }
    await this.delete(STORE_OPS, clientOpId);
    return true;
  }

  /**
   * Get operations by status.
   */
  async getByStatus(status: OperationStatus): Promise<SyncOperation[]> {
    const all = await this.getAll(STORE_OPS);
    return all.filter((op: SyncOperation) => op.status === status);
  }

  // --- Private IDB helpers ---

  private put(storeName: string, value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.getDb().transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private get(storeName: string, key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const tx = this.getDb().transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  private getAll(storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const tx = this.getDb().transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private delete(storeName: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.getDb().transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
