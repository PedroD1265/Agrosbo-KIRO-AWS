import { randomUUID } from "node:crypto";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { db } from "./db.js";
import {
  blocks,
  greenhouses,
  campaigns,
  irrigationEvents,
  tasks,
  observations,
  inventoryItems,
  inventoryMovements,
  harvestLots,
  alerts,
  organizations,
  users,
  type Block,
  type Greenhouse,
  type Campaign,
  type IrrigationEvent,
  type Task,
  type Observation,
  type InventoryItem,
  type HarvestLot,
  type Alert,
  type Settings,
  type InsertBlock,
  type InsertGreenhouse,
  type InsertCampaign,
  type InsertIrrigationEvent,
  type InsertTask,
  type InsertObservation,
  type InsertInventoryItem,
  type InventoryMovement,
  type InsertInventoryMovement,
  type InventoryMovementKind,
  type InsertHarvestLot,
  type ScopeType,
  type ChecklistItem,
  type UpdateBlock,
  type UpdateGreenhouse,
  type UpdateCampaign,
  type UpdateTask,
  type UpdateIrrigationEvent,
  type UpdateInventoryItem,
  type UpdateHarvestLot,
} from "@agrosbo/shared/schema.js";
import type {
  BlockGeometryPatch,
  GreenhouseLocationPatch,
  ObservationLocationPatch,
  GeoJsonPolygon,
} from "@agrosbo/shared/spatial.js";
import { polygonCentroid, polygonAreaM2 } from "@agrosbo/shared/spatial.js";
import { InventoryStockError as MemInventoryStockError, type IStorage } from "./storage.js";

const ORG_ID = "org-default";

function clean<T extends object>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out as T;
}

function rowToBlock(r: typeof blocks.$inferSelect): Block {
  return clean({
    id: r.id,
    name: r.name,
    farm: r.farm,
    areaHa: r.areaHa,
    crop: r.crop,
    variety: r.variety ?? undefined,
    stage: r.stage,
    lastIrrigation: r.lastIrrigation,
    status: r.status,
    alerts: r.alerts,
    centroidLat: r.centroidLat ?? undefined,
    centroidLng: r.centroidLng ?? undefined,
    boundary: (r.boundary as GeoJsonPolygon | null) ?? undefined,
  });
}

function rowToGreenhouse(r: typeof greenhouses.$inferSelect): Greenhouse {
  return clean({
    id: r.id,
    name: r.name,
    areaM2: r.areaM2,
    crop: r.crop,
    variety: r.variety ?? undefined,
    stage: r.stage,
    status: r.status,
    alerts: r.alerts,
    tempC: r.tempC ?? undefined,
    humidity: r.humidity ?? undefined,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    footprint: (r.footprint as GeoJsonPolygon | null) ?? undefined,
  });
}

function rowToCampaign(r: typeof campaigns.$inferSelect): Campaign {
  return {
    id: r.id,
    scopeType: r.scopeType,
    scopeId: r.scopeId,
    scopeName: r.scopeName,
    crop: r.crop,
    variety: r.variety,
    startDate: r.startDate,
    endDate: r.endDate,
    stage: r.stage,
    progress: r.progress,
    status: r.status,
  };
}

function rowToIrrigation(r: typeof irrigationEvents.$inferSelect): IrrigationEvent {
  return clean({
    id: r.id,
    scopeType: r.scopeType,
    scopeId: r.scopeId,
    scopeName: r.scopeName,
    scheduledAt: r.scheduledAt,
    durationMin: r.durationMin,
    volumeL: r.volumeL ?? undefined,
    status: r.status,
    responsible: r.responsible ?? undefined,
    notes: r.notes ?? undefined,
  });
}

function rowToTask(r: typeof tasks.$inferSelect): Task {
  return clean({
    id: r.id,
    title: r.title,
    scopeType: r.scopeType,
    scopeId: r.scopeId,
    scopeName: r.scopeName,
    assignee: r.assignee ?? undefined,
    dueDate: r.dueDate,
    priority: r.priority,
    status: r.status,
    notes: r.notes ?? undefined,
    checklist: (r.checklist as ChecklistItem[] | null) ?? undefined,
    sourceObservationId: r.sourceObservationId ?? undefined,
  });
}

