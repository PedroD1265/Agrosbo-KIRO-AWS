import { z } from 'zod';
import {
  pgTable,
  pgEnum,
  varchar,
  text,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/* ========================================================================
 * Enums (Zod + pg)
 * ====================================================================== */

export const operationalStatusSchema = z.enum(['ok', 'warn', 'critical', 'idle', 'pending-sync']);
export type OperationalStatus = z.infer<typeof operationalStatusSchema>;
export const operationalStatusEnum = pgEnum('operational_status', [
  'ok',
  'warn',
  'critical',
  'idle',
  'pending-sync',
]);

export const cropStageSchema = z.enum(['seed', 'veg', 'flower', 'harvest']);
export type CropStage = z.infer<typeof cropStageSchema>;
export const cropStageEnum = pgEnum('crop_stage', ['seed', 'veg', 'flower', 'harvest']);

export const scopeTypeSchema = z.enum(['block', 'greenhouse']);
export type ScopeType = z.infer<typeof scopeTypeSchema>;
export const scopeTypeEnum = pgEnum('scope_type', ['block', 'greenhouse']);

export const taskPrioritySchema = z.enum(['low', 'med', 'high']);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'med', 'high']);

export const taskStatusSchema = z.enum(['pending', 'in_progress', 'done']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'done']);

export const irrigationStatusSchema = z.enum(['scheduled', 'done', 'skipped', 'pending-sync']);
export type IrrigationStatus = z.infer<typeof irrigationStatusSchema>;
export const irrigationStatusEnum = pgEnum('irrigation_status', [
  'scheduled',
  'done',
  'skipped',
  'pending-sync',
]);

export const observationTypeSchema = z.enum(['note', 'incident', 'pest', 'disease', 'general']);
export type ObservationType = z.infer<typeof observationTypeSchema>;
export const observationTypeEnum = pgEnum('observation_type', [
  'note',
  'incident',
  'pest',
  'disease',
  'general',
]);

/* ========================================================================
 * Tables
 * ====================================================================== */

