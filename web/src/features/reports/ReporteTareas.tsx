import { ReportTable } from './ReportTable';
import { ReportFilters } from './ReportFilters';
import { ExportBar } from './ExportBar';
import { ReportSectionHeader } from './ReportSectionHeader';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { MetricCard } from '@/shared/ui/MetricCard';
import { useTaskReport } from './useReportData';
import { exportCsv } from './csvExport';
import type { ReportFilters as Filters } from './types';
import type { Task } from '@shared/schema';
import { AlertTriangle, BarChart2, Users, CheckCircle2 } from 'lucide-react';

interface Props {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
}

const priorityLabel: Record<string, string> = { high: 'Alta', med: 'Media', low: 'Baja' };

export function ReporteTareas({ filters, onFiltersChange }: Props) {
  const d = useTaskReport(filters);

  function handleExport() {
    exportCsv<Task>(
      d.tasks,
      [
        { header: 'ID', accessor: (t) => t.id },
        { header: 'Título', accessor: (t) => t.title },
        { header: 'Ubicación', accessor: (t) => t.scopeName },
        { header: 'Tipo', accessor: (t) => t.scopeType },
        { header: 'Responsable', accessor: (t) => t.assignee },
        { header: 'Vence', accessor: (t) => t.dueDate },
        { header: 'Prioridad', accessor: (t) => t.priority },
        { header: 'Estado', accessor: (t) => t.status },
        { header: 'Notas', accessor: (t) => t.notes ?? '' },
      ],
      'tareas.csv',
    );
  }

  return (
    <div className="space-y-4">
      <ReportFilters
        filters={filters}
        onChange={onFiltersChange}
        show={{ dateRange: true, scope: true, status: true, assignee: true }}
        assignees={d.assignees.filter((a): a is string => a !== undefined)}
        statusOptions={[
          { value: 'pending', label: 'Pendiente' },
          { value: 'in_progress', label: 'En curso' },
          { value: 'done', label: 'Completado' },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <MetricCard
          label="Alta prioridad pend."
          value={d.byPriority.high}
          icon={AlertTriangle}
          tone={d.byPriority.high > 0 ? 'critical' : 'default'}
        />
        <MetricCard
          label="Media prioridad pend."
          value={d.byPriority.med}
          icon={BarChart2}
          tone={d.byPriority.med > 0 ? 'warn' : 'default'}
        />
        <MetricCard
          label="Vencidas"
          value={d.overdue.length}
          icon={AlertTriangle}
          tone={d.overdue.length > 0 ? 'critical' : 'default'}
          hint={d.overdue.length === 0 ? 'Sin vencidas' : 'Atender pronto'}
        />
      </div>

      <ReportSectionHeader
        title="Tareas vencidas"
        description="Compromisos con fecha pasada y aún sin completar"
        icon={AlertTriangle}
        tone={d.overdue.length > 0 ? 'critical' : 'default'}
        count={d.overdue.length}
        actions={
          <ExportBar
            actions={[
              {
                label: 'Tareas',
                onExport: handleExport,
                testId: 'button-export-tareas',
                count: d.tasks.length,
              },
            ]}
          />
        }
      />

      <ReportTable<Task>
        rowKey={(t) => t.id}
        rows={d.overdue}
        isLoading={d.isLoading}
        columns={[
          { header: 'Tarea', accessor: (t) => <span className="font-medium">{t.title}</span> },
          {
            header: 'Ubicación',
            accessor: (t) => <span className="text-muted-foreground">{t.scopeName}</span>,
          },
          { header: 'Responsable', accessor: (t) => t.assignee },
          {
            header: 'Vence',
            accessor: (t) => <span className="tabular text-status-critical">{t.dueDate}</span>,
          },
          {
            header: 'Prioridad',
            accessor: (t) => (
              <StatusBadge
                status={t.priority === 'high' ? 'critical' : t.priority === 'med' ? 'warn' : 'idle'}
                label={priorityLabel[t.priority]}
              />
            ),
          },
        ]}
        emptyMessage="Sin tareas vencidas."
      />

      <ReportSectionHeader
        title="Pendientes por responsable"
        description="Distribución de carga abierta entre el equipo"
        icon={Users}
        count={d.byAssigneeList.length}
      />
      <ReportTable
        rowKey={(r) => r.name}
        rows={d.byAssigneeList}
        columns={[
          { header: 'Responsable', accessor: (r) => <span className="font-medium">{r.name}</span> },
          {
            header: 'Tareas pendientes / en curso',
            accessor: (r) => <span className="tabular">{r.count}</span>,
            align: 'right',
          },
        ]}
        emptyMessage="Sin tareas pendientes."
      />

      <ReportSectionHeader
        title="Completadas recientemente"
        description="Trabajo cerrado en el período seleccionado"
        icon={CheckCircle2}
        tone="primary"
        count={d.recentDone.length}
      />
      <ReportTable<Task>
        rowKey={(t) => t.id}
        rows={d.recentDone}
        columns={[
          { header: 'Tarea', accessor: (t) => t.title },
          {
            header: 'Ubicación',
            accessor: (t) => <span className="text-muted-foreground">{t.scopeName}</span>,
          },
          { header: 'Responsable', accessor: (t) => t.assignee },
          { header: 'Fecha', accessor: (t) => <span className="tabular">{t.dueDate}</span> },
          { header: 'Estado', accessor: () => <StatusBadge status="ok" label="Completado" /> },
        ]}
        emptyMessage="Sin tareas completadas en el período."
      />
    </div>
  );
}
