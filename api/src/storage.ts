import { randomUUID } from 'node:crypto';
export class InventoryStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryStockError';
  }
}
import {
  type Block,
  type Greenhouse,
  type Campaign,
  type IrrigationEvent,
  type Task,
  type Observation,
  type InventoryItem,
  type InventoryMovement,
  type InsertInventoryMovement,
  type InventoryMovementKind,
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
  type InsertHarvestLot,
  type ScopeType,
  type UpdateBlock,
  type UpdateGreenhouse,
  type UpdateCampaign,
  type UpdateTask,
  type UpdateIrrigationEvent,
  type UpdateInventoryItem,
  type UpdateHarvestLot,
} from '@agrosbo/shared/schema.js';
import {
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
} from './seed.js';

export interface IStorage {
  withTransaction?<T>(fn: (txStorage: IStorage, tx: any) => Promise<T>): Promise<T>;
  /* Blocks */
  listBlocks(): Promise<Block[]>;
  getBlock(id: string): Promise<Block | undefined>;
  createBlock(input: InsertBlock): Promise<Block>;
  updateBlock(id: string, patch: UpdateBlock): Promise<Block | undefined>;
  deleteBlock(id: string): Promise<boolean>;

  /* Greenhouses */
  listGreenhouses(): Promise<Greenhouse[]>;
  getGreenhouse(id: string): Promise<Greenhouse | undefined>;
  createGreenhouse(input: InsertGreenhouse): Promise<Greenhouse>;
  updateGreenhouse(id: string, patch: UpdateGreenhouse): Promise<Greenhouse | undefined>;
  deleteGreenhouse(id: string): Promise<boolean>;

  /* Campaigns */
  listCampaigns(): Promise<Campaign[]>;
  createCampaign(input: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, patch: UpdateCampaign): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;

  /* Irrigation */
  listIrrigationEvents(): Promise<IrrigationEvent[]>;
  createIrrigationEvent(input: InsertIrrigationEvent): Promise<IrrigationEvent>;
  markIrrigationDone(id: string): Promise<IrrigationEvent | undefined>;
  updateIrrigationEvent(
    id: string,
    patch: UpdateIrrigationEvent,
  ): Promise<IrrigationEvent | undefined>;
  deleteIrrigationEvent(id: string): Promise<boolean>;

  /* Tasks */
  listTasks(): Promise<Task[]>;
  createTask(input: InsertTask): Promise<Task>;
  updateTaskStatus(id: string, status: Task['status']): Promise<Task | undefined>;
  updateTask(id: string, patch: UpdateTask): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  /* Observations */
  listObservations(): Promise<Observation[]>;
  createObservation(input: InsertObservation): Promise<Observation>;
  deleteObservation(id: string): Promise<boolean>;

  /* Inventory */
  listInventory(): Promise<InventoryItem[]>;
  createInventoryItem(input: InsertInventoryItem): Promise<InventoryItem>;
  adjustInventoryStock(
    id: string,
    delta: number,
    lastMovement?: string,
  ): Promise<InventoryItem | undefined>;
  updateInventoryItem(id: string, patch: UpdateInventoryItem): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: string): Promise<boolean>;
  listInventoryMovements(itemId?: string): Promise<InventoryMovement[]>;
  createInventoryMovement(
    input: InsertInventoryMovement,
  ): Promise<{ item: InventoryItem; movement: InventoryMovement } | undefined>;

  /* Harvest */
  listHarvestLots(): Promise<HarvestLot[]>;
  createHarvestLot(input: InsertHarvestLot): Promise<HarvestLot>;
  updateHarvestLot(id: string, patch: UpdateHarvestLot): Promise<HarvestLot | undefined>;
  deleteHarvestLot(id: string): Promise<boolean>;

  /* Alerts */
  listAlerts(): Promise<Alert[]>;

  /* Settings */
  getSettings(): Promise<Settings>;
  updateSettings(input: Settings): Promise<Settings>;
}

/**
 * MemStorage — kept ONLY as an explicit, opt-in fallback for local dev
 * (set USE_MEM_STORAGE=1). Production reads/writes go through DbStorage.
 */