export const organizations = pgTable('organizations', {
  id: varchar('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  timezone: text('timezone').notNull(),
  preferOffline: boolean('prefer_offline').notNull().default(true),
  confirmBeforeSync: boolean('confirm_before_sync').notNull().default(false),
  criticalAlertsBanner: boolean('critical_alerts_banner').notNull().default(true),
});

export const farms = pgTable('farms', {
  id: varchar('id').primaryKey(),
  orgId: varchar('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  name: text('name').notNull(),
});

export const blocks = pgTable('blocks', {
  id: varchar('id').primaryKey(),
  name: text('name').notNull(),
  farm: text('farm').notNull(),
  areaHa: doublePrecision('area_ha').notNull(),
  crop: text('crop').notNull(),
  variety: text('variety'),
  stage: cropStageEnum('stage').notNull(),
  lastIrrigation: text('last_irrigation').notNull(),
  status: operationalStatusEnum('status').notNull(),
  alerts: integer('alerts').notNull().default(0),
  centroidLat: doublePrecision('centroid_lat'),
  centroidLng: doublePrecision('centroid_lng'),
  boundary: jsonb('boundary'),
});

export const greenhouses = pgTable('greenhouses', {
  id: varchar('id').primaryKey(),
  name: text('name').notNull(),
  areaM2: doublePrecision('area_m2').notNull(),
  crop: text('crop').notNull(),
  variety: text('variety'),
  stage: cropStageEnum('stage').notNull(),
  status: operationalStatusEnum('status').notNull(),
  alerts: integer('alerts').notNull().default(0),
  tempC: doublePrecision('temp_c'),
  humidity: doublePrecision('humidity'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  footprint: jsonb('footprint'),
});

export const campaigns = pgTable(
  'campaigns',
  {
    id: varchar('id').primaryKey(),
    scopeType: scopeTypeEnum('scope_type').notNull(),
    scopeId: varchar('scope_id').notNull(),
    scopeName: text('scope_name').notNull(),
    crop: text('crop').notNull(),
    variety: text('variety').notNull(),
    startDate: text('start_date').notNull(),
    endDate: text('end_date').notNull(),
    stage: cropStageEnum('stage').notNull(),
    progress: integer('progress').notNull().default(0),
    status: operationalStatusEnum('status').notNull(),
  },
  (t) => ({
    scopeIdx: index('campaigns_scope_idx').on(t.scopeType, t.scopeId),
    progressCk: check('campaigns_progress_ck', sql`${t.progress} >= 0 AND ${t.progress} <= 100`),
  }),
);

export const irrigationEvents = pgTable(
  'irrigation_events',
  {
    id: varchar('id').primaryKey(),
    scopeType: scopeTypeEnum('scope_type').notNull(),
    scopeId: varchar('scope_id').notNull(),
    scopeName: text('scope_name').notNull(),
    scheduledAt: text('scheduled_at').notNull(),
    durationMin: integer('duration_min').notNull(),
    volumeL: doublePrecision('volume_l'),
    status: irrigationStatusEnum('status').notNull(),
    responsible: text('responsible'),
    notes: text('notes'),
  },
  (t) => ({
    scopeIdx: index('irrigation_scope_idx').on(t.scopeType, t.scopeId),
    statusIdx: index('irrigation_status_idx').on(t.status),
    durationCk: check('irrigation_duration_ck', sql`${t.durationMin} > 0`),
  }),
);

export const tasks = pgTable(
  'tasks',
  {
    id: varchar('id').primaryKey(),
    title: text('title').notNull(),
    scopeType: scopeTypeEnum('scope_type').notNull(),
    scopeId: varchar('scope_id').notNull(),
    scopeName: text('scope_name').notNull(),
    assignee: text('assignee'),
    dueDate: text('due_date').notNull(),
    priority: taskPriorityEnum('priority').notNull(),
    status: taskStatusEnum('status').notNull(),
    notes: text('notes'),
    checklist: jsonb('checklist'),
    sourceObservationId: varchar('source_observation_id'),
  },
  (t) => ({
    scopeIdx: index('tasks_scope_idx').on(t.scopeType, t.scopeId),
    sourceObsIdx: index('tasks_source_obs_idx').on(t.sourceObservationId),
    statusIdx: index('tasks_status_idx').on(t.status),
    dueIdx: index('tasks_due_idx').on(t.dueDate),
  }),
);

export const observations = pgTable(
  'observations',
  {
    id: varchar('id').primaryKey(),
    scopeType: scopeTypeEnum('scope_type').notNull(),
    scopeId: varchar('scope_id').notNull(),
    scopeName: text('scope_name').notNull(),
    author: text('author').notNull(),
    createdAt: text('created_at').notNull(),
    type: observationTypeEnum('type').notNull(),
    text: text('text').notNull(),
    hasPhotos: integer('has_photos').notNull().default(0),
    pendingSync: boolean('pending_sync'),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
  },
  (t) => ({
    scopeIdx: index('observations_scope_idx').on(t.scopeType, t.scopeId),
    createdIdx: index('observations_created_idx').on(t.createdAt),
  }),
);

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: varchar('id').primaryKey(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    unit: text('unit').notNull(),
    stock: doublePrecision('stock').notNull(),
    min: doublePrecision('min').notNull(),
    lastMovement: text('last_movement').notNull(),
    unitCost: doublePrecision('unit_cost'),
    currency: text('currency'),
  },
  (t) => ({
    categoryIdx: index('inventory_category_idx').on(t.category),
    stockCk: check('inventory_stock_ck', sql`${t.stock} >= 0`),
    minCk: check('inventory_min_ck', sql`${t.min} >= 0`),
    unitCostCk: check('inventory_unit_cost_ck', sql`${t.unitCost} IS NULL OR ${t.unitCost} >= 0`),
  }),
);

export const inventoryMovementKindSchema = z.enum(['in', 'out', 'adjust']);
export type InventoryMovementKind = z.infer<typeof inventoryMovementKindSchema>;
export const inventoryMovementKindEnum = pgEnum('inventory_movement_kind', ['in', 'out', 'adjust']);

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: varchar('id').primaryKey(),
    itemId: varchar('item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    kind: inventoryMovementKindEnum('kind').notNull(),
    delta: doublePrecision('delta').notNull(),
    note: text('note'),
    scopeType: scopeTypeEnum('scope_type'),
    scopeId: varchar('scope_id'),
    taskId: varchar('task_id'),
    unitCost: doublePrecision('unit_cost'),
    currency: text('currency'),
    totalCost: doublePrecision('total_cost'),
    at: text('at').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    itemIdx: index('inventory_movements_item_idx').on(t.itemId),
    atIdx: index('inventory_movements_at_idx').on(t.at),
  }),
);

export const harvestLots = pgTable(
  'harvest_lots',
  {
    id: varchar('id').primaryKey(),
    code: text('code').notNull(),
    originType: scopeTypeEnum('origin_type').notNull(),
    originId: varchar('origin_id').notNull(),
    origin: text('origin').notNull(),
    crop: text('crop').notNull(),
    variety: text('variety').notNull(),
    date: text('date').notNull(),
    quantity: doublePrecision('quantity').notNull(),
    unit: text('unit').notNull(),
    destination: text('destination'),
    status: operationalStatusEnum('status').notNull(),
    campaignId: varchar('campaign_id'),
    unitPrice: doublePrecision('unit_price'),
    currency: text('currency'),
    costAllocated: doublePrecision('cost_allocated'),
  },
  (t) => ({
    codeUq: uniqueIndex('harvest_lots_code_uq').on(t.code),
    originIdx: index('harvest_lots_origin_idx').on(t.originType, t.originId),
    campaignIdx: index('harvest_lots_campaign_idx').on(t.campaignId),
    quantityCk: check('harvest_lots_quantity_ck', sql`${t.quantity} > 0`),
    unitPriceCk: check(
      'harvest_lots_unit_price_ck',
      sql`${t.unitPrice} IS NULL OR ${t.unitPrice} >= 0`,
    ),
    costAllocatedCk: check(
      'harvest_lots_cost_allocated_ck',
      sql`${t.costAllocated} IS NULL OR ${t.costAllocated} >= 0`,
    ),
  }),
);

