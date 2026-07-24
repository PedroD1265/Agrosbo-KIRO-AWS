/**
 * Spike A.1 - IndexedDB persistence tests using fake-indexeddb.
 * Validates that the offline queue survives instance destruction/recreation.
 *
 * Tests use the real IndexedDB API via fake-indexeddb polyfill.
 * What this proves: API correctness, persistence semantics, store/retrieve cycle.
 * What still needs browser testing: service worker integration, quota limits,
 * actual offline/online transitions, real device behavior.
 *
 * DISPOSABLE.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IdbOfflineQueue } from './client/idb-offline-queue.js';

// Reset IndexedDB between tests
beforeEach(() => {
  // fake-indexeddb resets automatically per test environment in vitest
  // but we explicitly delete the database to ensure clean state
  indexedDB.deleteDatabase('agrosbo_offline_queue');
});

describe('IndexedDB Persistence (fake-indexeddb)', () => {
  it('1. stores operations offline in IndexedDB', async () => {
    const queue = new IdbOfflineQueue('device-test-1');
    await queue.open();

    const op = await queue.enqueue({
      operationType: 'create_producer',
      payload: { name: 'Productor IDB Test' },
      tempEntityId: 'temp-prod-001',
    });

    const all = await queue.getAllOperations();
    expect(all.length).toBe(1);
    expect(all[0].client_op_id).toBe(op.client_op_id);
    expect(all[0].temp_entity_id).toBe('temp-prod-001');
    expect(all[0].status).toBe('pending');

    queue.close();
  });

  it('2-3. survives instance destruction and recreation', async () => {
    // Create queue and add operations
    const queue1 = new IdbOfflineQueue('device-persist');
    await queue1.open();

    await queue1.enqueue({
      operationType: 'create_producer',
      payload: { name: 'Productor Persistente' },
      tempEntityId: 'temp-persist-p1',
    });
    await queue1.enqueue({
      operationType: 'create_parcel',
      payload: { producer_id: 'temp-persist-p1', name: 'Parcela Persistente' },
      dependencyOpIds: [],
      tempEntityId: 'temp-persist-l1',
    });

    // Close/destroy the instance
    queue1.close();

    // Create a NEW instance - data should persist
    const queue2 = new IdbOfflineQueue('device-persist');
    await queue2.open();

    const recovered = await queue2.getAllOperations();
    expect(recovered.length).toBe(2);
    expect(recovered.find((o) => o.temp_entity_id === 'temp-persist-p1')).toBeDefined();
    expect(recovered.find((o) => o.temp_entity_id === 'temp-persist-l1')).toBeDefined();

    queue2.close();
  });

  it('5. preserves all required fields after recovery', async () => {
    const queue1 = new IdbOfflineQueue('device-fields');
    await queue1.open();

    const op = await queue1.enqueue({
      operationType: 'create_harvest',
      payload: { quantity_kg: 200, harvested_date: '2025-03-01' },
      dependencyOpIds: ['dep-op-1', 'dep-op-2'],
      tempEntityId: 'temp-harvest-fields',
    });

    queue1.close();

    const queue2 = new IdbOfflineQueue('device-fields');
    await queue2.open();

    const recovered = await queue2.getAllOperations();
    const rec = recovered[0];

    expect(rec.client_op_id).toBe(op.client_op_id);
    expect(rec.temp_entity_id).toBe('temp-harvest-fields');
    expect(rec.dependency_op_ids).toEqual(['dep-op-1', 'dep-op-2']);
    expect(rec.attempts).toBe(0);
    expect(rec.status).toBe('pending');
    expect(rec.last_error).toBeNull();
    expect(rec.operation_type).toBe('create_harvest');
    expect(rec.payload.quantity_kg).toBe(200);

    queue2.close();
  });

  it('6-7. applies reconciliation map and updates dependent references', async () => {
    const queue = new IdbOfflineQueue('device-recon');
    await queue.open();

    const prodOp = await queue.enqueue({
      operationType: 'create_producer',
      payload: { name: 'Productor Recon' },
      tempEntityId: 'temp-recon-prod',
    });
    await queue.enqueue({
      operationType: 'create_parcel',
      payload: { producer_id: 'temp-recon-prod', name: 'Parcela Recon' },
      dependencyOpIds: [prodOp.client_op_id],
      tempEntityId: 'temp-recon-parcel',
    });

    // Simulate sync results
    const reconciliationMap = {
      'temp-recon-prod': 'aaaaaaaa-1111-2222-3333-444444444444',
      'temp-recon-parcel': 'bbbbbbbb-1111-2222-3333-444444444444',
    };

    await queue.applyResults(
      [
        { client_op_id: prodOp.client_op_id, status: 'applied' },
        { client_op_id: (await queue.getAllOperations())[1].client_op_id, status: 'applied' },
      ],
      reconciliationMap,
    );

    const updated = await queue.getAllOperations();
    const parcelOp = updated.find((o) => o.temp_entity_id === 'temp-recon-parcel');

    // The parcel's producer_id reference should now point to the real server ID
    expect(parcelOp!.payload.producer_id).toBe('aaaaaaaa-1111-2222-3333-444444444444');
    expect(parcelOp!.status).toBe('applied');

    queue.close();
  });

  it('8. archives only after confirmation, not before', async () => {
    const queue = new IdbOfflineQueue('device-archive');
    await queue.open();

    const op = await queue.enqueue({
      operationType: 'create_producer',
      payload: { name: 'Productor Archive' },
    });

    // Try to archive while still pending — should fail
    const archiveBeforeConfirm = await queue.archiveConfirmed(op.client_op_id);
    expect(archiveBeforeConfirm).toBe(false);

    let all = await queue.getAllOperations();
    expect(all.length).toBe(1); // Still there

    // Mark as applied
    await queue.applyResults([{ client_op_id: op.client_op_id, status: 'applied' }], {});

    // Now archive — should succeed
    const archiveAfterConfirm = await queue.archiveConfirmed(op.client_op_id);
    expect(archiveAfterConfirm).toBe(true);

    all = await queue.getAllOperations();
    expect(all.length).toBe(0); // Removed

    queue.close();
  });

  it('9. keeps failed operations for retry', async () => {
    const queue = new IdbOfflineQueue('device-retry');
    await queue.open();

    const op = await queue.enqueue({
      operationType: 'create_parcel',
      payload: { producer_id: 'nonexistent', name: 'Will Fail' },
    });

    // Simulate failure
    await queue.applyResults(
      [{ client_op_id: op.client_op_id, status: 'failed', error: 'FK violation' }],
      {},
    );

    const failed = await queue.getByStatus('failed');
    expect(failed.length).toBe(1);
    expect(failed[0].last_error).toBe('FK violation');
    expect(failed[0].attempts).toBe(1);

    // Try archiving a failed op — should refuse
    const archived = await queue.archiveConfirmed(op.client_op_id);
    expect(archived).toBe(false);

    // Still in queue for retry
    const all = await queue.getAllOperations();
    expect(all.length).toBe(1);

    queue.close();
  });

  it('10. preserves pending blobs and their relationship to operations', async () => {
    const queue = new IdbOfflineQueue('device-blobs');
    await queue.open();

    const op = await queue.enqueue({
      operationType: 'create_producer',
      payload: { name: 'Productor con Foto' },
      tempEntityId: 'temp-blob-prod',
    });

    // Add a pending blob linked to this operation
    const content = new TextEncoder().encode('fake photo data').buffer;
    const blob = await queue.addPendingBlob({
      operationClientOpId: op.client_op_id,
      filename: 'foto_parcela.jpg',
      content,
    });

    expect(blob.status).toBe('pending');
    expect(blob.storageKey).toBeNull();

    // Close and reopen
    queue.close();
    const queue2 = new IdbOfflineQueue('device-blobs');
    await queue2.open();

    // Blobs persist
    const recoveredBlobs = await queue2.getPendingBlobsForOp(op.client_op_id);
    expect(recoveredBlobs.length).toBe(1);
    expect(recoveredBlobs[0].filename).toBe('foto_parcela.jpg');
    expect(recoveredBlobs[0].status).toBe('pending');
    expect(recoveredBlobs[0].operationClientOpId).toBe(op.client_op_id);

    // Mark blob as uploaded
    await queue2.markBlobUploaded(blob.id, 'spike-uploads/12345-foto_parcela.jpg');

    const updatedBlobs = await queue2.getPendingBlobsForOp(op.client_op_id);
    expect(updatedBlobs[0].status).toBe('uploaded');
    expect(updatedBlobs[0].storageKey).toBe('spike-uploads/12345-foto_parcela.jpg');

    queue2.close();
  });
});