function rowToObservation(r: typeof observations.$inferSelect): Observation {
  return clean({
    id: r.id,
    scopeType: r.scopeType,
    scopeId: r.scopeId,
    scopeName: r.scopeName,
    author: r.author,
    createdAt: r.createdAt,
    type: r.type,
    text: r.text,
    hasPhotos: r.hasPhotos,
    pendingSync: r.pendingSync ?? undefined,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
  });
}

function rowToInventory(r: typeof inventoryItems.$inferSelect): InventoryItem {
  return clean({
    id: r.id,
    name: r.name,
    category: r.category,
    unit: r.unit,
    stock: r.stock,
    min: r.min,
    lastMovement: r.lastMovement,
    unitCost: r.unitCost ?? undefined,
    currency: r.currency ?? undefined,
  });
}

function rowToInventoryMovement(
  r: typeof inventoryMovements.$inferSelect,
): InventoryMovement {
  return clean({
    id: r.id,
    itemId: r.itemId,
    kind: r.kind,
    delta: r.delta,
    note: r.note ?? undefined,
    scopeType: r.scopeType ?? undefined,
    scopeId: r.scopeId ?? undefined,
    taskId: r.taskId ?? undefined,
    unitCost: r.unitCost ?? undefined,
    currency: r.currency ?? undefined,
    totalCost: r.totalCost ?? undefined,
    at: r.at,
    createdAt: r.createdAt,
  });
}

function rowToHarvest(r: typeof harvestLots.$inferSelect): HarvestLot {
  return clean({
    id: r.id,
    code: r.code,
    originType: r.originType,
    originId: r.originId,
    origin: r.origin,
    crop: r.crop,
    variety: r.variety,
    date: r.date,
    quantity: r.quantity,
    unit: r.unit,
    destination: r.destination ?? undefined,
    status: r.status,
    campaignId: r.campaignId ?? undefined,
    unitPrice: r.unitPrice ?? undefined,
    currency: r.currency ?? undefined,
    costAllocated: r.costAllocated ?? undefined,
  });
}

function rowToAlert(r: typeof alerts.$inferSelect): Alert {
  return {
    id: r.id,
    level: r.level,
    scope: r.scope,
    message: r.message,
    at: r.at,
  };
}

export class DbStorage implements IStorage {
  private async resolveScopeName(type: ScopeType, id: string): Promise<string> {
    if (type === "block") {
      const [b] = await db.select().from(blocks).where(eq(blocks.id, id));
      return b?.name ?? "Bloque desconocido";
    }
    const [g] = await db.select().from(greenhouses).where(eq(greenhouses.id, id));
    return g?.name ?? "Invernadero desconocido";
  }

