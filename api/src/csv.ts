/**
 * CSV serialization and parsing utilities for the Integration Workbench.
 * All output is UTF-8 with BOM so Excel opens it correctly.
 */

import type {
  ImportDataset,
  ImportResult,
  ImportRowError,
  ImportPreviewRow,
} from '@agrosbo/shared/schema.js';
import {
  insertBlockSchema,
  insertGreenhouseSchema,
  insertInventoryItemSchema,
  insertTaskSchema,
} from '@agrosbo/shared/schema.js';
import type { IStorage } from './storage.js';

/* ------------------------------------------------------------------
 * Serialization helpers
 * ------------------------------------------------------------------ */

function escapeCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const bom = '\uFEFF';
  const header = headers.map(escapeCell).join(',');
  const body = rows.map((r) => r.map(escapeCell).join(',')).join('\n');
  return bom + header + '\n' + body;
}

/* ------------------------------------------------------------------
 * Export serializers
 * ------------------------------------------------------------------ */

import type {
  Block,
  Greenhouse,
  Task,
  IrrigationEvent,
  Observation,
  InventoryItem,
  HarvestLot,
} from '@agrosbo/shared/schema.js';

export function blocksToCSV(rows: Block[]): string {
  const headers = [
    'id',
    'name',
    'farm',
    'areaHa',
    'crop',
    'variety',
    'stage',
    'lastIrrigation',
    'status',
    'alerts',
  ];
  return rowsToCsv(
    headers,
    rows.map((r) => [
      r.id,
      r.name,
      r.farm,
      r.areaHa,
      r.crop ?? '',
      r.variety ?? '',
      r.stage,
      r.lastIrrigation,
      r.status,
      r.alerts,
    ]),
  );
}

export function greenhousesToCSV(rows: Greenhouse[]): string {
  const headers = [
    'id',
    'name',
    'areaM2',
    'crop',
    'variety',
    'stage',
    'status',
    'alerts',
    'tempC',
    'humidity',
  ];
  return rowsToCsv(
    headers,
    rows.map((r) => [
      r.id,
      r.name,
      r.areaM2,
      r.crop,
      r.variety ?? '',
      r.stage,
      r.status,
      r.alerts,
      r.tempC ?? '',
      r.humidity ?? '',
    ]),
  );
}

export function tasksToCSV(rows: Task[]): string {
  const headers = [
    'id',
    'title',
    'scopeType',
    'scopeId',
    'scopeName',
    'assignee',
    'dueDate',
    'priority',
    'status',
    'notes',
  ];
  return rowsToCsv(
    headers,
    rows.map((r) => [
      r.id,
      r.title,
      r.scopeType,
      r.scopeId,
      r.scopeName,
      r.assignee,
      r.dueDate,
      r.priority,
      r.status,
      r.notes ?? '',
    ]),
  );
}

export function irrigationEventsToCSV(rows: IrrigationEvent[]): string {
  const headers = [
    'id',
    'scopeType',
    'scopeId',
    'scopeName',
    'scheduledAt',
    'durationMin',
    'volumeL',
    'status',
    'responsible',
    'notes',
  ];
  return rowsToCsv(
    headers,
    rows.map((r) => [
      r.id,
      r.scopeType,
      r.scopeId,
      r.scopeName,
      r.scheduledAt,
      r.durationMin,
      r.volumeL ?? '',
      r.status,
      r.responsible ?? '',
      r.notes ?? '',
    ]),
  );
}

export function observationsToCSV(rows: Observation[]): string {
  const headers = [
    'id',
    'scopeType',
    'scopeId',
    'scopeName',
    'author',
    'createdAt',
    'type',
    'text',
    'hasPhotos',
  ];
  return rowsToCsv(
    headers,
    rows.map((r) => [
      r.id,
      r.scopeType,
      r.scopeId,
      r.scopeName,
      r.author,
      r.createdAt,
      r.type,
      r.text,
      r.hasPhotos,
    ]),
  );
}

