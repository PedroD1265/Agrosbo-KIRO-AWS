import { MetricCard } from '@/shared/ui/MetricCard';
import { ReportTable } from './ReportTable';
import { ReportFilters } from './ReportFilters';
import { ExportBar } from './ExportBar';
import { ReportSectionHeader } from './ReportSectionHeader';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { useIrrigationReport } from './useReportData';
import { exportCsv } from './csvExport';
import type { ReportFilters as Filters } from './types';
import { Droplets, CheckCircle2, XCircle, Clock, MapPin } from 'lucide-react';
import type { IrrigationEvent } from '@shared/schema';

interface Props {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
}

export function CumplimientoRiego({ filters, onFiltersChange }: Props) {
  const d = useIrrigationReport(filters);

  function handleExport() {
    exportCsv<IrrigationEvent>(
      d.events,
      [
        { header: 'ID', accessor: (e) => e.id },
        { header: 'Ubicación', accessor: (e) => e.scopeName },
        { header: 'Tipo', accessor: (e) => e.scopeType },
        { header: 'Programado', accessor: (e) => e.scheduledAt },
        { header: 'Duración (min)', accessor: (e) => e.durationMin },
        { header: 'Volumen (L)', accessor: (e) => e.volumeL ?? '' },
        { header: 'Estado', accessor: (e) => e.status },
        { header: 'Responsable', accessor: (e) => e.responsible ?? '' },
        { header: 'Notas', accessor: (e) => e.notes ?? '' },
      ],
      'riego.csv',
    );
  }

  const pct = d.total > 0 ? Math.round((d.done / d.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <ReportFilters
        filters={filters}
        onChange={onFiltersChange}
        show={{ dateRange: true, scope: true, status: true }}
        statusOptions={[
          { value: 'scheduled', label: 'Programado' },
          { value: 'done', label: 'Completado' },
          { value: 'skipped', label: 'Omitido' },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Total eventos" value={d.total} icon={Droplets} />
        <MetricCard
          label="Completados"
          value={d.done}
          icon={CheckCircle2}
          tone="ok"
          hint={`${pct}% cumplimiento`}
        />
        <MetricCard
          label="Programados"
          value={d.scheduled}
          icon={Clock}
          tone={d.scheduled > 0 ? 'warn' : 'default'}
        />
        <MetricCard
          label="Omitidos"
          value={d.skipped}
          icon={XCircle}
          tone={d.skipped > 0 ? 'critical' : 'default'}
        />
      </div>

      <ReportSectionHeader
        title="Detalle por ubicación"
        description="Cumplimiento de riego desglosado por bloque/invernadero"
        icon={MapPin}
        count={d.byScopeList.length}
        actions={
          <ExportBar
            actions={[
              {
                label: 'Riego',
                onExport: handleExport,
                testId: 'button-export-riego',
                count: d.events.length,
              },
            ]}
          />
        }
      />

      <ReportTable
        rowKey={(r) => r.name}
        rows={d.byScopeList}
        isLoading={d.isLoading}
        columns={[
          { header: 'Ubicación', accessor: (r) => <span className="font-medium">{r.name}</span> },
          {
            header: 'Total',
            accessor: (r) => <span className="tabular">{r.total}</span>,
            align: 'right',
          },
          {
            header: 'Completados',
            accessor: (r) => <span className="tabular">{r.done}</span>,
            align: 'right',
          },
          {
            header: 'Programados',
            accessor: (r) => <span className="tabular">{r.scheduled}</span>,
            align: 'right',
          },
          {
            header: 'Omitidos',
            accessor: (r) => <span className="tabular">{r.skipped}</span>,
            align: 'right',
          },
          {
            header: 'Cumplimiento',
            accessor: (r) => {
              const p = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
              return (
                <StatusBadge
                  status={p >= 80 ? 'ok' : p >= 50 ? 'warn' : 'critical'}
                  label={`${p}%`}
                />
              );
            },
          },
        ]}
        emptyMessage="Sin eventos de riego en el período seleccionado."
      />
    </div>
  );
}