  /* Blocks */
  async listBlocks() {
    return (await db.select().from(blocks)).map(rowToBlock);
  }
  async getBlock(id: string) {
    const [b] = await db.select().from(blocks).where(eq(blocks.id, id));
    return b ? rowToBlock(b) : undefined;
  }
  async createBlock(input: InsertBlock): Promise<Block> {
    const id = `b-${randomUUID().slice(0, 8)}`;
    const [row] = await db
      .insert(blocks)
      .values({
        id,
        ...input,
        variety: input.variety ?? null,
        centroidLat: input.centroidLat ?? null,
        centroidLng: input.centroidLng ?? null,
        boundary: (input.boundary as unknown as object) ?? null,
      })
      .returning();
    return rowToBlock(row);
  }
  async updateBlockGeometry(id: string, patch: BlockGeometryPatch) {
    const updates: Record<string, unknown> = {};
    if (patch.boundary !== undefined) {
      updates.boundary = patch.boundary as unknown as object | null;
      if (patch.boundary) {
        const c = polygonCentroid(patch.boundary);
        updates.centroidLat = c.lat;
        updates.centroidLng = c.lng;
        updates.areaHa = polygonAreaM2(patch.boundary) / 10_000;
      }
    }
    if (patch.centroidLat !== undefined) updates.centroidLat = patch.centroidLat;
    if (patch.centroidLng !== undefined) updates.centroidLng = patch.centroidLng;
    if (Object.keys(updates).length === 0) return this.getBlock(id);
    const [row] = await db
      .update(blocks)
      .set(updates)
      .where(eq(blocks.id, id))
      .returning();
    return row ? rowToBlock(row) : undefined;
  }
  async importBlockBoundaries(items: Array<{ id?: string; name?: string; farm?: string; crop?: string; areaHa?: number; boundary: GeoJsonPolygon }>) {
    const ids: string[] = [];
    let created = 0;
    let updated = 0;
    for (const it of items) {
      const c = polygonCentroid(it.boundary);
      const area = it.areaHa ?? polygonAreaM2(it.boundary) / 10_000;
      let existing: Block | undefined;
      if (it.id) existing = await this.getBlock(it.id);
      if (existing) {
        await db
          .update(blocks)
          .set({
            name: it.name ?? existing.name,
            farm: it.farm ?? existing.farm,
            crop: it.crop ?? existing.crop,
            areaHa: area,
            boundary: it.boundary as unknown as object,
            centroidLat: c.lat,
            centroidLng: c.lng,
          })
          .where(eq(blocks.id, existing.id));
        ids.push(existing.id);
        updated++;
      } else {
        const id = it.id ?? `b-${randomUUID().slice(0, 8)}`;
        await db.insert(blocks).values({
          id,
          name: it.name ?? id,
          farm: it.farm ?? "Importado",
          areaHa: area,
          crop: it.crop ?? "—",
          stage: "veg",
          lastIrrigation: new Date().toISOString(),
          status: "idle",
          alerts: 0,
          variety: null,
          centroidLat: c.lat,
          centroidLng: c.lng,
          boundary: it.boundary as unknown as object,
        });
        ids.push(id);
        created++;
      }
    }
    return { created, updated, ids };
  }

  async updateBlock(id: string, patch: UpdateBlock) {
    const sets: Record<string, unknown> = { ...patch };
    if ("variety" in patch) sets.variety = patch.variety ?? null;
    const [row] = await db.update(blocks).set(sets).where(eq(blocks.id, id)).returning();
    return row ? rowToBlock(row) : undefined;
  }
  async deleteBlock(id: string) {
    const rows = await db.delete(blocks).where(eq(blocks.id, id)).returning({ id: blocks.id });
    return rows.length > 0;
  }

  /* Greenhouses */
  async listGreenhouses() {
    return (await db.select().from(greenhouses)).map(rowToGreenhouse);
  }
  async getGreenhouse(id: string) {
    const [g] = await db.select().from(greenhouses).where(eq(greenhouses.id, id));
    return g ? rowToGreenhouse(g) : undefined;
  }
  async createGreenhouse(input: InsertGreenhouse): Promise<Greenhouse> {
    const id = `g-${randomUUID().slice(0, 8)}`;
    const [row] = await db
      .insert(greenhouses)
      .values({
        id,
        ...input,
        variety: input.variety ?? null,
        tempC: input.tempC ?? null,
        humidity: input.humidity ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        footprint: (input.footprint as unknown as object) ?? null,
      })
      .returning();
    return rowToGreenhouse(row);
  }
  async updateGreenhouseLocation(id: string, patch: GreenhouseLocationPatch) {
    const updates: Record<string, unknown> = {};
    if (patch.footprint !== undefined) {
      updates.footprint = patch.footprint as unknown as object | null;
      if (patch.footprint) {
        const c = polygonCentroid(patch.footprint);
        updates.lat = c.lat;
        updates.lng = c.lng;
      }
    }
    if (patch.lat !== undefined) updates.lat = patch.lat;
    if (patch.lng !== undefined) updates.lng = patch.lng;
    if (Object.keys(updates).length === 0) return this.getGreenhouse(id);
    const [row] = await db
      .update(greenhouses)
      .set(updates)
      .where(eq(greenhouses.id, id))
      .returning();
    return row ? rowToGreenhouse(row) : undefined;
  }