/* ----- Users / roles (auth-ready, runtime opt-in) ----- */
export const userRoleSchema = z.enum(['admin', 'tecnico', 'encargado', 'operario', 'finanzas']);
export type UserRole = z.infer<typeof userRoleSchema>;
export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'tecnico',
  'encargado',
  'operario',
  'finanzas',
]);

export const users = pgTable(
  'users',
  {
    id: varchar('id').primaryKey(),
    orgId: varchar('org_id').notNull(),
    name: text('name').notNull(),
    email: text('email'),
    username: text('username'),
    passwordHash: text('password_hash'),
    role: userRoleEnum('role').notNull().default('operario'),
    active: boolean('active').notNull().default(true),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_uq').on(t.email),
    usernameIdx: uniqueIndex('users_username_uq').on(t.username),
    roleIdx: index('users_role_idx').on(t.role),
  }),
);

/* ----- Attachments (offline-first media) ----- */
export const attachmentEntityTypeSchema = z.enum([
  'observation',
  'task',
  'fieldApplication',
  'harvestLot',
  'hiveInspection',
  'inventoryItem',
]);
export type AttachmentEntityType = z.infer<typeof attachmentEntityTypeSchema>;
export const attachmentEntityTypeEnum = pgEnum('attachment_entity_type', [
  'observation',
  'task',
  'fieldApplication',
  'harvestLot',
  'hiveInspection',
  'inventoryItem',
]);
export const attachmentLocalStatusSchema = z.enum(['pending', 'uploading', 'uploaded', 'failed']);
export type AttachmentLocalStatus = z.infer<typeof attachmentLocalStatusSchema>;
export const attachmentLocalStatusEnum = pgEnum('attachment_local_status', [
  'pending',
  'uploading',
  'uploaded',
  'failed',
]);

export const attachments = pgTable(
  'attachments',
  {
    id: varchar('id').primaryKey(),
    entityType: attachmentEntityTypeEnum('entity_type').notNull(),
    entityId: varchar('entity_id').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    localStatus: attachmentLocalStatusEnum('local_status').notNull().default('uploaded'),
    remoteUrl: text('remote_url'),
    thumbnailUrl: text('thumbnail_url'),
    createdAt: text('created_at').notNull(),
    uploadedAt: text('uploaded_at'),
    error: text('error'),
    createdBy: varchar('created_by'),
  },
  (t) => ({
    entityIdx: index('attachments_entity_idx').on(t.entityType, t.entityId),
    sizeCk: check('attachments_size_ck', sql`${t.sizeBytes} >= 0 AND ${t.sizeBytes} <= 10485760`),
  }),
);

/* ----- Expenses (gastos agrícolas) ----- */
export const expenseCategorySchema = z.enum([
  'insumo',
  'jornal',
  'transporte',
  'maquinaria',
  'riego',
  'mantenimiento',
  'apicultura',
  'otro',
]);
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;
export const expenseCategoryEnum = pgEnum('expense_category', [
  'insumo',
  'jornal',
  'transporte',
  'maquinaria',
  'riego',
  'mantenimiento',
  'apicultura',
  'otro',
]);

export const expenses = pgTable(
  'expenses',
  {
    id: varchar('id').primaryKey(),
    scopeType: scopeTypeEnum('scope_type'),
    scopeId: varchar('scope_id'),
    campaignId: varchar('campaign_id'),
    category: expenseCategoryEnum('category').notNull(),
    amount: doublePrecision('amount').notNull(),
    currency: text('currency').notNull().default('BOB'),
    date: text('date').notNull(),
    note: text('note'),
    relatedEntityType: text('related_entity_type'),
    relatedEntityId: varchar('related_entity_id'),
    createdBy: varchar('created_by'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    dateIdx: index('expenses_date_idx').on(t.date),
    campIdx: index('expenses_camp_idx').on(t.campaignId),
    scopeIdx: index('expenses_scope_idx').on(t.scopeType, t.scopeId),
    categoryIdx: index('expenses_category_idx').on(t.category),
    amountCk: check('expenses_amount_ck', sql`${t.amount} >= 0`),
  }),
);

/* ----- Labor costs (jornales) ----- */
export const laborCosts = pgTable(
  'labor_costs',
  {
    id: varchar('id').primaryKey(),
    workerName: text('worker_name').notNull(),
    date: text('date').notNull(),
    amount: doublePrecision('amount').notNull(),
    currency: text('currency').notNull().default('BOB'),
    taskId: varchar('task_id'),
    campaignId: varchar('campaign_id'),
    scopeType: scopeTypeEnum('scope_type'),
    scopeId: varchar('scope_id'),
    notes: text('notes'),
    expenseId: varchar('expense_id'),
    createdBy: varchar('created_by'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    dateIdx: index('labor_date_idx').on(t.date),
    campIdx: index('labor_camp_idx').on(t.campaignId),
    amountCk: check('labor_amount_ck', sql`${t.amount} >= 0`),
  }),
);