export class MemStorage implements IStorage {
  private blocks = new Map<string, Block>();
  private greenhouses = new Map<string, Greenhouse>();
  private campaigns = new Map<string, Campaign>();
  private irrigation = new Map<string, IrrigationEvent>();
  private tasks = new Map<string, Task>();
  private observations = new Map<string, Observation>();
  private inventory = new Map<string, InventoryItem>();
  private movements: InventoryMovement[] = [];
  private harvest = new Map<string, HarvestLot>();
  private alerts = new Map<string, Alert>();
  private settings: Settings = seedSettings;

  constructor() {
    seedBlocks.forEach((b) => this.blocks.set(b.id, b));
    seedGreenhouses.forEach((g) => this.greenhouses.set(g.id, g));
    seedCampaigns.forEach((c) => this.campaigns.set(c.id, c));
    seedIrrigationEvents.forEach((i) => this.irrigation.set(i.id, i));
    seedTasks.forEach((t) => this.tasks.set(t.id, t));
    seedObservations.forEach((o) => this.observations.set(o.id, o));
    seedInventory.forEach((i) => this.inventory.set(i.id, i));
    seedHarvestLots.forEach((h) => this.harvest.set(h.id, h));
    seedAlerts.forEach((a) => this.alerts.set(a.id, a));
  }

  private resolveScopeName(type: ScopeType, id: string): string {
    if (type === 'block') return this.blocks.get(id)?.name ?? 'Bloque desconocido';
    return this.greenhouses.get(id)?.name ?? 'Invernadero desconocido';
  }

  async withTransaction<T>(fn: (txStorage: IStorage, tx: any) => Promise<T>): Promise<T> {
    return await fn(this, null);
  }

