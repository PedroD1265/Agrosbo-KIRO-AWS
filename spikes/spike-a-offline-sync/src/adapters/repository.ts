/**
 * Repository interface for sync persistence.
 * Separates domain logic from DB implementation.
 * A future Data API adapter can implement this interface without changing domain.
 * DISPOSABLE.
 */
import { HarvestDuplicateKey } from '../domain/types.js';

export interface SyncRepository {
  /** Check if a client_op_id was already processed (idempotency). */
  findByClientOpId(
    clientOpId: string,
  ): Promise<{ status: string; resolved_entity_id: string | null } | null>;

  /** Record a sync operation as applied. */
  recordApplied(params: {
    clientOpId: string;
    deviceId: string;
    operationType: string;
    tempEntityId: string;
    resolvedEntityId: string;
  }): Promise<void>;

  /** Record a sync operation as failed. */
  recordFailed(params: {
    clientOpId: string;
    deviceId: string;
    operationType: string;
    tempEntityId: string;
    errorMessage: string;
  }): Promise<void>;

  /** Record a sync operation as possible_duplicate. */
  recordDuplicate(params: {
    clientOpId: string;
    deviceId: string;
    operationType: string;
    tempEntityId: string;
  }): Promise<void>;

  /** Create a producer and return server id. */
  createProducer(params: { name: string; externalRef?: string }): Promise<string>;

  /** Create a parcel and return server id. */
  createParcel(params: {
    producerId: string;
    name: string;
    gpsLat?: number;
    gpsLng?: number;
  }): Promise<string>;

  /** Create a harvest and return server id. */
  createHarvest(params: {
    cooperativeId: string;
    producerId: string;
    parcelId: string;
    productState: string;
    quantityKg: number;
    harvestedDate: string;
  }): Promise<string>;

  /** Check for existing harvests matching the duplicate key. */
  findHarvestByDuplicateKey(key: HarvestDuplicateKey): Promise<boolean>;

  /** Save document metadata (after file upload). */
  saveDocumentMetadata(params: {
    storageKey: string;
    filename: string;
    category: string;
    relatedEntityType: string;
    relatedEntityId: string;
  }): Promise<string>;

  /** Begin a short transaction. */
  beginTransaction(): Promise<void>;

  /** Commit current transaction. */
  commit(): Promise<void>;

  /** Rollback current transaction. */
  rollback(): Promise<void>;
}