  async updateGreenhouse(id: string, patch: UpdateGreenhouse) {
    const sets: Record<string, unknown> = { ...patch };
    if ("variety" in patch) sets.variety = patch.variety ?? null;
    if ("tempC" in patch) sets.tempC = patch.tempC ?? null;
    if ("humidity" in patch) sets.humidity = patch.humidity ?? null;
    const [row] = await db.update(greenhouses).set(sets).where(eq(greenhouses.id, id)).returning();
    return row ? rowToGreenhouse(row) : undefined;
  }
  async deleteGreenhouse(id: string) {
    const rows = await db.delete(greenhouses).where(eq(greenhouses.id, id)).returning({ id: greenhouses.id });
    return rows.length > 0;
  }

  /* Campaigns */
  async listCampaigns() {
    return (await db.select().from(campaigns)).map(rowToCampaign);
  }
  async createCampaign(input: InsertCampaign): Promise<Campaign> {
    const id = `c-${randomUUID().slice(0, 8)}`;
    const scopeName = await this.resolveScopeName(input.scopeType, input.scopeId);
    const [row] = await db
      .insert(campaigns)
      .values({ id, scopeName, ...input })
      .returning();
    return rowToCampaign(row);
  }

  async updateCampaign(id: string, patch: UpdateCampaign) {
    const sets: Record<string, unknown> = { ...patch };
    if ((patch.scopeType || patch.scopeId)) {
      const [cur] = await db.select().from(campaigns).where(eq(campaigns.id, id));
      if (!cur) return undefined;
      sets.scopeName = await this.resolveScopeName(
        patch.scopeType ?? cur.scopeType,
        patch.scopeId ?? cur.scopeId,
      );
    }
    const [row] = await db.update(campaigns).set(sets).where(eq(campaigns.id, id)).returning();
    return row ? rowToCampaign(row) : undefined;
  }
  async deleteCampaign(id: string) {
    const rows = await db.delete(campaigns).where(eq(campaigns.id, id)).returning({ id: campaigns.id });
    return rows.length > 0;
  }

  /* Irrigation */
  async listIrrigationEvents() {
    return (await db.select().from(irrigationEvents)).map(rowToIrrigation);
  }
  async createIrrigationEvent(input: InsertIrrigationEvent): Promise<IrrigationEvent> {
    const id = `i-${randomUUID().slice(0, 8)}`;
    const scopeName = await this.resolveScopeName(input.scopeType, input.scopeId);
    const [row] = await db
      .insert(irrigationEvents)
      .values({
        id,
        scopeName,
        ...input,
        volumeL: input.volumeL ?? null,
        responsible: input.responsible ?? null,
        notes: input.notes ?? null,
      })
      .returning();
    return rowToIrrigation(row);
  }
  async markIrrigationDone(id: string) {
    const [row] = await db
      .update(irrigationEvents)
      .set({ status: "done" })
      .where(eq(irrigationEvents.id, id))
      .returning();
    return row ? rowToIrrigation(row) : undefined;
  }

  async updateIrrigationEvent(id: string, patch: UpdateIrrigationEvent) {
    const sets: Record<string, unknown> = { ...patch };
    if ("volumeL" in patch) sets.volumeL = patch.volumeL ?? null;
    if ("responsible" in patch) sets.responsible = patch.responsible ?? null;
    if ("notes" in patch) sets.notes = patch.notes ?? null;
    if ((patch.scopeType || patch.scopeId)) {
      const [cur] = await db.select().from(irrigationEvents).where(eq(irrigationEvents.id, id));
      if (!cur) return undefined;
      sets.scopeName = await this.resolveScopeName(
        patch.scopeType ?? cur.scopeType,
        patch.scopeId ?? cur.scopeId,
      );
    }
    const [row] = await db.update(irrigationEvents).set(sets).where(eq(irrigationEvents.id, id)).returning();
    return row ? rowToIrrigation(row) : undefined;
  }
  async deleteIrrigationEvent(id: string) {
    const rows = await db.delete(irrigationEvents).where(eq(irrigationEvents.id, id)).returning({ id: irrigationEvents.id });
    return rows.length > 0;
  }

