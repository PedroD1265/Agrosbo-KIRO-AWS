import { randomUUID } from 'node:crypto';
import { eq, desc } from 'drizzle-orm';
import { db } from './db.js';
import {
  fieldApplications,
  blocks,
  greenhouses,
  type FieldApplication,
  type InsertFieldApplication,
  type ScopeType,
} from '@agrosbo/shared/schema.js';
import { storage, InventoryStockError, type IStorage } from './storage.js';

function rowToApplication(r: typeof fieldApplications.$inferSelect): FieldApplication {
  const out: FieldApplication = {
    id: r.id,
    scopeType: r.scopeType,
    scopeId: r.scopeId,
    scopeName: r.scopeName,
    applicationType: r.applicationType,
    productName: r.productName,
    appliedAt: r.appliedAt,
    responsible: r.responsible,
    createdAt: r.createdAt,
  };
  if (r.campaignId) out.campaignId = r.campaignId;
  if (r.inventoryItemId) out.inventoryItemId = r.inventoryItemId;
  if (r.dose != null) out.dose = r.dose;
  if (r.doseUnit) out.doseUnit = r.doseUnit;
  if (r.quantityUsed != null) out.quantityUsed = r.quantityUsed;
  if (r.method) out.method = r.method;
  if (r.targetProblem) out.targetProblem = r.targetProblem;
  if (r.sourceTaskId) out.sourceTaskId = r.sourceTaskId;
  if (r.sourceObservationId) out.sourceObservationId = r.sourceObservationId;
  if (r.preHarvestIntervalDays != null) out.preHarvestIntervalDays = r.preHarvestIntervalDays;
  if (r.safeHarvestDate) out.safeHarvestDate = r.safeHarvestDate;
  if (r.notes) out.notes = r.notes;
  if (r.movementId) out.movementId = r.movementId;
  return out;
}

async function resolveScopeName(
  type: ScopeType,
  id: string,
  executor: DatabaseExecutor,
): Promise<string> {
  if (type === 'block') {
    const [r] = await executor.select({ name: blocks.name }).from(blocks).where(eq(blocks.id, id));
    return r?.name ?? id;
  }
  const [r] = await executor
    .select({ name: greenhouses.name })
    .from(greenhouses)
    .where(eq(greenhouses.id, id));
  return r?.name ?? id;
}

export async function listApplications(): Promise<FieldApplication[]> {
  if (!db) return [];
  const rows = await db.select().from(fieldApplications).orderBy(desc(fieldApplications.appliedAt));
  return rows.map(rowToApplication);
}

export class InventoryItemNotFoundError extends Error {
  constructor(id: string) {
    super(`Inventario no encontrado: ${id}`);
    this.name = 'InventoryItemNotFoundError';
  }
}

import type { DatabaseExecutor } from './executor.js';

export async function createApplication(
  input: InsertFieldApplication,
  opts: { storage: IStorage; executor: DatabaseExecutor },
): Promise<FieldApplication> {
  const { storage: stg, executor: dbExec } = opts;
  const id = `fa-${randomUUID().slice(0, 8)}`;
  const scopeName = await resolveScopeName(input.scopeType, input.scopeId, dbExec);
  let movementId: string | null = null;
  const wantsMovement =
    !!input.inventoryItemId && typeof input.quantityUsed === 'number' && input.quantityUsed > 0;
  if (wantsMovement) {
    const items = await stg.listInventory();
    if (!items.some((it) => it.id === input.inventoryItemId)) {
      throw new InventoryItemNotFoundError(input.inventoryItemId!);
    }
    const result = await stg.createInventoryMovement({
      itemId: input.inventoryItemId!,
      delta: -input.quantityUsed!,
      note: `Aplicación: ${input.productName}`,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      at: input.appliedAt,
    });
    if (!result) throw new InventoryItemNotFoundError(input.inventoryItemId!);
    movementId = result.movement.id;
  }
  const safeHarvestDate =
    typeof input.preHarvestIntervalDays === 'number'
      ? new Date(new Date(input.appliedAt).getTime() + input.preHarvestIntervalDays * 86_400_000)
          .toISOString()
          .slice(0, 10)
      : null;
  const [row] = await dbExec
    .insert(fieldApplications)
    .values({
      id,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      scopeName,
      campaignId: input.campaignId ?? null,
      applicationType: input.applicationType,
      productName: input.productName,
      inventoryItemId: input.inventoryItemId ?? null,
      dose: input.dose ?? null,
      doseUnit: input.doseUnit ?? null,
      quantityUsed: input.quantityUsed ?? null,
      method: input.method ?? null,
      appliedAt: input.appliedAt,
      responsible: input.responsible,
      targetProblem: input.targetProblem ?? null,
      sourceTaskId: input.sourceTaskId ?? null,
      sourceObservationId: input.sourceObservationId ?? null,
      preHarvestIntervalDays: input.preHarvestIntervalDays ?? null,
      safeHarvestDate,
      notes: input.notes ?? null,
      movementId,
      createdAt: new Date().toISOString(),
    })
    .returning();
  if (!row) throw new Error('Insert returned no row');
  return rowToApplication(row);
}
