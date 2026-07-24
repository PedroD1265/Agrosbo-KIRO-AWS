import type { Task, IrrigationEvent, Block, Greenhouse, Alert } from "@shared/schema";

export type Urgency = "overdue" | "today" | "soon" | "later";

export function getDueUrgency(dueDate: string, now = new Date()): Urgency {
  const d = new Date(dueDate);
  const ms = d.getTime() - now.getTime();
  const day = 24 * 60 * 60 * 1000;
  // Normalize to date boundaries (compare by calendar day)
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const nDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (dDay < nDay) return "overdue";
  if (dDay === nDay) return "today";
  if (ms < 3 * day) return "soon";
  return "later";
}

export function getIrrigationUrgency(scheduledAt: string, now = new Date()): Urgency {
  const d = new Date(scheduledAt);
  const ms = d.getTime() - now.getTime();
  const hour = 60 * 60 * 1000;
  if (ms < 0) return "overdue";
  if (ms < 6 * hour) return "today";
  if (ms < 24 * hour) return "soon";
  return "later";
}

const priorityWeight: Record<Task["priority"], number> = { high: 3, med: 2, low: 1 };
const urgencyWeight: Record<Urgency, number> = { overdue: 4, today: 3, soon: 2, later: 1 };

export function rankTask(t: Task, now = new Date()): number {
  const u = getDueUrgency(t.dueDate, now);
  return urgencyWeight[u] * 10 + priorityWeight[t.priority];
}

export function rankIrrigation(i: IrrigationEvent, now = new Date()): number {
  const u = getIrrigationUrgency(i.scheduledAt, now);
  return urgencyWeight[u] * 10;
}

export function rankBlockRisk(b: Block | Greenhouse): number {
  const s = b.status;
  if (s === "critical") return 4;
  if (s === "warn") return 3;
  if (s === "pending-sync") return 2;
  return 1;
}

export function urgencyLabel(u: Urgency): string {
  switch (u) {
    case "overdue": return "Vencida";
    case "today": return "Hoy";
    case "soon": return "Pronto";
    case "later": return "Más tarde";
  }
}

export function urgencyTone(u: Urgency): "critical" | "warn" | "primary" | "muted" {
  switch (u) {
    case "overdue": return "critical";
    case "today": return "warn";
    case "soon": return "primary";
    case "later": return "muted";
  }
}

export function countByUrgency<T>(items: T[], pick: (t: T) => Urgency) {
  const acc: Record<Urgency, number> = { overdue: 0, today: 0, soon: 0, later: 0 };
  for (const it of items) acc[pick(it)]++;
  return acc;
}

export function alertsBySeverity(alerts: Alert[]) {
  return {
    critical: alerts.filter((a) => a.level === "critical").length,
    warn: alerts.filter((a) => a.level === "warn").length,
    other: alerts.filter((a) => a.level !== "critical" && a.level !== "warn").length,
  };
}