  /* Tasks */
  async listTasks() {
    return (await db.select().from(tasks)).map(rowToTask);
  }
  async createTask(input: InsertTask): Promise<Task> {
    const id = `t-${randomUUID().slice(0, 8)}`;
    const scopeName = await this.resolveScopeName(input.scopeType, input.scopeId);
    const [row] = await db
      .insert(tasks)
      .values({
        id,
        scopeName,
        ...input,
        notes: input.notes ?? null,
        checklist: null,
      })
      .returning();
    return rowToTask(row);
  }
  async updateTaskStatus(id: string, status: Task["status"]) {
    const [row] = await db
      .update(tasks)
      .set({ status })
      .where(eq(tasks.id, id))
      .returning();
    return row ? rowToTask(row) : undefined;
  }

  async updateTask(id: string, patch: UpdateTask) {
    const sets: Record<string, unknown> = { ...patch };
    if ("notes" in patch) sets.notes = patch.notes ?? null;
    if ((patch.scopeType || patch.scopeId)) {
      const [cur] = await db.select().from(tasks).where(eq(tasks.id, id));
      if (!cur) return undefined;
      sets.scopeName = await this.resolveScopeName(
        patch.scopeType ?? cur.scopeType,
        patch.scopeId ?? cur.scopeId,
      );
    }
    const [row] = await db.update(tasks).set(sets).where(eq(tasks.id, id)).returning();
    return row ? rowToTask(row) : undefined;
  }
  async deleteTask(id: string) {
    const rows = await db.delete(tasks).where(eq(tasks.id, id)).returning({ id: tasks.id });
    return rows.length > 0;
  }

  /* Observations */
  async listObservations() {
    return (
      await db.select().from(observations).orderBy(desc(observations.createdAt))
    ).map(rowToObservation);
  }
  async createObservation(input: InsertObservation): Promise<Observation> {
    const id = `o-${randomUUID().slice(0, 8)}`;
    const scopeName = await this.resolveScopeName(input.scopeType, input.scopeId);
    const [row] = await db
      .insert(observations)
      .values({
        id,
        scopeName,
        createdAt: new Date().toISOString(),
        pendingSync: true,
        ...input,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
      })
      .returning();
    return rowToObservation(row);
  }
  async updateObservationLocation(id: string, patch: ObservationLocationPatch) {
    const [row] = await db
      .update(observations)
      .set({ lat: patch.lat, lng: patch.lng })
      .where(eq(observations.id, id))
      .returning();
    return row ? rowToObservation(row) : undefined;
  }

  async deleteObservation(id: string) {
    const rows = await db.delete(observations).where(eq(observations.id, id)).returning({ id: observations.id });
    return rows.length > 0;
  }

