import { useMemo } from 'react';
import {
  useBlocks,
  useGreenhouses,
  useCampaigns,
  useTasks,
  useIrrigationEvents,
  useObservations,
  useInventory,
  useHarvestLots,
} from '@/hooks/data';
import type { ReportFilters } from './types';
import { TODAY } from './types';

export function useAllData() {
  const blocks = useBlocks();
  const greenhouses = useGreenhouses();
  const campaigns = useCampaigns();
  const tasks = useTasks();
  const irrigationEvents = useIrrigationEvents();
  const observations = useObservations();
  const inventory = useInventory();
  const harvestLots = useHarvestLots();

  const isLoading =
    blocks.isLoading ||
    greenhouses.isLoading ||
    campaigns.isLoading ||
    tasks.isLoading ||
    irrigationEvents.isLoading ||
    observations.isLoading ||
    inventory.isLoading ||
    harvestLots.isLoading;

  return {
    blocks: blocks.data ?? [],
    greenhouses: greenhouses.data ?? [],
    campaigns: campaigns.data ?? [],
    tasks: tasks.data ?? [],
    irrigationEvents: irrigationEvents.data ?? [],
    observations: observations.data ?? [],
    inventory: inventory.data ?? [],
    harvestLots: harvestLots.data ?? [],
    isLoading,
  };
}

export function useResumenOperativo() {
  const data = useAllData();
  return useMemo(() => {
    const totalTasks = data.tasks.length;
    const pendingTasks = data.tasks.filter(
      (t) => t.status === 'pending' || t.status === 'in_progress',
    ).length;
    const overdueTasks = data.tasks.filter((t) => t.status !== 'done' && t.dueDate < TODAY).length;
    const scheduledIrrigation = data.irrigationEvents.filter(
      (e) => e.status === 'scheduled',
    ).length;
    const doneIrrigation = data.irrigationEvents.filter((e) => e.status === 'done').length;
    const recentObservations = data.observations.filter(
      (o) => o.createdAt >= new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    ).length;
    const lowStock = data.inventory.filter((i) => i.stock < i.min).length;
    const harvestLotCount = data.harvestLots.length;

    return {
      ...data,
      totalTasks,
      pendingTasks,
      overdueTasks,
      scheduledIrrigation,
      doneIrrigation,
      recentObservations,
      lowStock,
      harvestLotCount,
    };
  }, [data]);
}

export function useObservationsReport(filters: ReportFilters) {
  const data = useAllData();
  return useMemo(() => {
    let observations = data.observations.filter(
      (o) =>
        o.createdAt.slice(0, 10) >= filters.dateFrom && o.createdAt.slice(0, 10) <= filters.dateTo,
    );
    if (filters.scopeType !== 'all')
      observations = observations.filter((o) => o.scopeType === filters.scopeType);
    if (filters.scopeId !== 'all')
      observations = observations.filter((o) => o.scopeId === filters.scopeId);
    return { observations, isLoading: data.isLoading };
  }, [data, filters]);
}

export function useBlockReport() {
  const data = useAllData();
  return useMemo(() => {
    const rows = data.blocks.map((block) => {
      const activeCampaign = data.campaigns.find(
        (c) => c.scopeType === 'block' && c.scopeId === block.id,
      );
      const openTasks = data.tasks.filter(
        (t) => t.scopeType === 'block' && t.scopeId === block.id && t.status !== 'done',
      ).length;
      const blockObservations = data.observations.filter(
        (o) => o.scopeType === 'block' && o.scopeId === block.id,
      ).length;
      const blockHarvestLots = data.harvestLots.filter(
        (h) => h.originType === 'block' && h.originId === block.id,
      ).length;
      const lastIrr = data.irrigationEvents
        .filter((e) => e.scopeType === 'block' && e.scopeId === block.id && e.status === 'done')
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))[0];

      return {
        block,
        activeCampaign,
        openTasks,
        observations: blockObservations,
        harvestLots: blockHarvestLots,
        lastIrrigationDate: lastIrr?.scheduledAt?.slice(0, 10) ?? block.lastIrrigation,
      };
    });
    return { rows, isLoading: data.isLoading };
  }, [data]);
}

export function useGreenhouseReport() {
  const data = useAllData();
  return useMemo(() => {
    const rows = data.greenhouses.map((gh) => {
      const activeCampaign = data.campaigns.find(
        (c) => c.scopeType === 'greenhouse' && c.scopeId === gh.id,
      );
      const openTasks = data.tasks.filter(
        (t) => t.scopeType === 'greenhouse' && t.scopeId === gh.id && t.status !== 'done',
      ).length;
      const ghObservations = data.observations.filter(
        (o) => o.scopeType === 'greenhouse' && o.scopeId === gh.id,
      ).length;
      const ghHarvestLots = data.harvestLots.filter(
        (h) => h.originType === 'greenhouse' && h.originId === gh.id,
      ).length;
      const lastIrr = data.irrigationEvents
        .filter((e) => e.scopeType === 'greenhouse' && e.scopeId === gh.id && e.status === 'done')
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))[0];

      return {
        greenhouse: gh,
        activeCampaign,
        openTasks,
        observations: ghObservations,
        harvestLots: ghHarvestLots,
        lastIrrigationDate: lastIrr?.scheduledAt?.slice(0, 10) ?? '—',
      };
    });
    return { rows, isLoading: data.isLoading };
  }, [data]);
}

