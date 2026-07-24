/**
 * Sync service: processes a batch of offline operations.
 * - Orders by dependencies (topological sort).
 * - Uses a short transaction per operation (not one for the whole batch).
 * - Idempotent by client_op_id.
 * - Reconciles temp_entity_id -> server_entity_id.
 * - Isolated failures: a failed op does not revert independent confirmed ops.
 * - Dependent ops are skipped if their parent failed.
 * - Detects possible harvest duplicates (provisional rule).
 * DISPOSABLE.
 */
import { SyncBatch, SyncResult, OperationResult, SyncOperation } from '../domain/types.js';
import { sortByDependencies } from '../domain/dependency-sort.js';
import { buildHarvestDuplicateKey } from '../domain/duplicate-detection.js';
import { validateSyncOperation } from '../domain/validation.js';
import { SyncRepository } from '../adapters/repository.js';
import { StorageAdapter } from '../adapters/storage.js';

const DEFAULT_COOPERATIVE_ID = '00000000-0000-0000-0000-000000000001';

export class SyncService {
  constructor(
    private repo: SyncRepository,
    private storage: StorageAdapter,
  ) {}

  async processBatch(batch: SyncBatch): Promise<SyncResult> {
    // Validate all operations before processing
    for (const op of batch.operations) {
      const errors = validateSyncOperation(op);
      if (errors.length > 0) {
        throw new Error(
          `Validation failed for op ${op.client_op_id}: ${errors.map((e) => e.message).join(', ')}`,
        );
      }
    }

    const sorted = sortByDependencies(batch.operations);
    const reconciliationMap: Record<string, string> = {};
    const results: OperationResult[] = [];
    const failedOpIds = new Set<string>();

    for (const op of sorted) {
      // Check if any dependency failed -> skip
      const depFailed = op.dependency_op_ids.some((depId) => failedOpIds.has(depId));
      if (depFailed) {
        failedOpIds.add(op.client_op_id);
        results.push({
          client_op_id: op.client_op_id,
          status: 'skipped_dep_failed',
          error: 'Dependency operation failed',
        });
        continue;
      }

      // Idempotency check
      const existing = await this.repo.findByClientOpId(op.client_op_id);
      if (existing) {
        // Already processed — return cached result (no-op)
        if (existing.resolved_entity_id) {
          reconciliationMap[op.temp_entity_id] = existing.resolved_entity_id;
        }
        results.push({
          client_op_id: op.client_op_id,
          status: existing.status as 'applied' | 'failed' | 'possible_duplicate',
          server_entity_id: existing.resolved_entity_id || undefined,
        });
        continue;
      }

      // Process the operation in its own short transaction
      const result = await this.processOperation(op, batch.device_id, reconciliationMap);
      results.push(result);

      if (result.status === 'applied' && result.server_entity_id) {
        reconciliationMap[op.temp_entity_id] = result.server_entity_id;
      } else if (result.status === 'failed' || result.status === 'skipped_dep_failed') {
        failedOpIds.add(op.client_op_id);
      }
    }

    return { reconciliation_map: reconciliationMap, results };
  }

  private async processOperation(
    op: SyncOperation,
    deviceId: string,
    reconciliationMap: Record<string, string>,
  ): Promise<OperationResult> {
    try {
      await this.repo.beginTransaction();

      // For harvests, check duplicates BEFORE creating
      if (op.operation_type === 'create_harvest') {
        const isDuplicate = await this.checkHarvestDuplicate(op, reconciliationMap);
        if (isDuplicate) {
          await this.repo.rollback();
          await this.repo.recordDuplicate({
            clientOpId: op.client_op_id,
            deviceId,
            operationType: op.operation_type,
            tempEntityId: op.temp_entity_id,
          });
          return {
            client_op_id: op.client_op_id,
            status: 'possible_duplicate',
          };
        }
      }

      const serverId = await this.executeOperation(op, reconciliationMap);

      await this.repo.recordApplied({
        clientOpId: op.client_op_id,
        deviceId,
        operationType: op.operation_type,
        tempEntityId: op.temp_entity_id,
        resolvedEntityId: serverId,
      });

      await this.repo.commit();

      return {
        client_op_id: op.client_op_id,
        status: 'applied',
        server_entity_id: serverId,
      };
    } catch (error) {
      await this.repo.rollback();

      // Record the failure
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.repo.recordFailed({
        clientOpId: op.client_op_id,
        deviceId,
        operationType: op.operation_type,
        tempEntityId: op.temp_entity_id,
        errorMessage: errorMsg,
      });

      return {
        client_op_id: op.client_op_id,
        status: 'failed',
        error: errorMsg,
      };
    }
  }