  /* Inventory */
  async listInventory() {
    return (await db.select().from(inventoryItems)).map(rowToInventory);
  }
  async createInventoryItem(input: InsertInventoryItem): Promise<InventoryItem> {
    const id = `iv-${randomUUID().slice(0, 8)}`;
    const [row] = await db
      .insert(inventoryItems)
      .values({ id, ...input })
      .returning();
    return rowToInventory(row);
  }
  async adjustInventoryStock(
    id: string,
    delta: number,
    lastMovement?: string,
  ): Promise<InventoryItem | undefined> {
    const [cur] = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, id));
    if (!cur) return undefined;
    const nextStock = Math.max(0, Number(cur.stock) + delta);
    const movement = lastMovement ?? new Date().toISOString().slice(0, 10);
    const [row] = await db
      .update(inventoryItems)
      .set({ stock: nextStock, lastMovement: movement })
      .where(eq(inventoryItems.id, id))
      .returning();
    return rowToInventory(row);
  }

  async updateInventoryItem(id: string, patch: UpdateInventoryItem) {
    const [row] = await db.update(inventoryItems).set(patch).where(eq(inventoryItems.id, id)).returning();
    return row ? rowToInventory(row) : undefined;
  }
  async deleteInventoryItem(id: string) {
    const rows = await db.delete(inventoryItems).where(eq(inventoryItems.id, id)).returning({ id: inventoryItems.id });
    return rows.length > 0;
  }
  async listInventoryMovements(itemId?: string): Promise<InventoryMovement[]> {
    const q = db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.at));
    const rows = itemId
      ? await db
          .select()
          .from(inventoryMovements)
          .where(eq(inventoryMovements.itemId, itemId))
          .orderBy(desc(inventoryMovements.at))
      : await q;
    return rows.map(rowToInventoryMovement);
  }
  async createInventoryMovement(input: InsertInventoryMovement) {
    return await db.transaction(async (tx: any) => {
      const delta = input.delta;
      const at = input.at ?? new Date().toISOString();
      const lastMovement = at.slice(0, 10);
      const [updated] = await tx
        .update(inventoryItems)
        .set({
          stock: sql`${inventoryItems.stock} + ${delta}`,
          lastMovement,
          unitCost: sql`COALESCE(${inventoryItems.unitCost}, ${input.unitCost ?? null})`,
          currency: sql`COALESCE(${inventoryItems.currency}, ${input.currency ?? null})`,
        })
        .where(
          delta < 0
            ? and(eq(inventoryItems.id, input.itemId), gte(inventoryItems.stock, -delta))
            : eq(inventoryItems.id, input.itemId),
        )
        .returning();
      if (!updated) {
        const [exists] = await tx
          .select({ id: inventoryItems.id })
          .from(inventoryItems)
          .where(eq(inventoryItems.id, input.itemId));
        if (!exists) return undefined;
        throw new MemInventoryStockError("Stock insuficiente");
      }
      const kind: InventoryMovementKind = delta > 0 ? "in" : "out";
      const unitCost = input.unitCost ?? updated.unitCost ?? null;
      const currency = input.currency ?? updated.currency ?? null;
      const totalCost =
        typeof unitCost === "number" ? Math.abs(delta) * unitCost : null;
      const id = `mv-${randomUUID().slice(0, 8)}`;
      const [movRow] = await tx
        .insert(inventoryMovements)
        .values({
          id,
          itemId: input.itemId,
          kind,
          delta,
          note: input.note ?? null,
          scopeType: input.scopeType ?? null,
          scopeId: input.scopeId ?? null,
          taskId: input.taskId ?? null,
          unitCost,
          currency,
          totalCost,
          at,
          createdAt: new Date().toISOString(),
        })
        .returning();
      return {
        item: rowToInventory(updated),
        movement: rowToInventoryMovement(movRow),
      };
    });
  }

  /* Harvest */
  async listHarvestLots() {
    return (await db.select().from(harvestLots)).map(rowToHarvest);
  }
  async createHarvestLot(input: InsertHarvestLot): Promise<HarvestLot> {
    const id = `h-${randomUUID().slice(0, 8)}`;
    const origin = await this.resolveScopeName(input.originType, input.originId);
    const [row] = await db
      .insert(harvestLots)
      .values({
        id,
        origin,
        ...input,
        destination: input.destination ?? null,
      })
      .returning();
    return rowToHarvest(row);
  }

  async updateHarvestLot(id: string, patch: UpdateHarvestLot) {
    const sets: Record<string, unknown> = { ...patch };
    if ("destination" in patch) sets.destination = patch.destination ?? null;
    if ((patch.originType || patch.originId)) {
      const [cur] = await db.select().from(harvestLots).where(eq(harvestLots.id, id));
      if (!cur) return undefined;
      sets.origin = await this.resolveScopeName(
        patch.originType ?? cur.originType,
        patch.originId ?? cur.originId,
      );
    }
    const [row] = await db.update(harvestLots).set(sets).where(eq(harvestLots.id, id)).returning();
    return row ? rowToHarvest(row) : undefined;
  }
  async deleteHarvestLot(id: string) {
    const rows = await db.delete(harvestLots).where(eq(harvestLots.id, id)).returning({ id: harvestLots.id });
    return rows.length > 0;
  }

  /* Alerts */
  async listAlerts() {
    return (await db.select().from(alerts)).map(rowToAlert);
  }

  /* Settings (single org row) */
  async getSettings(): Promise<Settings> {
    const [row] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, ORG_ID));
    if (!row) {
      throw new Error("Organization settings not initialized. Run seed.");
    }
    return {
      orgName: row.name,
      location: row.location,
      timezone: row.timezone,
      preferOffline: row.preferOffline,
      confirmBeforeSync: row.confirmBeforeSync,
      criticalAlertsBanner: row.criticalAlertsBanner,
    };
  }
  async updateSettings(input: Settings): Promise<Settings> {
    await db
      .insert(organizations)
      .values({
        id: ORG_ID,
        name: input.orgName,
        location: input.location,
        timezone: input.timezone,
        preferOffline: input.preferOffline,
        confirmBeforeSync: input.confirmBeforeSync,
        criticalAlertsBanner: input.criticalAlertsBanner,
      })
      .onConflictDoUpdate({
        target: organizations.id,
        set: {
          name: input.orgName,
          location: input.location,
          timezone: input.timezone,
          preferOffline: input.preferOffline,
          confirmBeforeSync: input.confirmBeforeSync,
          criticalAlertsBanner: input.criticalAlertsBanner,
        },
      });
    return input;
  }
}

