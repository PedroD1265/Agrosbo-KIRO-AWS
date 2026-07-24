/**
 * PostgreSQL local adapter implementing SyncRepository.
 * Uses pg (node-postgres) against Docker local instance.
 * DISPOSABLE - a future Data API adapter would replace this.
 */
import pg from 'pg';
import { SyncRepository } from './repository.js';
import { HarvestDuplicateKey } from '../domain/types.js';

const { Pool } = pg;

export class PgLocalRepository implements SyncRepository {
  private pool: pg.Pool;
  private client: pg.PoolClient | null = null;

  constructor(connectionString?: string) {
    this.pool = new Pool({
      connectionString:
        connectionString || 'postgresql://spike:spike_local_only@127.0.0.1:54320/agrosbo_spike',
    });
  }

  async beginTransaction(): Promise<void> {
    this.client = await this.pool.connect();
    await this.client.query('BEGIN');
  }

  async commit(): Promise<void> {
    if (!this.client) throw new Error('No active transaction');
    await this.client.query('COMMIT');
    this.client.release();
    this.client = null;
  }

  async rollback(): Promise<void> {
    if (!this.client) throw new Error('No active transaction');
    await this.client.query('ROLLBACK');
    this.client.release();
    this.client = null;
  }

  private getClient(): pg.PoolClient | pg.Pool {
    return this.client || this.pool;
  }

  async findByClientOpId(clientOpId: string) {
    const result = await this.getClient().query(
      'SELECT status, resolved_entity_id FROM sync_operation WHERE client_op_id = $1',
      [clientOpId],
    );
    if (result.rows.length === 0) return null;
    return { status: result.rows[0].status, resolved_entity_id: result.rows[0].resolved_entity_id };
  }

  async recordApplied(params: {
    clientOpId: string;
    deviceId: string;
    operationType: string;
    tempEntityId: string;
    resolvedEntityId: string;
  }): Promise<void> {
    await this.getClient().query(
      `INSERT INTO sync_operation (client_op_id, device_id, operation_type, temp_entity_id, resolved_entity_id, status)
       VALUES ($1, $2, $3, $4, $5, 'applied')
       ON CONFLICT (client_op_id) DO NOTHING`,
      [params.clientOpId, params.deviceId, params.operationType, params.tempEntityId, params.resolvedEntityId],
    );
  }

  async recordFailed(params: {
    clientOpId: string;
    deviceId: string;
    operationType: string;
    tempEntityId: string;
    errorMessage: string;
  }): Promise<void> {
    await this.getClient().query(
      `INSERT INTO sync_operation (client_op_id, device_id, operation_type, temp_entity_id, status, error_message)
       VALUES ($1, $2, $3, $4, 'failed', $5)
       ON CONFLICT (client_op_id) DO NOTHING`,
      [params.clientOpId, params.deviceId, params.operationType, params.tempEntityId, params.errorMessage],
    );
  }

  async recordDuplicate(params: {
    clientOpId: string;
    deviceId: string;
    operationType: string;
    tempEntityId: string;
  }): Promise<void> {
    await this.getClient().query(
      `INSERT INTO sync_operation (client_op_id, device_id, operation_type, temp_entity_id, status)
       VALUES ($1, $2, $3, $4, 'possible_duplicate')
       ON CONFLICT (client_op_id) DO NOTHING`,
      [params.clientOpId, params.deviceId, params.operationType, params.tempEntityId],
    );
  }

  async createProducer(params: { name: string; externalRef?: string }): Promise<string> {
    const result = await this.getClient().query(
      'INSERT INTO producer (name, external_ref) VALUES ($1, $2) RETURNING id',
      [params.name, params.externalRef || null],
    );
    return result.rows[0].id;
  }

  async createParcel(params: {
    producerId: string;
    name: string;
    gpsLat?: number;
    gpsLng?: number;
  }): Promise<string> {
    const result = await this.getClient().query(
      'INSERT INTO parcel (producer_id, name, gps_lat, gps_lng) VALUES ($1, $2, $3, $4) RETURNING id',
      [params.producerId, params.name, params.gpsLat || null, params.gpsLng || null],
    );
    return result.rows[0].id;
  }

  async createHarvest(params: {
    cooperativeId: string;
    producerId: string;
    parcelId: string;
    productState: string;
    quantityKg: number;
    harvestedDate: string;
  }): Promise<string> {
    const result = await this.getClient().query(
      `INSERT INTO harvest (cooperative_id, producer_id, parcel_id, product_state, quantity_kg, harvested_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        params.cooperativeId,
        params.producerId,
        params.parcelId,
        params.productState,
        params.quantityKg,
        params.harvestedDate,
      ],
    );
    return result.rows[0].id;
  }

  async findHarvestByDuplicateKey(key: HarvestDuplicateKey): Promise<boolean> {
    const result = await this.getClient().query(
      `SELECT 1 FROM harvest
       WHERE cooperative_id = $1
         AND producer_id = $2
         AND parcel_id = $3
         AND product_state = $4
         AND harvested_date = $5
         AND ROUND(quantity_kg, 2) = $6
       LIMIT 1`,
      [
        key.cooperative_id,
        key.producer_id,
        key.parcel_id,
        key.product_state,
        key.harvested_date,
        key.quantity_kg_rounded,
      ],
    );
    return result.rows.length > 0;
  }

  async saveDocumentMetadata(params: {
    storageKey: string;
    filename: string;
    category: string;
    relatedEntityType: string;
    relatedEntityId: string;
  }): Promise<string> {
    const result = await this.getClient().query(
      `INSERT INTO document_metadata (storage_key, filename, category, related_entity_type, related_entity_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [params.storageKey, params.filename, params.category, params.relatedEntityType, params.relatedEntityId],
    );
    return result.rows[0].id;
  }

  async cleanup(): Promise<void> {
    await this.pool.end();
  }
}
