/**
 * SPIKE A - Domain types for offline sync protocol.
 * DISPOSABLE - do not promote to production without reimplementation.
 */

export type OperationType = 'create_producer' | 'create_parcel' | 'create_harvest';

export type OperationStatus = 'pending' | 'in_progress' | 'applied' | 'failed' | 'possible_duplicate';

export interface SyncOperation {
  client_op_id: string;
  temp_entity_id: string;
  operation_type: OperationType;
  payload: Record<string, unknown>;
  dependency_op_ids: string[];
  created_at: string;
  attempts: number;
  status: OperationStatus;
  last_error: string | null;
}

export interface SyncBatch {
  device_id: string;
  operations: SyncOperation[];
}

export interface ReconciliationEntry {
  temp_entity_id: string;
  server_entity_id: string;
}

export interface SyncResult {
  reconciliation_map: Record<string, string>; // temp_id -> server_id
  results: OperationResult[];
}

export interface OperationResult {
  client_op_id: string;
  status: 'applied' | 'failed' | 'possible_duplicate' | 'skipped_dep_failed';
  server_entity_id?: string;
  error?: string;
}

/**
 * Fields used for duplicate detection (provisional rule for hackathon).
 * A harvest is a possible duplicate when ALL fields match.
 */
export interface HarvestDuplicateKey {
  cooperative_id: string;
  producer_id: string;
  parcel_id: string;
  product_state: string;
  harvested_date: string;
  quantity_kg_rounded: string; // rounded to 2 decimals as string
}
