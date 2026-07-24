import { queryClient } from "@/lib/queryClient";
import { enqueue, makeClientId } from "@/lib/sync/queue";
import { triggerSync } from "@/lib/sync/engine";
import type {
  Block,
  Greenhouse,
  Task,
  IrrigationEvent,
  Observation,
  InventoryItem,
  HarvestLot,
  Campaign,
  Settings,
  ScopeType,
  ObservationType,
  TaskStatus,
  InsertBlock,
  InsertGreenhouse,
  UpdateBlock,
  UpdateGreenhouse,
  UpdateCampaign,
  UpdateTask,
  UpdateIrrigationEvent,
  UpdateInventoryItem,
  UpdateHarvestLot,
} from "@shared/schema";

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

function patchList<T>(key: string[], updater: (old: T[]) => T[]) {
  queryClient.setQueryData<T[]>(key, (old) => updater((old ?? []) as T[]));
}

function lookupScopeName(
  scopeType: ScopeType,
  scopeId: string,
): string {
  if (scopeType === "block") {
    const blocks = queryClient.getQueryData<Block[]>(["/api/blocks"]) ?? [];
    return blocks.find((b) => b.id === scopeId)?.name ?? scopeId;
  }
  const greenhouses = queryClient.getQueryData<Greenhouse[]>([
    "/api/greenhouses",
  ]) ?? [];
  return greenhouses.find((g) => g.id === scopeId)?.name ?? scopeId;
}

/* ---------------------------------------------------------------------------
 * Tasks
 * ------------------------------------------------------------------------- */

export interface CreateTaskInput {
  title: string;
  scopeType: ScopeType;
  scopeId: string;
  assignee: string;
  dueDate: string;
  priority: "low" | "med" | "high";
  notes?: string;
  sourceObservationId?: string;
}

export async function queueCreateTask(input: CreateTaskInput) {
  const clientId = makeClientId("t");
  const optimistic: Task = {
    id: clientId,
    title: input.title,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    scopeName: lookupScopeName(input.scopeType, input.scopeId),
    assignee: input.assignee,
    dueDate: input.dueDate,
    priority: input.priority,
    status: "pending",
    notes: input.notes,
    sourceObservationId: input.sourceObservationId,
  };
  patchList<Task>(["/api/tasks"], (old) => [...old, optimistic]);
  await enqueue({
    clientId,
    domain: "task:create",
    method: "POST",
    url: "/api/tasks",
    body: { ...input, status: "pending" },
    invalidateKeys: [["/api/tasks"], ["/api/alerts"]],
  });
  triggerSync();
}

export async function queueUpdateTaskStatus(id: string, status: TaskStatus) {
  patchList<Task>(["/api/tasks"], (old) =>
    old.map((t) => (t.id === id ? { ...t, status } : t)),
  );
  await enqueue({
    clientId: makeClientId(`ts-${id}`),
    domain: "task:status",
    method: "PATCH",
    url: `/api/tasks/${id}/status`,
    body: { status },
    invalidateKeys: [["/api/tasks"], ["/api/alerts"]],
  });
  triggerSync();
}

/* ---------------------------------------------------------------------------
 * Irrigation
 * ------------------------------------------------------------------------- */

export interface CreateIrrigationInput {
  scopeType: ScopeType;
  scopeId: string;
  scheduledAt: string;
  durationMin: number;
  volumeL?: number;
  responsible?: string;
  notes?: string;
}

export async function queueCreateIrrigation(input: CreateIrrigationInput) {
  const clientId = makeClientId("ir");
  const optimistic: IrrigationEvent = {
    id: clientId,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    scopeName: lookupScopeName(input.scopeType, input.scopeId),
    scheduledAt: input.scheduledAt,
    durationMin: input.durationMin,
    volumeL: input.volumeL,
    status: "pending-sync",
    responsible: input.responsible,
    notes: input.notes,
  };
  patchList<IrrigationEvent>(["/api/irrigation-events"], (old) => [
    ...old,
    optimistic,
  ]);
  await enqueue({
    clientId,
    domain: "irrigation:create",
    method: "POST",
    url: "/api/irrigation-events",
    body: { ...input, status: "pending-sync" },
    invalidateKeys: [["/api/irrigation-events"], ["/api/alerts"]],
  });
  triggerSync();
}