  async listBlocks() {
    return Array.from(this.blocks.values());
  }
  async getBlock(id: string) {
    return this.blocks.get(id);
  }
  async createBlock(input: InsertBlock): Promise<Block> {
    const block: Block = { id: `b-${randomUUID().slice(0, 8)}`, ...input };
    this.blocks.set(block.id, block);
    return block;
  }
  async updateBlock(id: string, patch: UpdateBlock) {
    const cur = this.blocks.get(id);
    if (!cur) return undefined;
    const next: Block = { ...cur, ...patch };
    this.blocks.set(id, next);
    return next;
  }
  async deleteBlock(id: string) {
    return this.blocks.delete(id);
  }
  async listGreenhouses() {
    return Array.from(this.greenhouses.values());
  }
  async getGreenhouse(id: string) {
    return this.greenhouses.get(id);
  }
  async createGreenhouse(input: InsertGreenhouse): Promise<Greenhouse> {
    const g: Greenhouse = { id: `g-${randomUUID().slice(0, 8)}`, ...input };
    this.greenhouses.set(g.id, g);
    return g;
  }
  async updateGreenhouse(id: string, patch: UpdateGreenhouse) {
    const cur = this.greenhouses.get(id);
    if (!cur) return undefined;
    const next: Greenhouse = { ...cur, ...patch };
    this.greenhouses.set(id, next);
    return next;
  }
  async deleteGreenhouse(id: string) {
    return this.greenhouses.delete(id);
  }
  async listCampaigns() {
    return Array.from(this.campaigns.values());
  }
  async createCampaign(input: InsertCampaign): Promise<Campaign> {
    const c: Campaign = {
      id: `c-${randomUUID().slice(0, 8)}`,
      ...input,
      scopeName: this.resolveScopeName(input.scopeType, input.scopeId),
    };
    this.campaigns.set(c.id, c);
    return c;
  }
  async updateCampaign(id: string, patch: UpdateCampaign) {
    const cur = this.campaigns.get(id);
    if (!cur) return undefined;
    const scopeChanged =
      (patch.scopeType && patch.scopeType !== cur.scopeType) ||
      (patch.scopeId && patch.scopeId !== cur.scopeId);
    const next: Campaign = {
      ...cur,
      ...patch,
      scopeName: scopeChanged
        ? this.resolveScopeName(patch.scopeType ?? cur.scopeType, patch.scopeId ?? cur.scopeId)
        : cur.scopeName,
    };
    this.campaigns.set(id, next);
    return next;
  }
  async deleteCampaign(id: string) {
    return this.campaigns.delete(id);
  }
  async listIrrigationEvents() {
    return Array.from(this.irrigation.values());
  }
  async createIrrigationEvent(input: InsertIrrigationEvent): Promise<IrrigationEvent> {
    const ev: IrrigationEvent = {
      id: `i-${randomUUID().slice(0, 8)}`,
      ...input,
      scopeName: this.resolveScopeName(input.scopeType, input.scopeId),
    };
    this.irrigation.set(ev.id, ev);
    return ev;
  }
  async markIrrigationDone(id: string) {
    const ev = this.irrigation.get(id);
    if (!ev) return undefined;
    const updated: IrrigationEvent = { ...ev, status: 'done' };
    this.irrigation.set(id, updated);
    return updated;
  }
  async updateIrrigationEvent(id: string, patch: UpdateIrrigationEvent) {
    const cur = this.irrigation.get(id);
    if (!cur) return undefined;
    const scopeChanged =
      (patch.scopeType && patch.scopeType !== cur.scopeType) ||
      (patch.scopeId && patch.scopeId !== cur.scopeId);
    const next: IrrigationEvent = {
      ...cur,
      ...patch,
      scopeName: scopeChanged
        ? this.resolveScopeName(patch.scopeType ?? cur.scopeType, patch.scopeId ?? cur.scopeId)
        : cur.scopeName,
    };
    this.irrigation.set(id, next);
    return next;
  }
  async deleteIrrigationEvent(id: string) {
    return this.irrigation.delete(id);
  }
  async listTasks() {
    return Array.from(this.tasks.values());
  }
  async createTask(input: InsertTask): Promise<Task> {
    const t: Task = {
      id: `t-${randomUUID().slice(0, 8)}`,
      ...input,
      scopeName: this.resolveScopeName(input.scopeType, input.scopeId),
    };
    this.tasks.set(t.id, t);
    return t;
  }
  async updateTaskStatus(id: string, status: Task['status']) {
    const t = this.tasks.get(id);
    if (!t) return undefined;
    const updated: Task = { ...t, status };
    this.tasks.set(id, updated);
    return updated;
  }
  async updateTask(id: string, patch: UpdateTask) {
    const cur = this.tasks.get(id);
    if (!cur) return undefined;
    const scopeChanged =
      (patch.scopeType && patch.scopeType !== cur.scopeType) ||
      (patch.scopeId && patch.scopeId !== cur.scopeId);
    const next: Task = {
      ...cur,
      ...patch,
      scopeName: scopeChanged
        ? this.resolveScopeName(patch.scopeType ?? cur.scopeType, patch.scopeId ?? cur.scopeId)
        : cur.scopeName,
    };
    this.tasks.set(id, next);
    return next;
  }
  async deleteTask(id: string) {
    return this.tasks.delete(id);
  }
  async listObservations() {
    return Array.from(this.observations.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
  async createObservation(input: InsertObservation): Promise<Observation> {
    const o: Observation = {
      id: `o-${randomUUID().slice(0, 8)}`,
      ...input,
      scopeName: this.resolveScopeName(input.scopeType, input.scopeId),
      createdAt: new Date().toISOString(),
      pendingSync: true,
    };
    this.observations.set(o.id, o);
    return o;
  }
  async deleteObservation(id: string) {
    return this.observations.delete(id);
  }
  async listInventory() {
    return Array.from(this.inventory.values());
  }
  async createInventoryItem(input: InsertInventoryItem): Promise<InventoryItem> {
    const it: InventoryItem = { id: `iv-${randomUUID().slice(0, 8)}`, ...input };
    this.inventory.set(it.id, it);
    return it;
  }
  async adjustInventoryStock(id: string, delta: number, lastMovement?: string) {
    const cur = this.inventory.get(id);
    if (!cur) return undefined;
    const next: InventoryItem = {
      ...cur,
      stock: Math.max(0, cur.stock + delta),
      lastMovement: lastMovement ?? new Date().toISOString().slice(0, 10),
    };
    this.inventory.set(id, next);
    return next;
  }
  async updateInventoryItem(id: string, patch: UpdateInventoryItem) {
    const cur = this.inventory.get(id);
    if (!cur) return undefined;
    const next: InventoryItem = { ...cur, ...patch };
    this.inventory.set(id, next);
    return next;
  }
  async deleteInventoryItem(id: string) {
    this.movements = this.movements.filter((m) => m.itemId !== id);
    return this.inventory.delete(id);
  }
  async listInventoryMovements(itemId?: string) {
    const all = itemId ? this.movements.filter((m) => m.itemId === itemId) : this.movements.slice();
    return all.sort((a, b) => b.at.localeCompare(a.at));
  }
  async createInventoryMovement(input: InsertInventoryMovement) {
    const cur = this.inventory.get(input.itemId);
    if (!cur) return undefined;
    const delta = input.delta;
    if (delta < 0 && cur.stock + delta < 0) {
      throw new InventoryStockError('Stock insuficiente');
    }
    const nextStock = cur.stock + delta;
    const at = input.at ?? new Date().toISOString();
    const kind: InventoryMovementKind = delta > 0 ? 'in' : 'out';
    const unitCost = input.unitCost ?? cur.unitCost;
    const currency = input.currency ?? cur.currency;
    const totalCost = typeof unitCost === 'number' ? Math.abs(delta) * unitCost : undefined;
    const movement: InventoryMovement = {
      id: `mv-${randomUUID().slice(0, 8)}`,
      itemId: input.itemId,
      kind,
      delta,
      note: input.note,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      taskId: input.taskId,
      unitCost,
      currency,
      totalCost,
      at,
      createdAt: new Date().toISOString(),
    };
    this.movements.push(movement);
    const nextItem: InventoryItem = {
      ...cur,
      stock: nextStock,
      lastMovement: at.slice(0, 10),
      ...(unitCost !== undefined && cur.unitCost === undefined ? { unitCost } : {}),
      ...(currency !== undefined && cur.currency === undefined ? { currency } : {}),
    };
    this.inventory.set(cur.id, nextItem);
    return { item: nextItem, movement };
  }
  async listHarvestLots() {
    return Array.from(this.harvest.values());
  }
  async createHarvestLot(input: InsertHarvestLot): Promise<HarvestLot> {
    const h: HarvestLot = {
      id: `h-${randomUUID().slice(0, 8)}`,
      ...input,
      origin: this.resolveScopeName(input.originType, input.originId),
    };
    this.harvest.set(h.id, h);
    return h;
  }
  async updateHarvestLot(id: string, patch: UpdateHarvestLot) {
    const cur = this.harvest.get(id);
    if (!cur) return undefined;
    const originChanged =
      (patch.originType && patch.originType !== cur.originType) ||
      (patch.originId && patch.originId !== cur.originId);
    const next: HarvestLot = {
      ...cur,
      ...patch,
      origin: originChanged
        ? this.resolveScopeName(patch.originType ?? cur.originType, patch.originId ?? cur.originId)
        : cur.origin,
    };
    this.harvest.set(id, next);
    return next;
  }
  async deleteHarvestLot(id: string) {
    return this.harvest.delete(id);
  }
  async listAlerts() {
    return Array.from(this.alerts.values());
  }
  async getSettings() {
    return this.settings;
  }
  async updateSettings(input: Settings) {
    this.settings = input;
    return this.settings;
  }
}

import { DbStorage } from './dbStorage.js';
import { env } from './env.js';
import { createLogger } from './logger.js';

const storageLog = createLogger('storage');

let singletonStorage: IStorage | null = null;

export function getGlobalStorage(): IStorage {
  if (!singletonStorage) {
    singletonStorage = env.useMemStorage ? new MemStorage() : new DbStorage();
  }
  return singletonStorage;
}

export const storage: IStorage = new Proxy(
  {} as IStorage,
  {
    get(_target, prop) {
      const s = getGlobalStorage() as any;
      const val = s[prop];
      return typeof val === 'function' ? val.bind(s) : val;
    },
  },
);
