import { randomUUID } from "node:crypto";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { db } from "./db.js";
import {
  expenses,
  laborCosts,
  type Expense,
  type LaborCost,
  type InsertExpense,
  type InsertLaborCost,
} from "@agrosbo/shared/schema.js";

function rowToExpense(r: typeof expenses.$inferSelect): Expense {
  const out: Expense = {
    id: r.id,
    category: r.category,
    amount: r.amount,
    currency: r.currency,
    date: r.date,
    createdAt: r.createdAt,
  };
  if (r.scopeType) out.scopeType = r.scopeType;
  if (r.scopeId) out.scopeId = r.scopeId;
  if (r.campaignId) out.campaignId = r.campaignId;
  if (r.note) out.note = r.note;
  if (r.relatedEntityType) out.relatedEntityType = r.relatedEntityType;
  if (r.relatedEntityId) out.relatedEntityId = r.relatedEntityId;
  if (r.createdBy) out.createdBy = r.createdBy;
  return out;
}

function rowToLabor(r: typeof laborCosts.$inferSelect): LaborCost {
  const out: LaborCost = {
    id: r.id,
    workerName: r.workerName,
    date: r.date,
    amount: r.amount,
    currency: r.currency,
    createdAt: r.createdAt,
  };
  if (r.taskId) out.taskId = r.taskId;
  if (r.campaignId) out.campaignId = r.campaignId;
  if (r.scopeType) out.scopeType = r.scopeType;
  if (r.scopeId) out.scopeId = r.scopeId;
  if (r.notes) out.notes = r.notes;
  if (r.expenseId) out.expenseId = r.expenseId;
  if (r.createdBy) out.createdBy = r.createdBy;
  return out;
}

export interface ExpenseFilter {
  from?: string;
  to?: string;
  campaignId?: string;
  scopeType?: "block" | "greenhouse";
  scopeId?: string;
  category?: string;
}

export async function listExpenses(f: ExpenseFilter = {}): Promise<Expense[]> {
  const conds = [];
  if (f.from) conds.push(gte(expenses.date, f.from));
  if (f.to) conds.push(lte(expenses.date, f.to));
  if (f.campaignId) conds.push(eq(expenses.campaignId, f.campaignId));
  if (f.scopeType) conds.push(eq(expenses.scopeType, f.scopeType));
  if (f.scopeId) conds.push(eq(expenses.scopeId, f.scopeId));
  if (f.category) conds.push(eq(expenses.category, f.category as Expense["category"]));
  const q = conds.length
    ? db.select().from(expenses).where(and(...conds))
    : db.select().from(expenses);
  const rows = await q.orderBy(desc(expenses.date));
  return rows.map(rowToExpense);
}

export async function createExpense(input: InsertExpense): Promise<Expense> {
  const id = `exp-${randomUUID().slice(0, 10)}`;
  const [row] = await db.insert(expenses).values({
    id,
    scopeType: input.scopeType ?? null,
    scopeId: input.scopeId ?? null,
    campaignId: input.campaignId ?? null,
    category: input.category,
    amount: input.amount,
    currency: input.currency,
    date: input.date,
    note: input.note ?? null,
    relatedEntityType: input.relatedEntityType ?? null,
    relatedEntityId: input.relatedEntityId ?? null,
    createdBy: input.createdBy ?? null,
    createdAt: new Date().toISOString(),
  }).returning();
  return rowToExpense(row);
}

export async function deleteExpense(id: string): Promise<boolean> {
  return await db.transaction(async (tx: any) => {
    const [target] = await tx.select().from(expenses).where(eq(expenses.id, id));
    if (!target) return false;
    if (target.relatedEntityType === "labor" && target.relatedEntityId) {
      await tx.delete(laborCosts).where(eq(laborCosts.id, target.relatedEntityId));
    }
    await tx.delete(expenses).where(eq(expenses.id, id));
    return true;
  });
}

export async function listLaborCosts(f: ExpenseFilter = {}): Promise<LaborCost[]> {
  const conds = [];
  if (f.from) conds.push(gte(laborCosts.date, f.from));
  if (f.to) conds.push(lte(laborCosts.date, f.to));
  if (f.campaignId) conds.push(eq(laborCosts.campaignId, f.campaignId));
  if (f.scopeType) conds.push(eq(laborCosts.scopeType, f.scopeType));
  if (f.scopeId) conds.push(eq(laborCosts.scopeId, f.scopeId));
  const q = conds.length
    ? db.select().from(laborCosts).where(and(...conds))
    : db.select().from(laborCosts);
  const rows = await q.orderBy(desc(laborCosts.date));
  return rows.map(rowToLabor);
}

export async function createLaborCost(input: InsertLaborCost): Promise<LaborCost> {
  const id = `lc-${randomUUID().slice(0, 10)}`;
  const expenseId = `exp-${randomUUID().slice(0, 10)}`;
  const now = new Date().toISOString();
  return await db.transaction(async (tx: any) => {
    await tx.insert(expenses).values({
      id: expenseId,
      scopeType: input.scopeType ?? null,
      scopeId: input.scopeId ?? null,
      campaignId: input.campaignId ?? null,
      category: "jornal",
      amount: input.amount,
      currency: input.currency,
      date: input.date,
      note: `Jornal: ${input.workerName}${input.notes ? ` — ${input.notes}` : ""}`,
      relatedEntityType: "labor",
      relatedEntityId: id,
      createdBy: input.createdBy ?? null,
      createdAt: now,
    });
    const [row] = await tx.insert(laborCosts).values({
      id,
      workerName: input.workerName,
      date: input.date,
      amount: input.amount,
      currency: input.currency,
      taskId: input.taskId ?? null,
      campaignId: input.campaignId ?? null,
      scopeType: input.scopeType ?? null,
      scopeId: input.scopeId ?? null,
      notes: input.notes ?? null,
      expenseId,
      createdBy: input.createdBy ?? null,
      createdAt: now,
    }).returning();
    return rowToLabor(row);
  });
}

export interface CostBreakdown {
  totalBOB: number;
  byCategory: Record<string, number>;
  count: number;
  laborTotal: number;
}

export async function costsForCampaign(campaignId: string): Promise<CostBreakdown> {
  const rows = await db.select().from(expenses).where(eq(expenses.campaignId, campaignId));
  const breakdown: CostBreakdown = { totalBOB: 0, byCategory: {}, count: rows.length, laborTotal: 0 };
  for (const r of rows) {
    breakdown.totalBOB += r.amount;
    breakdown.byCategory[r.category] = (breakdown.byCategory[r.category] ?? 0) + r.amount;
    if (r.category === "jornal") breakdown.laborTotal += r.amount;
  }
  return breakdown;
}

export async function costsForScope(scopeType: "block" | "greenhouse", scopeId: string): Promise<CostBreakdown> {
  const rows = await db.select().from(expenses)
    .where(and(eq(expenses.scopeType, scopeType), eq(expenses.scopeId, scopeId)));
  const breakdown: CostBreakdown = { totalBOB: 0, byCategory: {}, count: rows.length, laborTotal: 0 };
  for (const r of rows) {
    breakdown.totalBOB += r.amount;
    breakdown.byCategory[r.category] = (breakdown.byCategory[r.category] ?? 0) + r.amount;
    if (r.category === "jornal") breakdown.laborTotal += r.amount;
  }
  return breakdown;
}