export async function queueMarkIrrigationDone(id: string) {
  patchList<IrrigationEvent>(["/api/irrigation-events"], (old) =>
    old.map((i) => (i.id === id ? { ...i, status: "done" } : i)),
  );
  await enqueue({
    clientId: makeClientId(`ird-${id}`),
    domain: "irrigation:done",
    method: "POST",
    url: `/api/irrigation-events/${id}/done`,
    body: {},
    invalidateKeys: [["/api/irrigation-events"], ["/api/alerts"]],
  });
  triggerSync();
}

/* ---------------------------------------------------------------------------
 * Observations
 * ------------------------------------------------------------------------- */

export interface CreateObservationInput {
  scopeType: ScopeType;
  scopeId: string;
  type: ObservationType;
  author: string;
  text: string;
}

export async function queueCreateObservation(input: CreateObservationInput) {
  const clientId = makeClientId("ob");
  const optimistic: Observation = {
    id: clientId,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    scopeName: lookupScopeName(input.scopeType, input.scopeId),
    author: input.author,
    createdAt: new Date().toISOString(),
    type: input.type,
    text: input.text,
    hasPhotos: 0,
    pendingSync: true,
  };
  patchList<Observation>(["/api/observations"], (old) => [optimistic, ...old]);
  await enqueue({
    clientId,
    domain: "observation:create",
    method: "POST",
    url: "/api/observations",
    body: { ...input, hasPhotos: 0 },
    invalidateKeys: [["/api/observations"], ["/api/alerts"]],
  });
  triggerSync();
}

/* ---------------------------------------------------------------------------
 * Inventory
 * ------------------------------------------------------------------------- */

export interface CreateInventoryInput {
  name: string;
  category: string;
  unit: string;
  stock: number;
  min: number;
  unitCost?: number;
  currency?: string;
}

export async function queueCreateInventory(input: CreateInventoryInput) {
  const clientId = makeClientId("inv");
  const today = new Date().toISOString().slice(0, 10);
  const optimistic: InventoryItem = {
    id: clientId,
    ...input,
    lastMovement: today,
  };
  patchList<InventoryItem>(["/api/inventory"], (old) => [...old, optimistic]);
  await enqueue({
    clientId,
    domain: "inventory:create",
    method: "POST",
    url: "/api/inventory",
    body: { ...input, lastMovement: today },
    invalidateKeys: [["/api/inventory"]],
  });
  triggerSync();
}

export interface AdjustInventoryInput {
  id: string;
  delta: number;
  note?: string;
  unitCost?: number;
  currency?: string;
  scopeType?: ScopeType;
  scopeId?: string;
  taskId?: string;
}

export async function queueAdjustInventory(input: AdjustInventoryInput) {
  const today = new Date().toISOString().slice(0, 10);
  patchList<InventoryItem>(["/api/inventory"], (old) =>
    old.map((i) =>
      i.id === input.id
        ? {
            ...i,
            stock: Math.max(0, i.stock + input.delta),
            lastMovement: today,
            ...(input.unitCost !== undefined && i.unitCost === undefined
              ? { unitCost: input.unitCost }
              : {}),
            ...(input.currency !== undefined && i.currency === undefined
              ? { currency: input.currency }
              : {}),
          }
        : i,
    ),
  );
  await enqueue({
    clientId: makeClientId(`adj-${input.id}`),
    domain: "inventory:adjust",
    method: "PATCH",
    url: `/api/inventory/${input.id}`,
    body: {
      delta: input.delta,
      note: input.note,
      lastMovement: today,
      unitCost: input.unitCost,
      currency: input.currency,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      taskId: input.taskId,
    },
    invalidateKeys: [["/api/inventory"], ["/api/inventory", input.id, "movements"], ["/api/alerts"]],
  });
  triggerSync();
}

/* ---------------------------------------------------------------------------
 * Harvest Lots
 * ------------------------------------------------------------------------- */

export interface CreateHarvestInput {
  code: string;
  originType: ScopeType;
  originId: string;
  crop: string;
  variety: string;
  date: string;
  quantity: number;
  unit: string;
  destination?: string;
  status: "ok" | "warn" | "critical" | "idle" | "pending-sync";
  campaignId?: string;
  unitPrice?: number;
  currency?: string;
  costAllocated?: number;
}

