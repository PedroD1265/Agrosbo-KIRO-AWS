import type {
  Campaign,
  HarvestLot,
  InventoryMovement,
  IrrigationEvent,
  Observation,
  Task,
} from '@agrosbo/shared/schema.js';

export interface CampaignSummary {
  campaign: Campaign;
  tasks: { total: number; pending: number; in_progress: number; done: number; overdue: number };
  irrigation: {
    total: number;
    done: number;
    scheduled: number;
    skipped: number;
    totalDurationMin: number;
    totalVolumeL: number;
  };
  observations: { total: number; byType: Record<string, number> };
  harvest: {
    lots: number;
    totalQuantity: number;
    unitMix: Record<string, number>;
    revenue: number;
    cost: number;
    margin: number;
    currency: string | null;
  };
  costs: { fromMovements: number; currency: string | null };
}

interface Input {
  campaign: Campaign;
  tasks: Task[];
  irrigation: IrrigationEvent[];
  observations: Observation[];
  harvest: HarvestLot[];
  movements: InventoryMovement[];
  now?: Date;
}

export function buildCampaignSummary(input: Input): CampaignSummary {
  const { campaign } = input;
  const now = input.now ?? new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const start = campaign.startDate;
  const end = campaign.endDate;
  const matchesScope = (x: { scopeType?: string; scopeId?: string }) =>
    x.scopeType === campaign.scopeType && x.scopeId === campaign.scopeId;
  const inWindowDate = (iso: string) => {
    const d = iso.slice(0, 10);
    return d >= start && d <= end;
  };

  const tasks: Task[] = input.tasks.filter((t) => matchesScope(t) && inWindowDate(t.dueDate));
  const irrigation: IrrigationEvent[] = input.irrigation.filter(
    (e) => matchesScope(e) && inWindowDate(e.scheduledAt),
  );
  const observations: Observation[] = input.observations.filter(
    (o) => matchesScope(o) && inWindowDate(o.createdAt),
  );
  const harvest = input.harvest.filter((h) => h.campaignId === campaign.id);
  const movements = input.movements.filter(
    (m) =>
      m.scopeType === campaign.scopeType && m.scopeId === campaign.scopeId && inWindowDate(m.at),
  );

  const taskAgg = { total: tasks.length, pending: 0, in_progress: 0, done: 0, overdue: 0 };
  for (const t of tasks) {
    taskAgg[t.status] = (taskAgg[t.status] ?? 0) + 1;
    if (t.status !== 'done' && t.dueDate < todayIso) taskAgg.overdue += 1;
  }

  const irrAgg = {
    total: irrigation.length,
    done: 0,
    scheduled: 0,
    skipped: 0,
    totalDurationMin: 0,
    totalVolumeL: 0,
  };
  for (const e of irrigation) {
    if (e.status === 'done') irrAgg.done += 1;
    else if (e.status === 'scheduled' || e.status === 'pending-sync') irrAgg.scheduled += 1;
    else if (e.status === 'skipped') irrAgg.skipped += 1;
    if (e.status === 'done') {
      irrAgg.totalDurationMin += e.durationMin ?? 0;
      irrAgg.totalVolumeL += e.volumeL ?? 0;
    }
  }

  const obsByType: Record<string, number> = {};
  for (const o of observations) obsByType[o.type] = (obsByType[o.type] ?? 0) + 1;

  let revenue = 0;
  let costAlloc = 0;
  let totalQty = 0;
  const unitMix: Record<string, number> = {};
  let harvestCurrency: string | null = null;
  for (const h of harvest) {
    totalQty += h.quantity;
    unitMix[h.unit] = (unitMix[h.unit] ?? 0) + h.quantity;
    if (typeof h.unitPrice === 'number') revenue += h.quantity * h.unitPrice;
    if (typeof h.costAllocated === 'number') costAlloc += h.costAllocated;
    if (!harvestCurrency && h.currency) harvestCurrency = h.currency;
  }

  let movementCost = 0;
  let movementsCurrency: string | null = null;
  for (const m of movements) {
    if (typeof m.totalCost === 'number') movementCost += m.totalCost;
    if (!movementsCurrency && m.currency) movementsCurrency = m.currency;
  }

  return {
    campaign,
    tasks: taskAgg,
    irrigation: irrAgg,
    observations: { total: observations.length, byType: obsByType },
    harvest: {
      lots: harvest.length,
      totalQuantity: totalQty,
      unitMix,
      revenue,
      cost: costAlloc,
      margin: revenue - costAlloc,
      currency: harvestCurrency,
    },
    costs: { fromMovements: movementCost, currency: movementsCurrency },
  };
}