/* ----- Field applications (fitosanitarios / fertilizantes / etc) ----- */
export const applicationTypeSchema = z.enum([
  'fertilizer',
  'pesticide',
  'fungicide',
  'herbicide',
  'biological',
  'other',
]);
export type ApplicationType = z.infer<typeof applicationTypeSchema>;
export const applicationTypeEnum = pgEnum('application_type', [
  'fertilizer',
  'pesticide',
  'fungicide',
  'herbicide',
  'biological',
  'other',
]);

export const fieldApplications = pgTable(
  'field_applications',
  {
    id: varchar('id').primaryKey(),
    scopeType: scopeTypeEnum('scope_type').notNull(),
    scopeId: varchar('scope_id').notNull(),
    scopeName: text('scope_name').notNull(),
    campaignId: varchar('campaign_id'),
    applicationType: applicationTypeEnum('application_type').notNull(),
    productName: text('product_name').notNull(),
    inventoryItemId: varchar('inventory_item_id'),
    dose: doublePrecision('dose'),
    doseUnit: text('dose_unit'),
    quantityUsed: doublePrecision('quantity_used'),
    method: text('method'),
    appliedAt: text('applied_at').notNull(),
    responsible: text('responsible').notNull(),
    targetProblem: text('target_problem'),
    sourceTaskId: varchar('source_task_id'),
    sourceObservationId: varchar('source_observation_id'),
    preHarvestIntervalDays: integer('pre_harvest_interval_days'),
    safeHarvestDate: text('safe_harvest_date'),
    notes: text('notes'),
    movementId: varchar('movement_id'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    scopeIdx: index('field_apps_scope_idx').on(t.scopeType, t.scopeId),
    campIdx: index('field_apps_camp_idx').on(t.campaignId),
    safeHarvestIdx: index('field_apps_safe_idx').on(t.safeHarvestDate),
  }),
);

/* ----- Beekeeping ----- */
export const queenStatusSchema = z.enum(['seen', 'not_seen', 'absent', 'replaced', 'unknown']);
export type QueenStatus = z.infer<typeof queenStatusSchema>;
export const queenStatusEnum = pgEnum('queen_status', [
  'seen',
  'not_seen',
  'absent',
  'replaced',
  'unknown',
]);

export const colonyLevelSchema = z.enum(['weak', 'medium', 'strong']);
export type ColonyLevel = z.infer<typeof colonyLevelSchema>;
export const colonyLevelEnum = pgEnum('colony_level', ['weak', 'medium', 'strong']);

export const broodLevelSchema = z.enum(['none', 'low', 'medium', 'high']);
export type BroodLevel = z.infer<typeof broodLevelSchema>;
export const broodLevelEnum = pgEnum('brood_level', ['none', 'low', 'medium', 'high']);

export const honeyLevelSchema = z.enum(['none', 'low', 'medium', 'high']);
export type HoneyLevel = z.infer<typeof honeyLevelSchema>;
export const honeyLevelEnum = pgEnum('honey_level', ['none', 'low', 'medium', 'high']);