export async function queueCreateHarvest(input: CreateHarvestInput) {
  const clientId = makeClientId("h");
  const optimistic: HarvestLot = {
    id: clientId,
    code: input.code,
    originType: input.originType,
    originId: input.originId,
    origin: lookupScopeName(input.originType, input.originId),
    crop: input.crop,
    variety: input.variety,
    date: input.date,
    quantity: input.quantity,
    unit: input.unit,
    destination: input.destination,
    status: input.status,
    campaignId: input.campaignId,
    unitPrice: input.unitPrice,
    currency: input.currency,
    costAllocated: input.costAllocated,
  };
  patchList<HarvestLot>(["/api/harvest-lots"], (old) => [...old, optimistic]);
  await enqueue({
    clientId,
    domain: "harvest:create",
    method: "POST",
    url: "/api/harvest-lots",
    body: input,
    invalidateKeys: [["/api/harvest-lots"]],
  });
  triggerSync();
}

/* ---------------------------------------------------------------------------
 * Campaigns
 * ------------------------------------------------------------------------- */

export interface CreateCampaignInput {
  scopeType: ScopeType;
  scopeId: string;
  crop: string;
  variety: string;
  startDate: string;
  endDate: string;
  stage: "seed" | "veg" | "flower" | "harvest";
  progress: number;
  status: "ok" | "warn" | "critical" | "idle" | "pending-sync";
}

export async function queueCreateCampaign(input: CreateCampaignInput) {
  const clientId = makeClientId("c");
  const optimistic: Campaign = {
    id: clientId,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    scopeName: lookupScopeName(input.scopeType, input.scopeId),
    crop: input.crop,
    variety: input.variety,
    startDate: input.startDate,
    endDate: input.endDate,
    stage: input.stage,
    progress: input.progress,
    status: input.status,
  };
  patchList<Campaign>(["/api/campaigns"], (old) => [...old, optimistic]);
  await enqueue({
    clientId,
    domain: "campaign:create",
    method: "POST",
    url: "/api/campaigns",
    body: input,
    invalidateKeys: [["/api/campaigns"]],
  });
  triggerSync();
}

/* ---------------------------------------------------------------------------
 * Spatial / Geometry
 * ------------------------------------------------------------------------- */

import type {
  GeoJsonPolygon,
  BlockGeometryPatch,
  GreenhouseLocationPatch,
  ObservationLocationPatch,
  GeoJsonFeatureCollection,
} from "@shared/spatial";

export async function queueUpdateBlockGeometry(
  id: string,
  patch: BlockGeometryPatch,
) {
  patchList<Block>(["/api/blocks"], (old) =>
    old.map((b) =>
      b.id === id
        ? {
            ...b,
            ...(patch.boundary !== undefined ? { boundary: patch.boundary ?? undefined } : {}),
            ...(patch.centroidLat !== undefined ? { centroidLat: patch.centroidLat ?? undefined } : {}),
            ...(patch.centroidLng !== undefined ? { centroidLng: patch.centroidLng ?? undefined } : {}),
          }
        : b,
    ),
  );
  await enqueue({
    clientId: makeClientId(`bgeo-${id}`),
    domain: "block:geometry",
    method: "PATCH",
    url: `/api/blocks/${id}/geometry`,
    body: patch,
    invalidateKeys: [["/api/blocks"], ["/api/spatial/features"]],
  });
  triggerSync();
}

export async function queueUpdateGreenhouseLocation(
  id: string,
  patch: GreenhouseLocationPatch,
) {
  patchList<Greenhouse>(["/api/greenhouses"], (old) =>
    old.map((g) =>
      g.id === id
        ? {
            ...g,
            ...(patch.lat !== undefined ? { lat: patch.lat ?? undefined } : {}),
            ...(patch.lng !== undefined ? { lng: patch.lng ?? undefined } : {}),
            ...(patch.footprint !== undefined ? { footprint: patch.footprint ?? undefined } : {}),
          }
        : g,
    ),
  );
  await enqueue({
    clientId: makeClientId(`gloc-${id}`),
    domain: "greenhouse:location",
    method: "PATCH",
    url: `/api/greenhouses/${id}/location`,
    body: patch,
    invalidateKeys: [["/api/greenhouses"], ["/api/spatial/features"]],
  });
  triggerSync();
}