export function useIrrigationReport(filters: ReportFilters) {
  const data = useAllData();
  return useMemo(() => {
    let events = data.irrigationEvents.filter(
      (e) =>
        e.scheduledAt.slice(0, 10) >= filters.dateFrom &&
        e.scheduledAt.slice(0, 10) <= filters.dateTo,
    );
    if (filters.scopeType !== 'all') {
      events = events.filter((e) => e.scopeType === filters.scopeType);
    }
    if (filters.scopeId !== 'all') {
      events = events.filter((e) => e.scopeId === filters.scopeId);
    }
    if (filters.status !== 'all') {
      events = events.filter((e) => e.status === filters.status);
    }

    const done = events.filter((e) => e.status === 'done').length;
    const scheduled = events.filter((e) => e.status === 'scheduled').length;
    const skipped = events.filter((e) => e.status === 'skipped').length;
    const total = events.length;

    const byScope: Record<
      string,
      { name: string; done: number; scheduled: number; skipped: number; total: number }
    > = {};
    for (const e of events) {
      if (!byScope[e.scopeId]) {
        byScope[e.scopeId] = { name: e.scopeName, done: 0, scheduled: 0, skipped: 0, total: 0 };
      }
      byScope[e.scopeId].total++;
      if (e.status === 'done') byScope[e.scopeId].done++;
      else if (e.status === 'scheduled') byScope[e.scopeId].scheduled++;
      else if (e.status === 'skipped') byScope[e.scopeId].skipped++;
    }

    const byScopeList = Object.values(byScope).sort((a, b) => b.done - a.done);

    return { events, done, scheduled, skipped, total, byScopeList, isLoading: data.isLoading };
  }, [data, filters]);
}

export function useTaskReport(filters: ReportFilters) {
  const data = useAllData();
  return useMemo(() => {
    let tasks = data.tasks.filter(
      (t) => t.dueDate >= filters.dateFrom && t.dueDate <= filters.dateTo,
    );
    if (filters.scopeType !== 'all') tasks = tasks.filter((t) => t.scopeType === filters.scopeType);
    if (filters.scopeId !== 'all') tasks = tasks.filter((t) => t.scopeId === filters.scopeId);
    if (filters.assignee !== 'all') tasks = tasks.filter((t) => t.assignee === filters.assignee);
    if (filters.status !== 'all') tasks = tasks.filter((t) => t.status === filters.status);

    const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate < TODAY);
    const recentDone = tasks
      .filter((t) => t.status === 'done')
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate));

    const byAssignee: Record<string, number> = {};
    for (const t of tasks.filter((t) => t.status !== 'done')) {
      byAssignee[t.assignee ?? 'sin asignar'] = (byAssignee[t.assignee ?? 'sin asignar'] ?? 0) + 1;
    }
    const byAssigneeList = Object.entries(byAssignee)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const byPriority = {
      high: tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length,
      med: tasks.filter((t) => t.priority === 'med' && t.status !== 'done').length,
      low: tasks.filter((t) => t.priority === 'low' && t.status !== 'done').length,
    };

    const assignees = [...new Set(data.tasks.map((t) => t.assignee))].sort();

    return {
      tasks,
      overdue,
      recentDone,
      byAssigneeList,
      byPriority,
      assignees,
      isLoading: data.isLoading,
    };
  }, [data, filters]);
}

export function useInventoryHarvestReport(filters: ReportFilters) {
  const data = useAllData();
  return useMemo(() => {
    const lowStock = data.inventory.filter((i) => i.stock < i.min);

    let lots = data.harvestLots.filter(
      (h) => h.date >= filters.dateFrom && h.date <= filters.dateTo,
    );
    if (filters.scopeType !== 'all') lots = lots.filter((h) => h.originType === filters.scopeType);
    if (filters.scopeId !== 'all') lots = lots.filter((h) => h.originId === filters.scopeId);

    const byCrop: Record<
      string,
      { crop: string; variety: string; total: number; unit: string; count: number }
    > = {};
    for (const h of lots) {
      const key = `${h.crop}|${h.variety}|${h.unit}`;
      if (!byCrop[key])
        byCrop[key] = { crop: h.crop, variety: h.variety, total: 0, unit: h.unit, count: 0 };
      byCrop[key].total += h.quantity;
      byCrop[key].count++;
    }
    const byCropList = Object.values(byCrop).sort((a, b) => b.total - a.total);

    return { lowStock, lots, byCropList, isLoading: data.isLoading };
  }, [data, filters]);
}