export const apiaries = pgTable('apiaries', {
  id: varchar('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  notes: text('notes'),
  status: operationalStatusEnum('status').notNull().default('ok'),
  createdAt: text('created_at').notNull(),
});

export const hives = pgTable(
  'hives',
  {
    id: varchar('id').primaryKey(),
    apiaryId: varchar('apiary_id')
      .notNull()
      .references(() => apiaries.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    code: text('code').notNull(),
    status: operationalStatusEnum('status').notNull().default('ok'),
    queenStatus: queenStatusEnum('queen_status').notNull().default('unknown'),
    colonyStrength: colonyLevelEnum('colony_strength').notNull().default('medium'),
    broodLevel: broodLevelEnum('brood_level').notNull().default('medium'),
    honeyStores: honeyLevelEnum('honey_stores').notNull().default('medium'),
    lastInspectionAt: text('last_inspection_at'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    apiaryIdx: index('hives_apiary_idx').on(t.apiaryId),
    lastInspIdx: index('hives_last_insp_idx').on(t.lastInspectionAt),
  }),
);

export const hiveInspections = pgTable(
  'hive_inspections',
  {
    id: varchar('id').primaryKey(),
    hiveId: varchar('hive_id')
      .notNull()
      .references(() => hives.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    inspectedAt: text('inspected_at').notNull(),
    inspector: text('inspector').notNull(),
    queenSeen: boolean('queen_seen').notNull().default(false),
    queenStatus: queenStatusEnum('queen_status').notNull(),
    colonyStrength: colonyLevelEnum('colony_strength').notNull(),
    broodLevel: broodLevelEnum('brood_level').notNull(),
    honeyStores: honeyLevelEnum('honey_stores').notNull(),
    pestsOrDisease: text('pests_or_disease'),
    feedingGiven: text('feeding_given'),
    treatmentGiven: text('treatment_given'),
    inventoryItemId: varchar('inventory_item_id'),
    quantityUsed: doublePrecision('quantity_used'),
    movementId: varchar('movement_id'),
    notes: text('notes'),
    hasPhotos: integer('has_photos').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    hiveIdx: index('hive_inspections_hive_idx').on(t.hiveId),
    atIdx: index('hive_inspections_at_idx').on(t.inspectedAt),
  }),
);

export const honeyHarvests = pgTable(
  'honey_harvests',
  {
    id: varchar('id').primaryKey(),
    apiaryId: varchar('apiary_id')
      .notNull()
      .references(() => apiaries.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    hiveId: varchar('hive_id'),
    date: text('date').notNull(),
    quantity: doublePrecision('quantity').notNull(),
    unit: text('unit').notNull(),
    destination: text('destination'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    apiaryIdx: index('honey_harvests_apiary_idx').on(t.apiaryId),
    dateIdx: index('honey_harvests_date_idx').on(t.date),
  }),
);

export const alerts = pgTable('alerts', {
  id: varchar('id').primaryKey(),
  level: operationalStatusEnum('level').notNull(),
  scope: text('scope').notNull(),
  message: text('message').notNull(),
  at: text('at').notNull(),
});

/* ========================================================================
 * Zod schemas (canonical contracts shared by API + frontend)
 * ====================================================================== */

/* --- Blocks --- */
import { geoJsonPolygonSchema } from './spatial.js';

export const blockSchema = z.object({
  id: z.string(),
  name: z.string(),
  farm: z.string(),
  areaHa: z.number(),
  crop: z.string(),
  variety: z.string().optional(),
  stage: cropStageSchema,
  lastIrrigation: z.string(),
  status: operationalStatusSchema,
  alerts: z.number().int().nonnegative(),
  centroidLat: z.number().optional(),
  centroidLng: z.number().optional(),
  boundary: geoJsonPolygonSchema.optional(),
});
export type Block = z.infer<typeof blockSchema>;
export const insertBlockSchema = blockSchema.omit({ id: true });
export type InsertBlock = z.infer<typeof insertBlockSchema>;

/* --- Greenhouses --- */
export const greenhouseSchema = z.object({
  id: z.string(),
  name: z.string(),
  areaM2: z.number(),
  crop: z.string(),
  variety: z.string().optional(),
  stage: cropStageSchema,
  status: operationalStatusSchema,
  alerts: z.number().int().nonnegative(),
  tempC: z.number().optional(),
  humidity: z.number().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  footprint: geoJsonPolygonSchema.optional(),
});
export type Greenhouse = z.infer<typeof greenhouseSchema>;
export const insertGreenhouseSchema = greenhouseSchema.omit({ id: true });
export type InsertGreenhouse = z.infer<typeof insertGreenhouseSchema>;

/* --- Campaigns --- */
export const campaignSchema = z.object({
  id: z.string(),
  scopeType: scopeTypeSchema,
  scopeId: z.string(),
  scopeName: z.string(),
  crop: z.string(),
  variety: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  stage: cropStageSchema,
  progress: z.number().int().min(0).max(100),
  status: operationalStatusSchema,
});
export type Campaign = z.infer<typeof campaignSchema>;
export const insertCampaignSchema = campaignSchema.omit({
  id: true,
  scopeName: true,
});
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

/* --- Irrigation Events --- */
export const irrigationEventSchema = z.object({
  id: z.string(),
  scopeType: scopeTypeSchema,
  scopeId: z.string(),
  scopeName: z.string(),
  scheduledAt: z.string(),
  durationMin: z.number().int().positive(),
  volumeL: z.number().optional(),
  status: irrigationStatusSchema,
  responsible: z.string().optional(),
  notes: z.string().optional(),
});
export type IrrigationEvent = z.infer<typeof irrigationEventSchema>;
export const insertIrrigationEventSchema = irrigationEventSchema
  .omit({ id: true, scopeName: true })
  .extend({
    status: irrigationStatusSchema.default('pending-sync'),
  });
export type InsertIrrigationEvent = z.infer<typeof insertIrrigationEventSchema>;

/* --- Tasks --- */
export const checklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  done: z.boolean(),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  scopeType: scopeTypeSchema,
  scopeId: z.string(),
  scopeName: z.string(),
  assignee: z.string().optional(),
  dueDate: z.string(),
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  notes: z.string().optional(),
  checklist: z.array(checklistItemSchema).optional(),
  sourceObservationId: z.string().optional(),
});
export type Task = z.infer<typeof taskSchema>;
export const insertTaskSchema = taskSchema
  .omit({ id: true, scopeName: true, checklist: true })
  .extend({
    id: z.string().optional(),
    status: taskStatusSchema.default('pending'),
  });
export type InsertTask = z.infer<typeof insertTaskSchema>;

/* --- Observations --- */
export const observationSchema = z.object({
  id: z.string(),
  scopeType: scopeTypeSchema,
  scopeId: z.string(),
  scopeName: z.string(),
  author: z.string(),
  createdAt: z.string(),
  type: observationTypeSchema,
  text: z.string().min(1),
  hasPhotos: z.number().int().nonnegative(),
  pendingSync: z.boolean().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
export type Observation = z.infer<typeof observationSchema>;
export const insertObservationSchema = observationSchema
  .omit({ id: true, scopeName: true, createdAt: true, hasPhotos: true })
  .extend({
    hasPhotos: z.number().int().nonnegative().default(0),
  });
export type InsertObservation = z.infer<typeof insertObservationSchema>;

/* --- Inventory --- */
export const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  unit: z.string(),
  stock: z.number(),
  min: z.number(),
  lastMovement: z.string(),
  unitCost: z.number().nonnegative().optional(),
  currency: z.string().min(1).max(8).optional(),
});
export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export const insertInventoryItemSchema = inventoryItemSchema.omit({ id: true });
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

/* --- Inventory Movements --- */
export const inventoryMovementSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  kind: inventoryMovementKindSchema,
  delta: z.number().refine((v) => v !== 0, 'delta != 0'),
  note: z.string().optional(),
  scopeType: scopeTypeSchema.optional(),
  scopeId: z.string().optional(),
  taskId: z.string().optional(),
  unitCost: z.number().nonnegative().optional(),
  currency: z.string().min(1).max(8).optional(),
  totalCost: z.number().nonnegative().optional(),
  at: z.string(),
  createdAt: z.string(),
});
export type InventoryMovement = z.infer<typeof inventoryMovementSchema>;