export async function queueUpdateObservationLocation(
  id: string,
  patch: ObservationLocationPatch,
) {
  patchList<Observation>(["/api/observations"], (old) =>
    old.map((o) => (o.id === id ? { ...o, lat: patch.lat ?? undefined, lng: patch.lng ?? undefined } : o)),
  );
  await enqueue({
    clientId: makeClientId(`oloc-${id}`),
    domain: "observation:location",
    method: "PATCH",
    url: `/api/observations/${id}/location`,
    body: patch,
    invalidateKeys: [["/api/observations"], ["/api/spatial/features"]],
  });
  triggerSync();
}

export async function queueImportBlockBoundaries(
  fc: GeoJsonFeatureCollection,
) {
  await enqueue({
    clientId: makeClientId("bimp"),
    domain: "block:import",
    method: "POST",
    url: "/api/spatial/blocks/import",
    body: fc,
    invalidateKeys: [["/api/blocks"], ["/api/spatial/features"]],
  });
  triggerSync();
}

// Re-export polygon type for convenience
export type { GeoJsonPolygon };

/* ---------------------------------------------------------------------------
 * Settings
 * ------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------
 * Blocks
 * ------------------------------------------------------------------------- */

export async function queueCreateBlock(input: InsertBlock) {
  const clientId = makeClientId("b");
  const optimistic: Block = { id: clientId, ...input };
  patchList<Block>(["/api/blocks"], (old) => [...old, optimistic]);
  await enqueue({
    clientId,
    domain: "block:create",
    method: "POST",
    url: "/api/blocks",
    body: input,
    invalidateKeys: [["/api/blocks"]],
  });
  triggerSync();
}

export async function queueUpdateBlock(id: string, patch: UpdateBlock) {
  patchList<Block>(["/api/blocks"], (old) =>
    old.map((b) => (b.id === id ? { ...b, ...patch } : b)),
  );
  await enqueue({
    clientId: makeClientId(`bu-${id}`),
    domain: "block:update",
    method: "PATCH",
    url: `/api/blocks/${id}`,
    body: patch,
    invalidateKeys: [["/api/blocks"], ["/api/blocks", id]],
  });
  triggerSync();
}

export async function queueDeleteBlock(id: string) {
  patchList<Block>(["/api/blocks"], (old) => old.filter((b) => b.id !== id));
  await enqueue({
    clientId: makeClientId(`bd-${id}`),
    domain: "block:delete",
    method: "DELETE",
    url: `/api/blocks/${id}`,
    body: {},
    invalidateKeys: [["/api/blocks"]],
  });
  triggerSync();
}

/* ---------------------------------------------------------------------------
 * Greenhouses
 * ------------------------------------------------------------------------- */

export async function queueCreateGreenhouse(input: InsertGreenhouse) {
  const clientId = makeClientId("g");
  const optimistic: Greenhouse = { id: clientId, ...input, alerts: input.alerts ?? 0 };
  patchList<Greenhouse>(["/api/greenhouses"], (old) => [...old, optimistic]);
  await enqueue({
    clientId,
    domain: "greenhouse:create",
    method: "POST",
    url: "/api/greenhouses",
    body: input,
    invalidateKeys: [["/api/greenhouses"]],
  });
  triggerSync();
}

export async function queueUpdateGreenhouse(id: string, patch: UpdateGreenhouse) {
  patchList<Greenhouse>(["/api/greenhouses"], (old) =>
    old.map((g) => (g.id === id ? { ...g, ...patch } : g)),
  );
  await enqueue({
    clientId: makeClientId(`gu-${id}`),
    domain: "greenhouse:update",
    method: "PATCH",
    url: `/api/greenhouses/${id}`,
    body: patch,
    invalidateKeys: [["/api/greenhouses"], ["/api/greenhouses", id]],
  });
  triggerSync();
}

export async function queueDeleteGreenhouse(id: string) {
  patchList<Greenhouse>(["/api/greenhouses"], (old) =>
    old.filter((g) => g.id !== id),
  );
  await enqueue({
    clientId: makeClientId(`gd-${id}`),
    domain: "greenhouse:delete",
    method: "DELETE",
    url: `/api/greenhouses/${id}`,
    body: {},
    invalidateKeys: [["/api/greenhouses"]],
  });
  triggerSync();
}

/* ---------------------------------------------------------------------------
 * Update / Delete: Campaign · Task · Irrigation · Observation · Inventory · Harvest
 * ------------------------------------------------------------------------- */