export function inventoryToCSV(rows: InventoryItem[]): string {
  const headers = ['id', 'name', 'category', 'unit', 'stock', 'min', 'lastMovement'];
  return rowsToCsv(
    headers,
    rows.map((r) => [r.id, r.name, r.category, r.unit, r.stock, r.min, r.lastMovement]),
  );
}

export function harvestLotsToCSV(rows: HarvestLot[]): string {
  const headers = [
    'id',
    'code',
    'originType',
    'originId',
    'origin',
    'crop',
    'variety',
    'date',
    'quantity',
    'unit',
    'destination',
    'status',
  ];
  return rowsToCsv(
    headers,
    rows.map((r) => [
      r.id,
      r.code,
      r.originType,
      r.originId,
      r.origin,
      r.crop,
      r.variety,
      r.date,
      r.quantity,
      r.unit,
      r.destination ?? '',
      r.status,
    ]),
  );
}

/* ------------------------------------------------------------------
 * CSV parsing
 * ------------------------------------------------------------------ */

function parseCsvText(text: string): string[][] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '');

  return lines.map((line) => {
    const cells: string[] = [];
    let inQuotes = false;
    let cell = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cell += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          cells.push(cell);
          cell = '';
        } else {
          cell += ch;
        }
      }
    }
    cells.push(cell);
    return cells;
  });
}

function rowToObject(headers: string[], cells: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h] = cells[i] ?? '';
  });
  return obj;
}

/* ------------------------------------------------------------------
 * Coerce helpers
 * ------------------------------------------------------------------ */
function coerceNum(s: string): number {
  return Number(s);
}

function prepareBlock(raw: Record<string, string>) {
  return {
    name: raw.name,
    farm: raw.farm,
    areaHa: coerceNum(raw.areaHa),
    crop: raw.crop,
    variety: raw.variety || undefined,
    stage: raw.stage,
    lastIrrigation: raw.lastIrrigation,
    status: raw.status,
    alerts: raw.alerts ? Number(raw.alerts) : 0,
  };
}

function prepareGreenhouse(raw: Record<string, string>) {
  return {
    name: raw.name,
    areaM2: coerceNum(raw.areaM2),
    crop: raw.crop,
    variety: raw.variety || undefined,
    stage: raw.stage,
    status: raw.status,
    alerts: raw.alerts ? Number(raw.alerts) : 0,
    tempC: raw.tempC ? Number(raw.tempC) : undefined,
    humidity: raw.humidity ? Number(raw.humidity) : undefined,
  };
}

function prepareInventory(raw: Record<string, string>) {
  return {
    name: raw.name,
    category: raw.category,
    unit: raw.unit,
    stock: coerceNum(raw.stock),
    min: coerceNum(raw.min),
    lastMovement: raw.lastMovement,
  };
}

function prepareTask(raw: Record<string, string>) {
  return {
    title: raw.title,
    scopeType: raw.scopeType,
    scopeId: raw.scopeId,
    assignee: raw.assignee,
    dueDate: raw.dueDate,
    priority: raw.priority,
    status: (raw.status || 'pending') as 'pending' | 'in_progress' | 'done',
    notes: raw.notes || undefined,
  };
}

type SafeParseSchema = {
  safeParse: (v: unknown) => {
    success: boolean;
    data?: unknown;
    error?: { issues: { path: (string | number)[]; message: string }[] };
  };
};

const datasetSchemas: Record<
  ImportDataset,
  {
    schema: SafeParseSchema;
    prepare: (raw: Record<string, string>) => unknown;
    requiredColumns: string[];
  }
