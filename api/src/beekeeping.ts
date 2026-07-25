import { randomUUID } from 'node:crypto';
import { eq, desc } from 'drizzle-orm';
import { db } from './db.js';
import type { DatabaseExecutor } from './executor.js';
import {
  apiaries,
  hives,
  hiveInspections,
  honeyHarvests,
  type Apiary,
  type Hive,
  type HiveInspection,
  type HoneyHarvest,
  type InsertApiary,
  type InsertHive,
  type InsertHiveInspection,
  type InsertHoneyHarvest,
} from '@agrosbo/shared/schema.js';
import { storage, InventoryStockError, type IStorage } from './storage.js';

const rowToApiary = (r: typeof apiaries.$inferSelect): Apiary => ({
  id: r.id,
  name: r.name,
  location: r.location,
  ...(r.lat != null && { lat: r.lat }),
  ...(r.lng != null && { lng: r.lng }),
  ...(r.notes && { notes: r.notes }),
  status: r.status,
  createdAt: r.createdAt,
});
const rowToHive = (r: typeof hives.$inferSelect): Hive => ({
  id: r.id,
  apiaryId: r.apiaryId,
  code: r.code,
  status: r.status,
  queenStatus: r.queenStatus,
  colonyStrength: r.colonyStrength,
  broodLevel: r.broodLevel,
  honeyStores: r.honeyStores,
  ...(r.lastInspectionAt && { lastInspectionAt: r.lastInspectionAt }),
  ...(r.notes && { notes: r.notes }),
  createdAt: r.createdAt,
});
const rowToInspection = (r: typeof hiveInspections.$inferSelect): HiveInspection => ({
  id: r.id,
  hiveId: r.hiveId,
  inspectedAt: r.inspectedAt,
  inspector: r.inspector,
  queenSeen: r.queenSeen,
  queenStatus: r.queenStatus,
  colonyStrength: r.colonyStrength,
  broodLevel: r.broodLevel,
  honeyStores: r.honeyStores,
  ...(r.pestsOrDisease && { pestsOrDisease: r.pestsOrDisease }),
  ...(r.feedingGiven && { feedingGiven: r.feedingGiven }),
  ...(r.treatmentGiven && { treatmentGiven: r.treatmentGiven }),
  ...(r.inventoryItemId && { inventoryItemId: r.inventoryItemId }),
  ...(r.quantityUsed != null && { quantityUsed: r.quantityUsed }),
  ...(r.movementId && { movementId: r.movementId }),
  ...(r.notes && { notes: r.notes }),
  hasPhotos: r.hasPhotos,
  createdAt: r.createdAt,
});
const rowToHarvest = (r: typeof honeyHarvests.$inferSelect): HoneyHarvest => ({
  id: r.id,
  apiaryId: r.apiaryId,
  ...(r.hiveId && { hiveId: r.hiveId }),
  date: r.date,
  quantity: r.quantity,
  unit: r.unit,
  ...(r.destination && { destination: r.destination }),
  ...(r.notes && { notes: r.notes }),
  createdAt: r.createdAt,
});

export async function listApiaries(): Promise<Apiary[]> {
  if (!db) return [];
  return (await db.select().from(apiaries).orderBy(desc(apiaries.createdAt))).map(rowToApiary);
}

export async function createApiary(
  input: InsertApiary,
  executor: DatabaseExecutor,
): Promise<Apiary> {
  const id = `ap-${randomUUID().slice(0, 8)}`;
  const [row] = await executor
    .insert(apiaries)
    .values({
      id,
      name: input.name,
      location: input.location,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      notes: input.notes ?? null,
      status: input.status,
      createdAt: new Date().toISOString(),
    })
    .returning();
  return rowToApiary(row);
}

export async function listHives(): Promise<Hive[]> {
  if (!db) return [];
  return (await db.select().from(hives).orderBy(desc(hives.createdAt))).map(rowToHive);
}