export async function queueUpdateCampaign(id: string, patch: UpdateCampaign) {
  patchList<Campaign>(["/api/campaigns"], (old) =>
    old.map((c) => {
      if (c.id !== id) return c;
      const next = { ...c, ...patch };
      if ((patch.scopeType && patch.scopeType !== c.scopeType) ||
          (patch.scopeId && patch.scopeId !== c.scopeId)) {
        next.scopeName = lookupScopeName(
          patch.scopeType ?? c.scopeType,
          patch.scopeId ?? c.scopeId,
        );
      }
      return next;
    }),
  );
  await enqueue({
    clientId: makeClientId(`cu-${id}`),
    domain: "campaign:update",
    method: "PATCH",
    url: `/api/campaigns/${id}`,
    body: patch,
    invalidateKeys: [["/api/campaigns"]],
  });
  triggerSync();
}

export async function queueDeleteCampaign(id: string) {
  patchList<Campaign>(["/api/campaigns"], (old) => old.filter((c) => c.id !== id));
  await enqueue({
    clientId: makeClientId(`cd-${id}`),
    domain: "campaign:delete",
    method: "DELETE",
    url: `/api/campaigns/${id}`,
    body: {},
    invalidateKeys: [["/api/campaigns"]],
  });
  triggerSync();
}

export async function queueUpdateTask(id: string, patch: UpdateTask) {
  patchList<Task>(["/api/tasks"], (old) =>
    old.map((t) => (t.id === id ? { ...t, ...patch } as Task : t)),
  );
  await enqueue({
    clientId: makeClientId(`tu-${id}`),
    domain: "task:update",
    method: "PATCH",
    url: `/api/tasks/${id}`,
    body: patch,
    invalidateKeys: [["/api/tasks"], ["/api/alerts"]],
  });
  triggerSync();
}

export async function queueDeleteTask(id: string) {
  patchList<Task>(["/api/tasks"], (old) => old.filter((t) => t.id !== id));
  await enqueue({
    clientId: makeClientId(`td-${id}`),
    domain: "task:delete",
    method: "DELETE",
    url: `/api/tasks/${id}`,
    body: {},
    invalidateKeys: [["/api/tasks"], ["/api/alerts"]],
  });
  triggerSync();
}

export async function queueUpdateIrrigation(id: string, patch: UpdateIrrigationEvent) {
  patchList<IrrigationEvent>(["/api/irrigation-events"], (old) =>
    old.map((i) => (i.id === id ? { ...i, ...patch } as IrrigationEvent : i)),
  );
  await enqueue({
    clientId: makeClientId(`iu-${id}`),
    domain: "irrigation:update",
    method: "PATCH",
    url: `/api/irrigation-events/${id}`,
    body: patch,
    invalidateKeys: [["/api/irrigation-events"]],
  });
  triggerSync();
}

export async function queueDeleteIrrigation(id: string) {
  patchList<IrrigationEvent>(["/api/irrigation-events"], (old) =>
    old.filter((i) => i.id !== id),
  );
  await enqueue({
    clientId: makeClientId(`id-${id}`),
    domain: "irrigation:delete",
    method: "DELETE",
    url: `/api/irrigation-events/${id}`,
    body: {},
    invalidateKeys: [["/api/irrigation-events"]],
  });
  triggerSync();
}

export async function queueDeleteObservation(id: string) {
  patchList<Observation>(["/api/observations"], (old) =>
    old.filter((o) => o.id !== id),
  );
  await enqueue({
    clientId: makeClientId(`od-${id}`),
    domain: "observation:delete",
    method: "DELETE",
    url: `/api/observations/${id}`,
    body: {},
    invalidateKeys: [["/api/observations"], ["/api/alerts"]],
  });
  triggerSync();
}

export async function queueUpdateInventoryItem(id: string, patch: UpdateInventoryItem) {
  patchList<InventoryItem>(["/api/inventory"], (old) =>
    old.map((i) => (i.id === id ? { ...i, ...patch } as InventoryItem : i)),
  );
  await enqueue({
    clientId: makeClientId(`ivu-${id}`),
    domain: "inventory:update",
    method: "PATCH",
    url: `/api/inventory/${id}/edit`,
    body: patch,
    invalidateKeys: [["/api/inventory"], ["/api/alerts"]],
  });
  triggerSync();
}