  private async executeOperation(
    op: SyncOperation,
    reconciliationMap: Record<string, string>,
  ): Promise<string> {
    const payload = op.payload;

    switch (op.operation_type) {
      case 'create_producer':
        return await this.repo.createProducer({
          name: payload.name as string,
          externalRef: payload.external_ref as string | undefined,
        });

      case 'create_parcel': {
        const producerId = this.resolveId(payload.producer_id as string, reconciliationMap);
        return await this.repo.createParcel({
          producerId,
          name: payload.name as string,
          gpsLat: payload.gps_lat as number | undefined,
          gpsLng: payload.gps_lng as number | undefined,
        });
      }

      case 'create_harvest': {
        const producerId = this.resolveId(payload.producer_id as string, reconciliationMap);
        const parcelId = this.resolveId(payload.parcel_id as string, reconciliationMap);
        return await this.repo.createHarvest({
          cooperativeId: (payload.cooperative_id as string) || DEFAULT_COOPERATIVE_ID,
          producerId,
          parcelId,
          productState: (payload.product_state as string) || 'cereza',
          quantityKg: payload.quantity_kg as number,
          harvestedDate: payload.harvested_date as string,
        });
      }

      default:
        throw new Error(`Unknown operation type: ${op.operation_type}`);
    }
  }

  /**
   * Resolve a temp_entity_id to a server_entity_id using the reconciliation map.
   * If it's already a UUID that's not in the map, return as-is (might be a pre-existing entity).
   */
  private resolveId(id: string, reconciliationMap: Record<string, string>): string {
    return reconciliationMap[id] || id;
  }

  /**
   * Check if a newly created harvest is a possible duplicate.
   * Uses the provisional 6-field rule. Does NOT count the harvest just created
   * (checks for pre-existing ones with same key).
   */
  private async checkHarvestDuplicate(
    op: SyncOperation,
    reconciliationMap: Record<string, string>,
  ): Promise<boolean> {
    const payload = op.payload;
    const producerId = this.resolveId(payload.producer_id as string, reconciliationMap);
    const parcelId = this.resolveId(payload.parcel_id as string, reconciliationMap);

    const key = buildHarvestDuplicateKey(
      (payload.cooperative_id as string) || DEFAULT_COOPERATIVE_ID,
      producerId,
      parcelId,
      (payload.product_state as string) || 'cereza',
      payload.harvested_date as string,
      payload.quantity_kg as number,
    );

    return await this.repo.findHarvestByDuplicateKey(key);
  }

  /**
   * Process a file upload OUTSIDE the database transaction.
   * Only save metadata after successful upload.
   */
  async processFileUpload(params: {
    filename: string;
    content: Buffer;
    category: string;
    relatedEntityType: string;
    relatedEntityId: string;
  }): Promise<{ success: boolean; storageKey?: string; docId?: string }> {
    // Step 1: Upload file (OUTSIDE any DB transaction)
    const storageKey = await this.storage.upload(params.filename, params.content);

    if (!storageKey) {
      // Upload failed - file remains pending, no metadata created
      return { success: false };
    }

    // Step 2: Only AFTER successful upload, save metadata in DB
    const docId = await this.repo.saveDocumentMetadata({
      storageKey,
      filename: params.filename,
      category: params.category,
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
    });

    return { success: true, storageKey, docId };
  }
}