export async function createHive(input: InsertHive, executor: DatabaseExecutor): Promise<Hive> {
  const id = `hv-${randomUUID().slice(0, 8)}`;
  const [row] = await executor
    .insert(hives)
    .values({
      id,
      apiaryId: input.apiaryId,
      code: input.code,
      status: input.status,
      queenStatus: input.queenStatus,
      colonyStrength: input.colonyStrength,
      broodLevel: input.broodLevel,
      honeyStores: input.honeyStores,
      notes: input.notes ?? null,
      createdAt: new Date().toISOString(),
    })
    .returning();
  return rowToHive(row);
}

export async function listInspections(hiveId?: string): Promise<HiveInspection[]> {
  if (!db) return [];
  const rows = hiveId
    ? await db
        .select()
        .from(hiveInspections)
        .where(eq(hiveInspections.hiveId, hiveId))
        .orderBy(desc(hiveInspections.inspectedAt))
    : await db.select().from(hiveInspections).orderBy(desc(hiveInspections.inspectedAt));
  return rows.map(rowToInspection);
}
export class HiveInventoryItemNotFoundError extends Error {
  constructor(id: string) {
    super(`Inventario no encontrado: ${id}`);
    this.name = 'HiveInventoryItemNotFoundError';
  }
}

export async function createInspection(
  input: InsertHiveInspection,
  opts: { storage: IStorage; executor: DatabaseExecutor },
): Promise<HiveInspection> {
  const { storage: stg, executor: dbExec } = opts;
  const id = `hi-${randomUUID().slice(0, 8)}`;
  let movementId: string | null = null;
  const wantsMovement =
    !!input.inventoryItemId && typeof input.quantityUsed === 'number' && input.quantityUsed > 0;
  if (wantsMovement) {
    const items = await stg.listInventory();
    if (!items.some((it) => it.id === input.inventoryItemId)) {
      throw new HiveInventoryItemNotFoundError(input.inventoryItemId!);
    }
    const r = await stg.createInventoryMovement({
      itemId: input.inventoryItemId!,
      delta: -input.quantityUsed!,
      note: `Inspección colmena (tratamiento/alimentación)`,
      at: input.inspectedAt,
    });
    if (!r) throw new HiveInventoryItemNotFoundError(input.inventoryItemId!);
    movementId = r.movement.id;
  }
  const [row] = await dbExec
    .insert(hiveInspections)
    .values({
      id,
      hiveId: input.hiveId,
      inspectedAt: input.inspectedAt,
      inspector: input.inspector,
      queenSeen: input.queenSeen,
      queenStatus: input.queenStatus,
      colonyStrength: input.colonyStrength,
      broodLevel: input.broodLevel,
      honeyStores: input.honeyStores,
      pestsOrDisease: input.pestsOrDisease ?? null,
      feedingGiven: input.feedingGiven ?? null,
      treatmentGiven: input.treatmentGiven ?? null,
      inventoryItemId: input.inventoryItemId ?? null,
      quantityUsed: input.quantityUsed ?? null,
      movementId,
      notes: input.notes ?? null,
      hasPhotos: input.hasPhotos,
      createdAt: new Date().toISOString(),
    })
    .returning();
  await dbExec
    .update(hives)
    .set({
      lastInspectionAt: input.inspectedAt,
      queenStatus: input.queenStatus,
      colonyStrength: input.colonyStrength,
      broodLevel: input.broodLevel,
      honeyStores: input.honeyStores,
    })
    .where(eq(hives.id, input.hiveId));
  if (!row) throw new Error('Insert returned no row');
  return rowToInspection(row);
}

void InventoryStockError;

export async function listHoneyHarvests(): Promise<HoneyHarvest[]> {
  if (!db) return [];
  return (await db.select().from(honeyHarvests).orderBy(desc(honeyHarvests.date))).map(
    rowToHarvest,
  );
}

export async function createHoneyHarvest(
  input: InsertHoneyHarvest,
  executor: DatabaseExecutor,
): Promise<HoneyHarvest> {
  const id = `hh-${randomUUID().slice(0, 8)}`;
  const [row] = await executor
    .insert(honeyHarvests)
    .values({
      id,
      apiaryId: input.apiaryId,
      hiveId: input.hiveId ?? null,
      date: input.date,
      quantity: input.quantity,
      unit: input.unit,
      destination: input.destination ?? null,
      notes: input.notes ?? null,
      createdAt: new Date().toISOString(),
    })
    .returning();
  return rowToHarvest(row);
}