export async function queueDeleteInventoryItem(id: string) {
  patchList<InventoryItem>(["/api/inventory"], (old) =>
    old.filter((i) => i.id !== id),
  );
  await enqueue({
    clientId: makeClientId(`ivd-${id}`),
    domain: "inventory:delete",
    method: "DELETE",
    url: `/api/inventory/${id}`,
    body: {},
    invalidateKeys: [["/api/inventory"], ["/api/alerts"]],
  });
  triggerSync();
}

export async function queueUpdateHarvestLot(id: string, patch: UpdateHarvestLot) {
  patchList<HarvestLot>(["/api/harvest-lots"], (old) =>
    old.map((h) => (h.id === id ? { ...h, ...patch } as HarvestLot : h)),
  );
  await enqueue({
    clientId: makeClientId(`hu-${id}`),
    domain: "harvest:update",
    method: "PATCH",
    url: `/api/harvest-lots/${id}`,
    body: patch,
    invalidateKeys: [["/api/harvest-lots"]],
  });
  triggerSync();
}

export async function queueDeleteHarvestLot(id: string) {
  patchList<HarvestLot>(["/api/harvest-lots"], (old) =>
    old.filter((h) => h.id !== id),
  );
  await enqueue({
    clientId: makeClientId(`hd-${id}`),
    domain: "harvest:delete",
    method: "DELETE",
    url: `/api/harvest-lots/${id}`,
    body: {},
    invalidateKeys: [["/api/harvest-lots"]],
  });
  triggerSync();
}

/* ---------------------------------------------------------------------------
 * Settings
 * ------------------------------------------------------------------------- */

export async function queueUpdateSettings(input: Settings) {
  queryClient.setQueryData<Settings>(["/api/settings"], input);
  await enqueue({
    clientId: makeClientId("set"),
    domain: "settings:update",
    method: "PUT",
    url: "/api/settings",
    body: input,
    invalidateKeys: [["/api/settings"]],
  });
  triggerSync();
}

/* ---------------------------------------------------------------------------
 * Field applications
 * ------------------------------------------------------------------------- */

export interface CreateApplicationInput {
  scopeType: ScopeType;
  scopeId: string;
  campaignId?: string;
  applicationType: "fertilizer" | "pesticide" | "fungicide" | "herbicide" | "biological" | "other";
  productName: string;
  inventoryItemId?: string;
  dose?: number;
  doseUnit?: string;
  quantityUsed?: number;
  method?: string;
  appliedAt: string;
  responsible: string;
  targetProblem?: string;
  sourceTaskId?: string;
  sourceObservationId?: string;
  preHarvestIntervalDays?: number;
  notes?: string;
}

export async function queueCreateApplication(input: CreateApplicationInput) {
  const clientId = makeClientId("fa");
  await enqueue({
    clientId,
    domain: "application:create",
    method: "POST",
    url: "/api/applications",
    body: input,
    invalidateKeys: [
      ["/api/applications"],
      ["/api/inventory"],
      ["/api/alerts"],
    ],
  });
  triggerSync();
}

/* ---------------------------------------------------------------------------
 * Beekeeping
 * ------------------------------------------------------------------------- */

export interface CreateApiaryInput { name: string; location: string; lat?: number; lng?: number; notes?: string; }
export async function queueCreateApiary(input: CreateApiaryInput) {
  await enqueue({
    clientId: makeClientId("ap"),
    domain: "apiary:create",
    method: "POST",
    url: "/api/apiaries",
    body: { ...input, status: "ok" },
    invalidateKeys: [["/api/apiaries"]],
  });
  triggerSync();
}

export interface CreateHiveInput { apiaryId: string; code: string; notes?: string; }
export async function queueCreateHive(input: CreateHiveInput) {
  await enqueue({
    clientId: makeClientId("hv"),
    domain: "hive:create",
    method: "POST",
    url: "/api/hives",
    body: input,
    invalidateKeys: [["/api/hives"], ["/api/alerts"]],
  });
  triggerSync();
}

export interface CreateInspectionInput {
  hiveId: string;
  inspectedAt: string;
  inspector: string;
  queenSeen: boolean;
  queenStatus: "seen" | "not_seen" | "absent" | "replaced" | "unknown";
  colonyStrength: "weak" | "medium" | "strong";
  broodLevel: "none" | "low" | "medium" | "high";
  honeyStores: "none" | "low" | "medium" | "high";
  pestsOrDisease?: string;
  feedingGiven?: string;
  treatmentGiven?: string;
  inventoryItemId?: string;
  quantityUsed?: number;
  notes?: string;
}
export async function queueCreateInspection(input: CreateInspectionInput) {
  await enqueue({
    clientId: makeClientId("hi"),
    domain: "hive-inspection:create",
    method: "POST",
    url: "/api/hive-inspections",
    body: input,
    invalidateKeys: [
      ["/api/hive-inspections"],
      ["/api/hives"],
      ["/api/inventory"],
      ["/api/alerts"],
    ],
  });
  triggerSync();
}

