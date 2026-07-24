import type {
  Alert,
  Block,
  Greenhouse,
  InventoryItem,
  IrrigationEvent,
  Observation,
  Task,
  FieldApplication,
  Hive,
} from '@agrosbo/shared/schema.js';

interface EngineInput {
  blocks: Block[];
  greenhouses: Greenhouse[];
  inventory: InventoryItem[];
  irrigation: IrrigationEvent[];
  observations: Observation[];
  tasks: Task[];
  applications?: FieldApplication[];
  hives?: Hive[];
  now?: Date;
}

const MISSED_IRRIGATION_HOURS = 24;
const HIVE_INSPECTION_OVERDUE_DAYS = 14;

export function deriveAlerts(input: EngineInput): Alert[] {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const todayIso = now.toISOString().slice(0, 10);
  const out: Alert[] = [];

  for (const item of input.inventory) {
    if (item.stock <= item.min) {
      const ratio = item.min > 0 ? item.stock / item.min : 0;
      const level = ratio < 0.5 ? 'critical' : 'warn';
      out.push({
        id: `lowstock-${item.id}`,
        level,
        scope: 'Inventario',
        message: `${item.name} bajo mínimo (${item.stock} / ${item.min} ${item.unit})`,
        at: new Date(nowMs).toISOString(),
      });
    }
  }

  for (const ev of input.irrigation) {
    if (ev.status === 'done' || ev.status === 'skipped') continue;
    const sched = Date.parse(ev.scheduledAt);
    if (Number.isNaN(sched)) continue;
    if (sched > nowMs) continue;
    const overdueHours = (nowMs - sched) / 3_600_000;
    if (overdueHours < MISSED_IRRIGATION_HOURS) continue;
    const level = overdueHours >= 48 ? 'critical' : 'warn';
    out.push({
      id: `irrigation-${ev.id}`,
      level,
      scope: ev.scopeName,
      message: `Riego sin registrar hace ${Math.floor(overdueHours)}h`,
      at: ev.scheduledAt,
    });
  }

  const linkedObsIds = new Set(
    input.tasks
      .filter((t) => t.sourceObservationId && t.status !== 'done')
      .map((t) => t.sourceObservationId as string),
  );
  for (const obs of input.observations) {
    if (obs.type !== 'pest' && obs.type !== 'disease' && obs.type !== 'incident') continue;
    if (linkedObsIds.has(obs.id)) continue;
    const level = obs.type === 'incident' || obs.type === 'disease' ? 'critical' : 'warn';
    out.push({
      id: `obs-unaddressed-${obs.id}`,
      level,
      scope: obs.scopeName,
      message: `Observación sin atender · ${obs.type === 'pest' ? 'Plaga' : obs.type === 'disease' ? 'Enfermedad' : 'Incidente'}: ${obs.text.slice(0, 80)}`,
      at: obs.createdAt,
    });
  }

  for (const t of input.tasks) {
    if (t.status === 'done') continue;
    if (t.dueDate >= todayIso) continue;
    const overdueDays = Math.floor(
      (Date.parse(`${todayIso}T00:00:00Z`) - Date.parse(`${t.dueDate}T00:00:00Z`)) / 86_400_000,
    );
    const level: 'critical' | 'warn' =
      t.priority === 'high' || overdueDays >= 3 ? 'critical' : 'warn';
    out.push({
      id: `task-overdue-${t.id}`,
      level,
      scope: t.scopeName,
      message: `Tarea vencida (${overdueDays}d): ${t.title}`,
      at: t.dueDate,
    });
  }

  // Pre-harvest interval (carencia) — active until safeHarvestDate >= today
  for (const app of input.applications ?? []) {
    if (!app.safeHarvestDate) continue;
    if (app.safeHarvestDate < todayIso) continue;
    out.push({
      id: `carencia-${app.id}`,
      level: 'warn',
      scope: app.scopeName,
      message: `Carencia activa: ${app.productName} hasta ${app.safeHarvestDate}`,
      at: app.appliedAt,
    });
  }

  // Beekeeping alerts
  for (const h of input.hives ?? []) {
    if (h.queenStatus === 'absent') {
      out.push({
        id: `hive-queen-${h.id}`,
        level: 'critical',
        scope: `Colmena ${h.code}`,
        message: `Reina ausente en colmena ${h.code}`,
        at: h.lastInspectionAt ?? new Date(nowMs).toISOString(),
      });
    }
    if (h.colonyStrength === 'weak') {
      out.push({
        id: `hive-weak-${h.id}`,
        level: 'warn',
        scope: `Colmena ${h.code}`,
        message: `Colonia débil en colmena ${h.code}`,
        at: h.lastInspectionAt ?? new Date(nowMs).toISOString(),
      });
    }
    if (h.honeyStores === 'low') {
      out.push({
        id: `hive-honey-${h.id}`,
        level: 'warn',
        scope: `Colmena ${h.code}`,
        message: `Reservas de miel bajas en colmena ${h.code}`,
        at: h.lastInspectionAt ?? new Date(nowMs).toISOString(),
      });
    }
    if (!h.lastInspectionAt) {
      out.push({
        id: `hive-noinsp-${h.id}`,
        level: 'warn',
        scope: `Colmena ${h.code}`,
        message: `Colmena ${h.code} sin inspecciones registradas`,
        at: new Date(nowMs).toISOString(),
      });
      continue;
    }
    const days = Math.floor((nowMs - Date.parse(h.lastInspectionAt)) / 86_400_000);
    if (days >= HIVE_INSPECTION_OVERDUE_DAYS) {
      out.push({
        id: `hive-overdue-${h.id}`,
        level: days >= 30 ? 'critical' : 'warn',
        scope: `Colmena ${h.code}`,
        message: `Colmena ${h.code} sin inspección hace ${days}d`,
        at: h.lastInspectionAt,
      });
    }
  }

  return out.sort((a, b) => {
    const rank = { critical: 0, warn: 1, ok: 2, idle: 3, 'pending-sync': 4 } as const;
    const ra = rank[a.level as keyof typeof rank] ?? 5;
    const rb = rank[b.level as keyof typeof rank] ?? 5;
    if (ra !== rb) return ra - rb;
    return b.at.localeCompare(a.at);
  });
}