export const insertInventoryMovementSchema = inventoryMovementSchema
  .omit({ id: true, createdAt: true, totalCost: true, kind: true })
  .extend({
    at: z.string().optional(),
  });
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;

/* --- Harvest Lots --- */
export const harvestLotSchema = z.object({
  id: z.string(),
  code: z.string(),
  originType: scopeTypeSchema,
  originId: z.string(),
  origin: z.string(),
  crop: z.string(),
  variety: z.string(),
  date: z.string(),
  quantity: z.number(),
  unit: z.string(),
  destination: z.string().optional(),
  status: operationalStatusSchema,
  campaignId: z.string().optional(),
  unitPrice: z.number().nonnegative().optional(),
  currency: z.string().min(1).max(8).optional(),
  costAllocated: z.number().nonnegative().optional(),
});
export type HarvestLot = z.infer<typeof harvestLotSchema>;
export const insertHarvestLotSchema = harvestLotSchema.omit({
  id: true,
  origin: true,
});
export type InsertHarvestLot = z.infer<typeof insertHarvestLotSchema>;

/* --- Alerts --- */
export const alertSchema = z.object({
  id: z.string(),
  level: operationalStatusSchema,
  scope: z.string(),
  message: z.string(),
  at: z.string(),
});
export type Alert = z.infer<typeof alertSchema>;

/* --- Update (PATCH) schemas --- */
export const updateBlockSchema = insertBlockSchema.partial();
export type UpdateBlock = z.infer<typeof updateBlockSchema>;

export const updateGreenhouseSchema = insertGreenhouseSchema.partial();
export type UpdateGreenhouse = z.infer<typeof updateGreenhouseSchema>;

export const updateCampaignSchema = insertCampaignSchema.partial();
export type UpdateCampaign = z.infer<typeof updateCampaignSchema>;

export const updateTaskSchema = insertTaskSchema.partial();
export type UpdateTask = z.infer<typeof updateTaskSchema>;

export const updateIrrigationEventSchema = insertIrrigationEventSchema.partial();
export type UpdateIrrigationEvent = z.infer<typeof updateIrrigationEventSchema>;

export const updateInventoryItemSchema = insertInventoryItemSchema
  .pick({ name: true, category: true, unit: true, min: true, unitCost: true, currency: true })
  .partial();
export type UpdateInventoryItem = z.infer<typeof updateInventoryItemSchema>;

export const updateHarvestLotSchema = insertHarvestLotSchema.partial();
export type UpdateHarvestLot = z.infer<typeof updateHarvestLotSchema>;

/* --- Settings --- */
export const settingsSchema = z.object({
  orgName: z.string().min(1),
  location: z.string().min(1),
  timezone: z.string().min(1),
  preferOffline: z.boolean(),
  confirmBeforeSync: z.boolean(),
  criticalAlertsBanner: z.boolean(),
});
export type Settings = z.infer<typeof settingsSchema>;

/* ========================================================================
 * Adapter Registry (integration workbench)
 * ====================================================================== */

export const adapterTypeSchema = z.enum(['weather', 'iot', 'imagery', 'csv', 'external-backend']);
export type AdapterType = z.infer<typeof adapterTypeSchema>;

export const adapterStateSchema = z.enum(['connected', 'disconnected', 'error', 'stub']);
export type AdapterState = z.infer<typeof adapterStateSchema>;

export const adapterReadinessSchema = z.enum(['ready', 'needs-secrets', 'stub-only']);
export type AdapterReadiness = z.infer<typeof adapterReadinessSchema>;

export const adapterSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: adapterTypeSchema,
  state: adapterStateSchema,
  description: z.string(),
  capabilities: z.array(z.string()),
  readiness: adapterReadinessSchema,
  requiresSecrets: z.boolean(),
  enabled: z.boolean(),
  lastCheckAt: z.string().nullable(),
});
export type Adapter = z.infer<typeof adapterSchema>;