> = {
  blocks: {
    schema: insertBlockSchema
      .extend({ areaHa: insertBlockSchema.shape.areaHa, alerts: insertBlockSchema.shape.alerts })
      .partial({ alerts: true, variety: true }),
    prepare: prepareBlock,
    requiredColumns: ['name', 'farm', 'areaHa', 'crop', 'stage', 'lastIrrigation', 'status'],
  },
  greenhouses: {
    schema: insertGreenhouseSchema.partial({
      variety: true,
      tempC: true,
      humidity: true,
      alerts: true,
    }),
    prepare: prepareGreenhouse,
    requiredColumns: ['name', 'areaM2', 'crop', 'stage', 'status'],
  },
  inventory: {
    schema: insertInventoryItemSchema,
    prepare: prepareInventory,
    requiredColumns: ['name', 'category', 'unit', 'stock', 'min', 'lastMovement'],
  },
  tasks: {
    schema: insertTaskSchema.partial({ status: true, notes: true }),
    prepare: prepareTask,
    requiredColumns: ['title', 'scopeType', 'scopeId', 'assignee', 'dueDate', 'priority'],
  },
};

const PREVIEW_MAX_ROWS = 10;

/* ------------------------------------------------------------------
 * Main import function
 * ------------------------------------------------------------------ */

export async function parseAndImport(
  dataset: ImportDataset,
  csvText: string,
  dryRun: boolean,
  storage: IStorage,
): Promise<ImportResult> {
  const parsed = parseCsvText(csvText);
  if (parsed.length < 2) {
    return {
      dataset,
      totalRows: 0,
      validRows: 0,
      columnErrors: [],
      errors: [],
      preview: [],
      committed: false,
    };
  }

  const [headerRow, ...dataRows] = parsed;
  const headers = headerRow.map((h) => h.trim());
  const { schema, prepare, requiredColumns } = datasetSchemas[dataset];

  const columnErrors: ImportRowError[] = [];
  const missingCols = requiredColumns.filter((col) => !headers.includes(col));
  if (missingCols.length > 0) {
    missingCols.forEach((col) => {
      columnErrors.push({ row: 1, field: col, message: `Columna requerida faltante: "${col}"` });
    });
    return {
      dataset,
      totalRows: dataRows.length,
      validRows: 0,
      columnErrors,
      errors: [],
      preview: [],
      committed: false,
    };
  }

  const errors: ImportRowError[] = [];
  const validPrepared: unknown[] = [];
  const previewRows: ImportPreviewRow[] = [];

  dataRows.forEach((cells, idx) => {
    const rowNum = idx + 2;
    const raw = rowToObject(headers, cells);
    const prepared = prepare(raw);
    const result = schema.safeParse(prepared);
    const rowErrors: ImportRowError[] = [];

    if (!result.success) {
      result.error!.issues.forEach((issue) => {
        const err: ImportRowError = {
          row: rowNum,
          field: issue.path.join('.') || 'general',
          message: issue.message,
        };
        errors.push(err);
        rowErrors.push(err);
      });
    } else {
      validPrepared.push(result.data);
    }

    if (idx < PREVIEW_MAX_ROWS) {
      previewRows.push({
        row: rowNum,
        valid: result.success,
        data: raw,
        errors: rowErrors,
      });
    }
  });

  const totalRows = dataRows.length;
  const validRows = validPrepared.length;
  let committed = false;

  if (!dryRun && errors.length === 0 && validPrepared.length > 0) {
    // NOTE: Rows are committed sequentially (non-transactional). We only reach
    // this branch when validation is fully clean (zero row errors), minimizing
    // partial-write risk. If a storage failure occurs mid-loop, rows already
    // written are NOT rolled back. Callers should handle this by re-checking
    // data state post-import. Future improvement: wrap in a DB transaction.
    for (const row of validPrepared) {
      if (dataset === 'blocks')
        await storage.createBlock(row as Parameters<IStorage['createBlock']>[0]);
      else if (dataset === 'greenhouses')
        await storage.createGreenhouse(row as Parameters<IStorage['createGreenhouse']>[0]);
      else if (dataset === 'inventory')
        await storage.createInventoryItem(row as Parameters<IStorage['createInventoryItem']>[0]);
      else if (dataset === 'tasks')
        await storage.createTask(row as Parameters<IStorage['createTask']>[0]);
    }
    committed = true;
  }

  return { dataset, totalRows, validRows, columnErrors, errors, preview: previewRows, committed };
}
