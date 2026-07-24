import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "./db.js";
import {
  fieldApplications,
  apiaries,
  hives,
  hiveInspections,
  honeyHarvests,
  expenses,
  laborCosts,
} from "@agrosbo/shared/schema.js";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCSV(headers: string[], rows: Array<Record<string, unknown>>): string {
  const out: string[] = [headers.join(",")];
  for (const r of rows) {
    out.push(headers.map((h) => csvEscape(r[h])).join(","));
  }
  return out.join("\n") + "\n";
}

export async function applicationsCSV(filter: { from?: string; to?: string; campaignId?: string } = {}): Promise<string> {
  const conds = [];
  if (filter.from) conds.push(gte(fieldApplications.appliedAt, filter.from));
  if (filter.to) conds.push(lte(fieldApplications.appliedAt, filter.to));
  if (filter.campaignId) conds.push(eq(fieldApplications.campaignId, filter.campaignId));
  const q = conds.length
    ? db.select().from(fieldApplications).where(and(...conds))
    : db.select().from(fieldApplications);
  const rows = await q.orderBy(desc(fieldApplications.appliedAt));
  return rowsToCSV(
    ["id", "appliedAt", "scopeName", "applicationType", "productName", "dose", "doseUnit", "quantityUsed", "method", "responsible", "preHarvestIntervalDays", "safeHarvestDate", "movementId", "notes"],
    rows.map((r: any) => ({ ...r })),
  );
}

export async function carenciaActivaCSV(today = new Date().toISOString().slice(0, 10)): Promise<string> {
  const rows = await db.select().from(fieldApplications)
    .where(gte(fieldApplications.safeHarvestDate, today))
    .orderBy(fieldApplications.safeHarvestDate);
  return rowsToCSV(
    ["id", "scopeName", "productName", "appliedAt", "preHarvestIntervalDays", "safeHarvestDate", "responsible"],
    rows.map((r: any) => ({ ...r })),
  );
}

export async function expensesCSV(filter: { from?: string; to?: string; campaignId?: string } = {}): Promise<string> {
  const conds = [];
  if (filter.from) conds.push(gte(expenses.date, filter.from));
  if (filter.to) conds.push(lte(expenses.date, filter.to));
  if (filter.campaignId) conds.push(eq(expenses.campaignId, filter.campaignId));
  const q = conds.length ? db.select().from(expenses).where(and(...conds)) : db.select().from(expenses);
  const rows = await q.orderBy(desc(expenses.date));
  return rowsToCSV(
    ["id", "date", "category", "amount", "currency", "campaignId", "scopeType", "scopeId", "note", "createdBy"],
    rows.map((r: any) => ({ ...r })),
  );
}

export async function laborCSV(filter: { from?: string; to?: string; campaignId?: string } = {}): Promise<string> {
  const conds = [];
  if (filter.from) conds.push(gte(laborCosts.date, filter.from));
  if (filter.to) conds.push(lte(laborCosts.date, filter.to));
  if (filter.campaignId) conds.push(eq(laborCosts.campaignId, filter.campaignId));
  const q = conds.length ? db.select().from(laborCosts).where(and(...conds)) : db.select().from(laborCosts);
  const rows = await q.orderBy(desc(laborCosts.date));
  return rowsToCSV(
    ["id", "date", "workerName", "amount", "currency", "taskId", "campaignId", "scopeType", "scopeId", "notes"],
    rows.map((r: any) => ({ ...r })),
  );
}

export async function apiariesCSV(): Promise<string> {
  const rows = await db.select().from(apiaries).orderBy(desc(apiaries.createdAt));
  return rowsToCSV(["id", "name", "location", "lat", "lng", "status", "notes", "createdAt"], rows.map((r: any) => ({ ...r })));
}

export async function hivesCSV(): Promise<string> {
  const rows = await db.select().from(hives).orderBy(desc(hives.createdAt));
  return rowsToCSV(
    ["id", "code", "apiaryId", "status", "queenStatus", "colonyStrength", "broodLevel", "honeyStores", "lastInspectionAt"],
    rows.map((r: any) => ({ ...r })),
  );
}

export async function inspectionsCSV(): Promise<string> {
  const rows = await db.select().from(hiveInspections).orderBy(desc(hiveInspections.inspectedAt));
  return rowsToCSV(
    ["id", "hiveId", "inspectedAt", "inspector", "queenSeen", "queenStatus", "colonyStrength", "broodLevel", "honeyStores", "pestsOrDisease", "feedingGiven", "treatmentGiven", "notes"],
    rows.map((r: any) => ({ ...r })),
  );
}

export async function honeyHarvestsCSV(): Promise<string> {
  const rows = await db.select().from(honeyHarvests).orderBy(desc(honeyHarvests.date));
  return rowsToCSV(
    ["id", "apiaryId", "hiveId", "date", "quantity", "unit", "destination", "notes"],
    rows.map((r: any) => ({ ...r })),
  );
}