export const adapterTestResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  checkedAt: z.string(),
  details: z.record(z.unknown()).optional(),
});
export type AdapterTestResult = z.infer<typeof adapterTestResultSchema>;

export const exportDatasetSchema = z.enum([
  'blocks',
  'greenhouses',
  'tasks',
  'irrigation-events',
  'observations',
  'inventory',
  'harvest-lots',
]);
export type ExportDataset = z.infer<typeof exportDatasetSchema>;

export const importDatasetSchema = z.enum(['blocks', 'greenhouses', 'inventory', 'tasks']);
export type ImportDataset = z.infer<typeof importDatasetSchema>;

export const importRowErrorSchema = z.object({
  row: z.number(),
  field: z.string(),
  message: z.string(),
});
export type ImportRowError = z.infer<typeof importRowErrorSchema>;

export const importPreviewRowSchema = z.object({
  row: z.number(),
  valid: z.boolean(),
  data: z.record(z.unknown()),
  errors: z.array(importRowErrorSchema),
});
export type ImportPreviewRow = z.infer<typeof importPreviewRowSchema>;

export const importResultSchema = z.object({
  dataset: importDatasetSchema,
  totalRows: z.number(),
  validRows: z.number(),
  columnErrors: z.array(importRowErrorSchema),
  errors: z.array(importRowErrorSchema),
  preview: z.array(importPreviewRowSchema),
  committed: z.boolean(),
});
export type ImportResult = z.infer<typeof importResultSchema>;

/* ========================================================================
 * Idempotency keys (server-side persistent cache for X-Idempotency-Key)
 * ====================================================================== */

export const weatherCache = pgTable(
  'weather_cache',
  {
    key: text('key').primaryKey(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    payload: jsonb('payload').notNull(),
    fetchedAt: text('fetched_at').notNull(),
    expiresAt: text('expires_at').notNull(),
  },
  (t) => ({
    expiresIdx: index('weather_cache_expires_idx').on(t.expiresAt),
  }),
);

/* --- Weather forecast (server-validated payload) --- */
export const dailyForecastSchema = z.object({
  date: z.string(),
  weatherCode: z.number().int(),
  tMax: z.number(),
  tMin: z.number(),
  precipMm: z.number(),
  precipProb: z.number(),
  windKmh: z.number(),
});
export type DailyForecast = z.infer<typeof dailyForecastSchema>;

export const weatherForecastSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timezone: z.string(),
  daily: z.array(dailyForecastSchema),
  fetchedAt: z.string(),
  stale: z.boolean(),
});
export type WeatherForecast = z.infer<typeof weatherForecastSchema>;

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: text('key').primaryKey(),
    state: text('state').notNull(),
    attemptId: text('attempt_id').notNull(),
    status: integer('status'),
    body: jsonb('body'),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    expiresIdx: index('idempotency_keys_expires_idx').on(t.expiresAt),
    stateCk: check('idempotency_keys_state_ck', sql`${t.state} in ('processing', 'completed')`),
  }),
);

export const revokedSessions = pgTable(
  'revoked_sessions',
  {
    tokenKey: text('token_key').primaryKey(),
    expiresAt: text('expires_at').notNull(),
  },
  (t) => ({
    expiresIdx: index('revoked_sessions_expires_idx').on(t.expiresAt),
  }),
);

/* ----- Field application zod ----- */
export const fieldApplicationSchema = z.object({
  id: z.string(),
  scopeType: scopeTypeSchema,
  scopeId: z.string(),
  scopeName: z.string(),
  campaignId: z.string().optional(),
  applicationType: applicationTypeSchema,
  productName: z.string().min(1),
  inventoryItemId: z.string().optional(),
  dose: z.number().nonnegative().optional(),
  doseUnit: z.string().optional(),
  quantityUsed: z.number().nonnegative().optional(),
  method: z.string().optional(),
  appliedAt: z.string(),
  responsible: z.string().min(1),
  targetProblem: z.string().optional(),
  sourceTaskId: z.string().optional(),
  sourceObservationId: z.string().optional(),
  preHarvestIntervalDays: z.number().int().nonnegative().optional(),
  safeHarvestDate: z.string().optional(),
  notes: z.string().optional(),
  movementId: z.string().optional(),
  createdAt: z.string(),
});
export type FieldApplication = z.infer<typeof fieldApplicationSchema>;
export const insertFieldApplicationSchema = fieldApplicationSchema.omit({
  id: true,
  scopeName: true,
  safeHarvestDate: true,
  movementId: true,
  createdAt: true,
});
export type InsertFieldApplication = z.infer<typeof insertFieldApplicationSchema>;

/* ----- Beekeeping zod ----- */
export const apiarySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  location: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
  notes: z.string().optional(),
  status: operationalStatusSchema,
  createdAt: z.string(),
});
export type Apiary = z.infer<typeof apiarySchema>;
export const insertApiarySchema = apiarySchema
  .omit({ id: true, createdAt: true })
  .extend({ status: operationalStatusSchema.default('ok') });
export type InsertApiary = z.infer<typeof insertApiarySchema>;

