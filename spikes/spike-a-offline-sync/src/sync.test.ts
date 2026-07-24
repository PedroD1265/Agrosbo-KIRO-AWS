/**
 * Spike A - Offline Sync integration tests.
 * Requires Docker PostgreSQL running on port 5433.
 * Run: npm run db:up (from spikes/spike-a-offline-sync)
 *
 * Tests validate:
 * 1. Topological ordering of dependencies
 * 2. Idempotency by client_op_id
 * 3. temp_id reconciliation
 * 4. Dependencies replaced by real IDs
 * 5. Retry without duplicates
 * 6. Isolated failure of independent operations
 * 7. Dependent operation blocked when parent fails
 * 8. Possible duplicate marked
 * 9. No automatic fusion
 * 10. File upload outside transaction
 * 11. Metadata not created if upload fails
 * 12. Transaction rolled back when inseparable operation fails
 * 13. Synthetic data, no PII
 *
 * DISPOSABLE.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { PgLocalRepository } from './adapters/pg-local-repository.js';
import { FakeLocalStorage } from './adapters/storage.js';
import { SyncService } from './service/sync-service.js';
import { OfflineQueue } from './client/offline-queue.js';
import { sortByDependencies } from './domain/dependency-sort.js';
import { SyncBatch } from './domain/types.js';

const { Pool } = pg;
const CONNECTION = 'postgresql://spike:spike_local_only@127.0.0.1:54320/agrosbo_spike';

let pool: pg.Pool;
let repo: PgLocalRepository;
let storage: FakeLocalStorage;
let service: SyncService;

beforeAll(async () => {
  pool = new Pool({ connectionString: CONNECTION });
  // Wait for connection
  await pool.query('SELECT 1');
});

afterAll(async () => {
  if (repo) await repo.cleanup();
  await pool.end();
});

beforeEach(async () => {
  // Clean all tables between tests
  await pool.query('TRUNCATE sync_operation, document_metadata, harvest, parcel, producer CASCADE');
  repo = new PgLocalRepository(CONNECTION);
  storage = new FakeLocalStorage();
  service = new SyncService(repo, storage);
});

describe('1. Topological ordering of dependencies', () => {
  it('sorts operations respecting dependency_op_ids', () => {
    const ops = [
      {
        client_op_id: 'op-harvest',
        temp_entity_id: 'h1',
        operation_type: 'create_harvest' as const,
        payload: {},
        dependency_op_ids: ['op-parcel'],
        created_at: new Date().toISOString(),
        attempts: 0,
        status: 'pending' as const,
        last_error: null,
      },
      {
        client_op_id: 'op-producer',
        temp_entity_id: 'p1',
        operation_type: 'create_producer' as const,
        payload: {},
        dependency_op_ids: [],
        created_at: new Date().toISOString(),
        attempts: 0,
        status: 'pending' as const,
        last_error: null,
      },
      {
        client_op_id: 'op-parcel',
        temp_entity_id: 'l1',
        operation_type: 'create_parcel' as const,
        payload: {},
        dependency_op_ids: ['op-producer'],
        created_at: new Date().toISOString(),
        attempts: 0,
        status: 'pending' as const,
        last_error: null,
      },
    ];

    const sorted = sortByDependencies(ops);
    const order = sorted.map((o) => o.client_op_id);

    expect(order.indexOf('op-producer')).toBeLessThan(order.indexOf('op-parcel'));
    expect(order.indexOf('op-parcel')).toBeLessThan(order.indexOf('op-harvest'));
  });
});

describe('2. Idempotency by client_op_id', () => {
  it('reprocessing same batch returns same result without creating duplicates', async () => {
    const queue = new OfflineQueue();
    const prodOp = queue.enqueue({
      operationType: 'create_producer',
      payload: { name: 'Productor Sintético A' },
    });

    const batch = queue.buildBatch();
    const result1 = await service.processBatch(batch);
    const result2 = await service.processBatch(batch);

    // Same server ID returned both times
    expect(result1.reconciliation_map[prodOp.temp_entity_id]).toBeDefined();
    expect(result2.reconciliation_map[prodOp.temp_entity_id]).toBe(
      result1.reconciliation_map[prodOp.temp_entity_id],
    );

    // Only one producer in DB
    const count = await pool.query('SELECT count(*) FROM producer');
    expect(parseInt(count.rows[0].count)).toBe(1);
  });
});

describe('3. temp_id reconciliation', () => {
  it('returns reconciliation_map with temp_id -> server_id', async () => {
    const queue = new OfflineQueue();
    const prodOp = queue.enqueue({
      operationType: 'create_producer',
      payload: { name: 'Productor Test' },
    });

    const batch = queue.buildBatch();
    const result = await service.processBatch(batch);

    expect(result.reconciliation_map[prodOp.temp_entity_id]).toBeDefined();
    expect(result.reconciliation_map[prodOp.temp_entity_id]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe('4. Dependencies replaced by real IDs', () => {
  it('parcel references real producer_id after reconciliation', async () => {
    const queue = new OfflineQueue();
    const prodOp = queue.enqueue({
      operationType: 'create_producer',
      payload: { name: 'Productor Dependencia' },
    });
    queue.enqueue({
      operationType: 'create_parcel',
      payload: {
        producer_id: prodOp.temp_entity_id,
        name: 'Parcela Test',
        gps_lat: 14.5,
        gps_lng: -90.3,
      },
      dependencyOpIds: [prodOp.client_op_id],
      tempEntityId: 'parcel-temp-1',
    });

    const batch = queue.buildBatch();
    const result = await service.processBatch(batch);

    const realProducerId = result.reconciliation_map[prodOp.temp_entity_id];
    const realParcelId = result.reconciliation_map['parcel-temp-1'];

    // Verify parcel references the real producer in DB
    const parcelRow = await pool.query('SELECT producer_id FROM parcel WHERE id = $1', [
      realParcelId,
    ]);
    expect(parcelRow.rows[0].producer_id).toBe(realProducerId);
  });
});

describe('5. Retry without duplicates', () => {
  it('full chain P->L->H retried does not create extra records', async () => {
    const queue = new OfflineQueue();
    const prodOp = queue.enqueue({
      operationType: 'create_producer',
      payload: { name: 'Productor Retry' },
    });
    const parcelOp = queue.enqueue({
      operationType: 'create_parcel',
      payload: { producer_id: prodOp.temp_entity_id, name: 'Parcela Retry' },
      dependencyOpIds: [prodOp.client_op_id],
    });
    queue.enqueue({
      operationType: 'create_harvest',
      payload: {
        producer_id: prodOp.temp_entity_id,
        parcel_id: parcelOp.temp_entity_id,
        quantity_kg: 500,
        harvested_date: '2025-03-15',
        product_state: 'cereza',
      },
      dependencyOpIds: [parcelOp.client_op_id],
    });

    const batch = queue.buildBatch();
    await service.processBatch(batch);
    await service.processBatch(batch); // Retry

    const producers = await pool.query('SELECT count(*) FROM producer');
    const parcels = await pool.query('SELECT count(*) FROM parcel');
    const harvests = await pool.query('SELECT count(*) FROM harvest');

    expect(parseInt(producers.rows[0].count)).toBe(1);
    expect(parseInt(parcels.rows[0].count)).toBe(1);
    expect(parseInt(harvests.rows[0].count)).toBe(1);
  });
});

describe('6. Isolated failure of independent operations', () => {
  it('one operation failing does not revert other independent confirmed ops', async () => {
    const queue = new OfflineQueue();
    // Independent op 1 — valid producer
    queue.enqueue({
      operationType: 'create_producer',
      payload: { name: 'Productor Válido' },
    });
    // Independent op 2 — invalid parcel (references non-existent producer)
    queue.enqueue({
      operationType: 'create_parcel',
      payload: { producer_id: '00000000-0000-0000-0000-nonexistent1', name: 'Parcela Huérfana' },
    });

    const batch = queue.buildBatch();
    const result = await service.processBatch(batch);

    // First op succeeded
    const appliedOps = result.results.filter((r) => r.status === 'applied');
    const failedOps = result.results.filter((r) => r.status === 'failed');

    expect(appliedOps.length).toBe(1);
    expect(failedOps.length).toBe(1);

    // Producer persists despite the other failure
    const producers = await pool.query('SELECT count(*) FROM producer');
    expect(parseInt(producers.rows[0].count)).toBe(1);
  });
});

describe('7. Dependent operation blocked when parent fails', () => {
  it('child operation is skipped when its dependency fails', async () => {
    const queue = new OfflineQueue();
    // Parent that will fail (bad operation)
    const parentOp = queue.enqueue({
      operationType: 'create_parcel',
      payload: { producer_id: '00000000-0000-0000-0000-nonexistent2', name: 'Will Fail' },
    });
    // Child depends on parent
    queue.enqueue({
      operationType: 'create_harvest',
      payload: {
        producer_id: '00000000-0000-0000-0000-nonexistent2',
        parcel_id: parentOp.temp_entity_id,
        quantity_kg: 100,
        harvested_date: '2025-01-01',
      },
      dependencyOpIds: [parentOp.client_op_id],
    });

    const batch = queue.buildBatch();
    const result = await service.processBatch(batch);

    const parentResult = result.results.find((r) => r.client_op_id === parentOp.client_op_id);
    const childResult = result.results[1];

    expect(parentResult?.status).toBe('failed');
    expect(childResult?.status).toBe('skipped_dep_failed');

    // Nothing persisted
    const harvests = await pool.query('SELECT count(*) FROM harvest');
    expect(parseInt(harvests.rows[0].count)).toBe(0);
  });
});

describe('8. Possible duplicate marked', () => {
  it('marks a harvest as possible_duplicate when all 6 fields match', async () => {
    // First: create the prerequisite producer and parcel
    const queue1 = new OfflineQueue();
    const prodOp = queue1.enqueue({
      operationType: 'create_producer',
      payload: { name: 'Productor Dup Test' },
    });
    const parcelOp = queue1.enqueue({
      operationType: 'create_parcel',
      payload: { producer_id: prodOp.temp_entity_id, name: 'Parcela Dup' },
      dependencyOpIds: [prodOp.client_op_id],
    });
    queue1.enqueue({
      operationType: 'create_harvest',
      payload: {
        producer_id: prodOp.temp_entity_id,
        parcel_id: parcelOp.temp_entity_id,
        quantity_kg: 250.5,
        harvested_date: '2025-06-01',
        product_state: 'cereza',
      },
      dependencyOpIds: [parcelOp.client_op_id],
    });

    const batch1 = queue1.buildBatch();
    const result1 = await service.processBatch(batch1);
    const realProducerId = result1.reconciliation_map[prodOp.temp_entity_id];
    const realParcelId = result1.reconciliation_map[parcelOp.temp_entity_id];

    // Second: try to create the same harvest (same 6 fields)
    const queue2 = new OfflineQueue();
    queue2.enqueue({
      operationType: 'create_harvest',
      payload: {
        producer_id: realProducerId,
        parcel_id: realParcelId,
        quantity_kg: 250.5,
        harvested_date: '2025-06-01',
        product_state: 'cereza',
      },
    });

    const batch2 = queue2.buildBatch();
    const result2 = await service.processBatch(batch2);

    expect(result2.results[0].status).toBe('possible_duplicate');
  });
});

describe('9. No automatic fusion', () => {
  it('duplicate harvest is not merged, deleted, overwritten or rejected — only marked', async () => {
    // Setup producer + parcel + first harvest
    const queue1 = new OfflineQueue();
    const prodOp = queue1.enqueue({
      operationType: 'create_producer',
      payload: { name: 'Productor NoFusion' },
    });
    const parcelOp = queue1.enqueue({
      operationType: 'create_parcel',
      payload: { producer_id: prodOp.temp_entity_id, name: 'Parcela NoFusion' },
      dependencyOpIds: [prodOp.client_op_id],
    });
    queue1.enqueue({
      operationType: 'create_harvest',
      payload: {
        producer_id: prodOp.temp_entity_id,
        parcel_id: parcelOp.temp_entity_id,
        quantity_kg: 300,
        harvested_date: '2025-07-01',
        product_state: 'cereza',
      },
      dependencyOpIds: [parcelOp.client_op_id],
    });
    const result1 = await service.processBatch(queue1.buildBatch());
    const realProducerId = result1.reconciliation_map[prodOp.temp_entity_id];
    const realParcelId = result1.reconciliation_map[parcelOp.temp_entity_id];

    // Count before
    const beforeCount = await pool.query('SELECT count(*) FROM harvest');

    // Attempt duplicate
    const queue2 = new OfflineQueue();
    queue2.enqueue({
      operationType: 'create_harvest',
      payload: {
        producer_id: realProducerId,
        parcel_id: realParcelId,
        quantity_kg: 300,
        harvested_date: '2025-07-01',
        product_state: 'cereza',
      },
    });
    await service.processBatch(queue2.buildBatch());

    // Count after — original still exists, no extra harvest added
    const afterCount = await pool.query('SELECT count(*) FROM harvest');
    expect(parseInt(afterCount.rows[0].count)).toBe(parseInt(beforeCount.rows[0].count));

    // sync_operation recorded as possible_duplicate
    const dupOps = await pool.query(
      "SELECT * FROM sync_operation WHERE status = 'possible_duplicate'",
    );
    expect(dupOps.rows.length).toBe(1);
  });
});

describe('10. File upload outside transaction', () => {
  it('file is uploaded first, then metadata is saved separately', async () => {
    // Create a producer to reference
    const queue = new OfflineQueue();
    const prodOp = queue.enqueue({
      operationType: 'create_producer',
      payload: { name: 'Productor FileTest' },
    });
    const result = await service.processBatch(queue.buildBatch());
    const producerId = result.reconciliation_map[prodOp.temp_entity_id];

    // Upload file
    const fileResult = await service.processFileUpload({
      filename: 'certificado.pdf',
      content: Buffer.from('fake pdf content'),
      category: 'product_certificate',
      relatedEntityType: 'producer',
      relatedEntityId: producerId,
    });

    expect(fileResult.success).toBe(true);
    expect(fileResult.storageKey).toBeDefined();
    expect(fileResult.docId).toBeDefined();

    // Verify metadata in DB references the storage key
    const doc = await pool.query('SELECT storage_key FROM document_metadata WHERE id = $1', [
      fileResult.docId,
    ]);
    expect(doc.rows[0].storage_key).toBe(fileResult.storageKey);
  });
});

describe('11. Metadata not created if upload fails', () => {
  it('when file upload fails, no document_metadata row is created', async () => {
    storage.setFailMode(true);

    const fileResult = await service.processFileUpload({
      filename: 'foto_parcela.jpg',
      content: Buffer.from('fake image'),
      category: 'producer_parcel',
      relatedEntityType: 'parcel',
      relatedEntityId: '00000000-0000-0000-0000-000000000099',
    });

    expect(fileResult.success).toBe(false);
    expect(fileResult.storageKey).toBeUndefined();
    expect(fileResult.docId).toBeUndefined();

    // No metadata in DB
    const docs = await pool.query('SELECT count(*) FROM document_metadata');
    expect(parseInt(docs.rows[0].count)).toBe(0);

    storage.setFailMode(false);
  });
});

describe('12. Transaction rolled back when inseparable operation fails', () => {
  it('failed operation within its transaction does not leave partial state', async () => {
    const queue = new OfflineQueue();
    // This will fail because producer_id FK doesn't exist
    queue.enqueue({
      operationType: 'create_parcel',
      payload: { producer_id: '00000000-0000-0000-0000-doesnotexist', name: 'Parcela Fantasma' },
    });

    const batch = queue.buildBatch();
    const result = await service.processBatch(batch);

    expect(result.results[0].status).toBe('failed');

    // No partial parcel in DB
    const parcels = await pool.query('SELECT count(*) FROM parcel');
    expect(parseInt(parcels.rows[0].count)).toBe(0);

    // But the failure IS recorded in sync_operation
    const syncOps = await pool.query("SELECT * FROM sync_operation WHERE status = 'failed'");
    expect(syncOps.rows.length).toBe(1);
  });
});

describe('13. Synthetic data, no PII', () => {
  it('all test data uses synthetic names, not real PII', async () => {
    const queue = new OfflineQueue();
    const prodOp = queue.enqueue({
      operationType: 'create_producer',
      payload: { name: 'Productor Sintético Demo' },
    });
    const parcelOp = queue.enqueue({
      operationType: 'create_parcel',
      payload: { producer_id: prodOp.temp_entity_id, name: 'Parcela Sintética 1' },
      dependencyOpIds: [prodOp.client_op_id],
    });
    queue.enqueue({
      operationType: 'create_harvest',
      payload: {
        producer_id: prodOp.temp_entity_id,
        parcel_id: parcelOp.temp_entity_id,
        quantity_kg: 100,
        harvested_date: '2025-01-15',
        product_state: 'cereza',
      },
      dependencyOpIds: [parcelOp.client_op_id],
    });

    const result = await service.processBatch(queue.buildBatch());

    // All operations applied
    expect(result.results.every((r) => r.status === 'applied')).toBe(true);

    // Verify data in DB is synthetic
    const producers = await pool.query('SELECT name FROM producer');
    expect(producers.rows[0].name).toContain('Sintético');
  });
});