/* ------------------------------------------------------------------
 * Idempotent seed: only inserts if a table is empty.
 * Re-uses existing in-memory mocks as canonical seed data.
 * ------------------------------------------------------------------ */
export async function seedDatabase(): Promise<void> {
  const {
    seedBlocks,
    seedGreenhouses,
    seedCampaigns,
    seedIrrigationEvents,
    seedTasks,
    seedObservations,
    seedInventory,
    seedHarvestLots,
    seedAlerts,
    seedSettings,
  } = await import("./seed.js");

  const [{ count: orgCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(organizations);
  if (orgCount === 0) {
    await db.insert(organizations).values({
      id: ORG_ID,
      name: seedSettings.orgName,
      location: seedSettings.location,
      timezone: seedSettings.timezone,
      preferOffline: seedSettings.preferOffline,
      confirmBeforeSync: seedSettings.confirmBeforeSync,
      criticalAlertsBanner: seedSettings.criticalAlertsBanner,
    });
  }

  const [{ count: bCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(blocks);
  if (bCount === 0 && seedBlocks.length) {
    await db.insert(blocks).values(
      seedBlocks.map((b) => ({
        ...b,
        variety: b.variety ?? null,
        centroidLat: b.centroidLat ?? null,
        centroidLng: b.centroidLng ?? null,
        boundary: (b.boundary as unknown as object) ?? null,
      })),
    );
  }

  const [{ count: gCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(greenhouses);
  if (gCount === 0 && seedGreenhouses.length) {
    await db.insert(greenhouses).values(
      seedGreenhouses.map((g) => ({
        ...g,
        variety: g.variety ?? null,
        tempC: g.tempC ?? null,
        humidity: g.humidity ?? null,
        lat: g.lat ?? null,
        lng: g.lng ?? null,
        footprint: (g.footprint as unknown as object) ?? null,
      })),
    );
  }

  const [{ count: cCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(campaigns);
  if (cCount === 0 && seedCampaigns.length) {
    await db.insert(campaigns).values(seedCampaigns);
  }

  const [{ count: iCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(irrigationEvents);
  if (iCount === 0 && seedIrrigationEvents.length) {
    await db.insert(irrigationEvents).values(
      seedIrrigationEvents.map((e) => ({
        ...e,
        volumeL: e.volumeL ?? null,
        responsible: e.responsible ?? null,
        notes: e.notes ?? null,
      })),
    );
  }

  const [{ count: tCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks);
  if (tCount === 0 && seedTasks.length) {
    await db.insert(tasks).values(
      seedTasks.map((t) => ({
        ...t,
        notes: t.notes ?? null,
        checklist: t.checklist ?? null,
      })),
    );
  }

  const [{ count: oCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(observations);
  if (oCount === 0 && seedObservations.length) {
    await db.insert(observations).values(
      seedObservations.map((o) => ({
        ...o,
        pendingSync: o.pendingSync ?? null,
        lat: o.lat ?? null,
        lng: o.lng ?? null,
      })),
    );
  }

  /* Backfill geometry on existing rows (idempotent — only fills NULLs) */
  for (const sb of seedBlocks) {
    if (!sb.boundary) continue;
    await db
      .update(blocks)
      .set({
        boundary: sb.boundary as unknown as object,
        centroidLat: sb.centroidLat ?? null,
        centroidLng: sb.centroidLng ?? null,
      })
      .where(sql`${blocks.id} = ${sb.id} AND ${blocks.boundary} IS NULL`);
  }
  for (const sg of seedGreenhouses) {
    if (sg.lat == null || sg.lng == null) continue;
    await db
      .update(greenhouses)
      .set({
        lat: sg.lat,
        lng: sg.lng,
        footprint: (sg.footprint as unknown as object) ?? null,
      })
      .where(sql`${greenhouses.id} = ${sg.id} AND ${greenhouses.lat} IS NULL`);
  }
  for (const so of seedObservations) {
    if (so.lat == null || so.lng == null) continue;
    await db
      .update(observations)
      .set({ lat: so.lat, lng: so.lng })
      .where(sql`${observations.id} = ${so.id} AND ${observations.lat} IS NULL`);
  }

  const [{ count: invCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventoryItems);
  if (invCount === 0 && seedInventory.length) {
    await db.insert(inventoryItems).values(seedInventory);
  }

  const [{ count: hCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(harvestLots);
  if (hCount === 0 && seedHarvestLots.length) {
    await db.insert(harvestLots).values(
      seedHarvestLots.map((h) => ({
        ...h,
        destination: h.destination ?? null,
      })),
    );
  }

  const [{ count: aCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(alerts);
  if (aCount === 0 && seedAlerts.length) {
    await db.insert(alerts).values(seedAlerts);
  }

  // Seed a default admin user so AUTH_ENFORCEMENT can be flipped to 'on'
  // immediately. Password comes from SEED_ADMIN_PASSWORD; if not set we
  // generate a one-time strong random password and print it once to stdout
  // (operator must capture it from logs). No predictable default ever.
  // Only inserted if there are zero users.
  const [{ count: uCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  const { hashPassword } = await import("./users.js");
  const fromEnv = process.env.SEED_ADMIN_PASSWORD?.trim();
  if (uCount === 0) {
    let pwd = fromEnv;
    let generated = false;
    if (!pwd || pwd.length < 8) {
      pwd = randomUUID().replace(/-/g, "") + randomUUID().slice(0, 8);
      generated = true;
    }
    await db.insert(users).values({
      id: "usr-seed-admin",
      orgId: ORG_ID,
      name: "Administrador",
      email: "admin@agrosbo.com",
      username: "admin",
      passwordHash: hashPassword(pwd),
      role: "admin",
      active: true,
      createdAt: new Date().toISOString(),
    });
    if (generated) {
      // eslint-disable-next-line no-console
      console.warn(
        `\n========================================================================\n` +
        `SEED ADMIN USER CREATED\n` +
        `  username: admin\n` +
        `  password: ${pwd}\n` +
        `Capture this value NOW — it will never be shown again.\n` +
        `Set SEED_ADMIN_PASSWORD in the environment to control this value.\n` +
        `========================================================================\n`,
      );
    }
  } else if (fromEnv && fromEnv.length >= 8) {
    // If SEED_ADMIN_PASSWORD is explicitly set and the seed admin already
    // exists, update their hash so the operator can reset the known credential
    // without manual DB surgery. Only touches the seed admin (usr-seed-admin).
    await db
      .update(users)
      .set({ passwordHash: hashPassword(fromEnv) })
      .where(eq(users.id, "usr-seed-admin"));
  }
}