export const hiveSchema = z.object({
  id: z.string(),
  apiaryId: z.string(),
  code: z.string().min(1),
  status: operationalStatusSchema,
  queenStatus: queenStatusSchema,
  colonyStrength: colonyLevelSchema,
  broodLevel: broodLevelSchema,
  honeyStores: honeyLevelSchema,
  lastInspectionAt: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
});
export type Hive = z.infer<typeof hiveSchema>;
export const insertHiveSchema = hiveSchema
  .omit({ id: true, lastInspectionAt: true, createdAt: true })
  .extend({
    status: operationalStatusSchema.default('ok'),
    queenStatus: queenStatusSchema.default('unknown'),
    colonyStrength: colonyLevelSchema.default('medium'),
    broodLevel: broodLevelSchema.default('medium'),
    honeyStores: honeyLevelSchema.default('medium'),
  });
export type InsertHive = z.infer<typeof insertHiveSchema>;

export const hiveInspectionSchema = z.object({
  id: z.string(),
  hiveId: z.string(),
  inspectedAt: z.string(),
  inspector: z.string().min(1),
  queenSeen: z.boolean(),
  queenStatus: queenStatusSchema,
  colonyStrength: colonyLevelSchema,
  broodLevel: broodLevelSchema,
  honeyStores: honeyLevelSchema,
  pestsOrDisease: z.string().optional(),
  feedingGiven: z.string().optional(),
  treatmentGiven: z.string().optional(),
  inventoryItemId: z.string().optional(),
  quantityUsed: z.number().nonnegative().optional(),
  movementId: z.string().optional(),
  notes: z.string().optional(),
  hasPhotos: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type HiveInspection = z.infer<typeof hiveInspectionSchema>;
export const insertHiveInspectionSchema = hiveInspectionSchema
  .omit({ id: true, movementId: true, createdAt: true, hasPhotos: true })
  .extend({ hasPhotos: z.number().int().nonnegative().default(0) });
export type InsertHiveInspection = z.infer<typeof insertHiveInspectionSchema>;

/* ----- User zod ----- */
export const userSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  username: z.string().min(1).optional(),
  role: userRoleSchema,
  active: z.boolean(),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;
export const insertUserSchema = userSchema.omit({ id: true, createdAt: true }).extend({
  orgId: z.string().default('org-default'),
  active: z.boolean().default(true),
  password: z.string().min(8).optional(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;

/* ----- Attachment zod ----- */
export const attachmentSchema = z.object({
  id: z.string(),
  entityType: attachmentEntityTypeSchema,
  entityId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z
    .number()
    .int()
    .nonnegative()
    .max(10 * 1024 * 1024),
  localStatus: attachmentLocalStatusSchema,
  remoteUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  createdAt: z.string(),
  uploadedAt: z.string().optional(),
  error: z.string().optional(),
  createdBy: z.string().optional(),
});
export type Attachment = z.infer<typeof attachmentSchema>;
export const insertAttachmentSchema = z.object({
  entityType: attachmentEntityTypeSchema,
  entityId: z.string().min(1),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  dataBase64: z.string().min(1),
  createdBy: z.string().optional(),
});
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

/* ----- Expense zod ----- */
export const expenseSchema = z.object({
  id: z.string(),
  scopeType: scopeTypeSchema.optional(),
  scopeId: z.string().optional(),
  campaignId: z.string().optional(),
  category: expenseCategorySchema,
  amount: z.number().nonnegative(),
  currency: z.string().min(1).max(8),
  date: z.string(),
  note: z.string().optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
  createdBy: z.string().optional(),
  createdAt: z.string(),
});
export type Expense = z.infer<typeof expenseSchema>;
export const insertExpenseSchema = expenseSchema
  .omit({ id: true, createdAt: true })
  .extend({ currency: z.string().min(1).max(8).default('BOB') });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

/* ----- Labor cost zod ----- */
export const laborCostSchema = z.object({
  id: z.string(),
  workerName: z.string().min(1),
  date: z.string(),
  amount: z.number().nonnegative(),
  currency: z.string().min(1).max(8),
  taskId: z.string().optional(),
  campaignId: z.string().optional(),
  scopeType: scopeTypeSchema.optional(),
  scopeId: z.string().optional(),
  notes: z.string().optional(),
  expenseId: z.string().optional(),
  createdBy: z.string().optional(),
  createdAt: z.string(),
});
export type LaborCost = z.infer<typeof laborCostSchema>;
export const insertLaborCostSchema = laborCostSchema
  .omit({ id: true, createdAt: true, expenseId: true })
  .extend({ currency: z.string().min(1).max(8).default('BOB') });
export type InsertLaborCost = z.infer<typeof insertLaborCostSchema>;

export const honeyHarvestSchema = z.object({
  id: z.string(),
  apiaryId: z.string(),
  hiveId: z.string().optional(),
  date: z.string(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  destination: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
});
export type HoneyHarvest = z.infer<typeof honeyHarvestSchema>;
export const insertHoneyHarvestSchema = honeyHarvestSchema.omit({ id: true, createdAt: true });
export type InsertHoneyHarvest = z.infer<typeof insertHoneyHarvestSchema>;