export interface CreateHoneyHarvestInput {
  apiaryId: string; hiveId?: string; date: string;
  quantity: number; unit: string; destination?: string; notes?: string;
}
export async function queueCreateHoneyHarvest(input: CreateHoneyHarvestInput) {
  await enqueue({
    clientId: makeClientId("hh"),
    domain: "honey-harvest:create",
    method: "POST",
    url: "/api/honey-harvests",
    body: input,
    invalidateKeys: [["/api/honey-harvests"]],
  });
  triggerSync();
}

/* ---------------------------------------------------------------------------
 * Expenses + Labor (Finanzas)
 * ------------------------------------------------------------------------- */

export interface CreateExpenseInput {
  category: "insumo" | "jornal" | "transporte" | "maquinaria" | "riego" | "mantenimiento" | "apicultura" | "otro";
  amount: number;
  currency?: string;
  date: string;
  campaignId?: string;
  scopeType?: ScopeType;
  scopeId?: string;
  note?: string;
  createdBy?: string;
}
export async function queueCreateExpense(input: CreateExpenseInput) {
  await enqueue({
    clientId: makeClientId("exp"),
    domain: "expense:create",
    method: "POST",
    url: "/api/expenses",
    body: { currency: "BOB", ...input },
    invalidateKeys: [["/api/expenses"], ["/api/campaigns"]],
  });
  triggerSync();
}

export async function queueDeleteExpense(id: string) {
  await enqueue({
    clientId: makeClientId("expdel"),
    domain: "expense:delete",
    method: "DELETE",
    url: `/api/expenses/${id}`,
    body: null,
    invalidateKeys: [["/api/expenses"]],
  });
  triggerSync();
}

export interface CreateLaborInput {
  workerName: string;
  date: string;
  amount: number;
  currency?: string;
  taskId?: string;
  campaignId?: string;
  scopeType?: ScopeType;
  scopeId?: string;
  notes?: string;
}
export async function queueCreateLabor(input: CreateLaborInput) {
  await enqueue({
    clientId: makeClientId("lc"),
    domain: "labor:create",
    method: "POST",
    url: "/api/labor-costs",
    body: { currency: "BOB", ...input },
    invalidateKeys: [["/api/labor-costs"], ["/api/expenses"]],
  });
  triggerSync();
}

/* ---------------------------------------------------------------------------
 * Attachments — base64 in JSON
 * ------------------------------------------------------------------------- */

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    r.onerror = () => reject(new Error("No se pudo leer archivo"));
    r.readAsDataURL(file);
  });
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const MAX_BYTES = 10 * 1024 * 1024;

export interface UploadAttachmentInput {
  entityType: "observation" | "task" | "fieldApplication" | "harvestLot" | "hiveInspection" | "inventoryItem";
  entityId: string;
  file: File;
  createdBy?: string;
}

export async function queueUploadAttachment(input: UploadAttachmentInput) {
  if (!ALLOWED_MIME.has(input.file.type)) {
    throw new Error(`Tipo de archivo no permitido: ${input.file.type}`);
  }
  if (input.file.size > MAX_BYTES) {
    throw new Error("Archivo > 10MB");
  }
  const dataBase64 = await fileToBase64(input.file);
  await enqueue({
    clientId: makeClientId("att"),
    domain: "attachment:upload",
    method: "POST",
    url: "/api/attachments",
    body: {
      entityType: input.entityType,
      entityId: input.entityId,
      fileName: input.file.name,
      mimeType: input.file.type,
      sizeBytes: input.file.size,
      dataBase64,
      createdBy: input.createdBy,
    },
    invalidateKeys: [["/api/attachments"]],
  });
  triggerSync();
}

export async function queueDeleteAttachment(id: string) {
  await enqueue({
    clientId: makeClientId("attdel"),
    domain: "attachment:delete",
    method: "DELETE",
    url: `/api/attachments/${id}`,
    body: null,
    invalidateKeys: [["/api/attachments"]],
  });
  triggerSync();
}
