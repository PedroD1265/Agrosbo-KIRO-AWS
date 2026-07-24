import { useMemo, useState } from 'react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { ResumenOperativo } from '@/features/reports/ResumenOperativo';
import { ReportePorBloque } from '@/features/reports/ReportePorBloque';
import { ReportePorInvernadero } from '@/features/reports/ReportePorInvernadero';
import { CumplimientoRiego } from '@/features/reports/CumplimientoRiego';
import { ReporteTareas } from '@/features/reports/ReporteTareas';
import { InventarioCosecha } from '@/features/reports/InventarioCosecha';
import { ObservacionesExport } from '@/features/reports/ObservacionesExport';
import { defaultFilters } from '@/features/reports/types';
import type { ReportFilters } from '@/features/reports/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  LayoutGrid,
  Warehouse,
  Droplets,
  CheckSquare,
  Package,
  Eye,
  Download,
  type LucideIcon,
} from 'lucide-react';

const CSV_REPORTS: { key: string; label: string; description: string }[] = [
  {
    key: 'applications',
    label: 'Aplicaciones fitosanitarias',
    description: 'Productos, dosis, áreas tratadas',
  },
  { key: 'carencia', label: 'Carencias activas', description: 'Días para reingreso/cosecha' },
  { key: 'expenses', label: 'Gastos', description: 'Movimientos por categoría y campaña' },
  { key: 'labor', label: 'Jornales', description: 'Costos de mano de obra' },
  { key: 'apiaries', label: 'Apiarios', description: 'Listado y estado actual' },
  { key: 'hives', label: 'Colmenas', description: 'Inventario completo por apiario' },
  { key: 'inspections', label: 'Inspecciones de colmena', description: 'Histórico de revisiones' },
  { key: 'honey-harvests', label: 'Cosechas de miel', description: 'Producción registrada' },
];

type ReportKey =
  'resumen' | 'bloques' | 'invernaderos' | 'riego' | 'tareas' | 'inventario' | 'observaciones';

interface ReportItem {
  key: ReportKey;
  label: string;
  description: string;
  icon: LucideIcon;
  group: 'Visión general' | 'Por entidad' | 'Operación';
}

const REPORTS: ReportItem[] = [
  {
    key: 'resumen',
    label: 'Resumen operativo',
    description: 'KPIs globales del campo',
    icon: LayoutDashboard,
    group: 'Visión general',
  },
  {
    key: 'bloques',
    label: 'Por bloque',
    description: 'Estado consolidado de parcelas',
    icon: LayoutGrid,
    group: 'Por entidad',
  },
  {
    key: 'invernaderos',
    label: 'Por invernadero',
    description: 'Estado de entornos protegidos',
    icon: Warehouse,
    group: 'Por entidad',
  },
  {
    key: 'riego',
    label: 'Cumplimiento riego',
    description: 'Programado vs realizado',
    icon: Droplets,
    group: 'Operación',
  },
  {
    key: 'tareas',
    label: 'Tareas',
    description: 'Vencidas, pendientes y ejecución',
    icon: CheckSquare,
    group: 'Operación',
  },
  {
    key: 'inventario',
    label: 'Inventario y cosecha',
    description: 'Stock crítico y lotes producidos',
    icon: Package,
    group: 'Operación',
  },
  {
    key: 'observaciones',
    label: 'Observaciones',
    description: 'Bitácora de campo e incidencias',
    icon: Eye,
    group: 'Operación',
  },
];

const GROUPS: ReportItem['group'][] = ['Visión general', 'Por entidad', 'Operación'];

export default function ReportsPage() {
  const [active, setActive] = useState<ReportKey>('resumen');
  const [irrigationFilters, setIrrigationFilters] = useState<ReportFilters>(defaultFilters);
  const [taskFilters, setTaskFilters] = useState<ReportFilters>(defaultFilters);
  const [inventoryFilters, setInventoryFilters] = useState<ReportFilters>(defaultFilters);
  const [observationFilters, setObservationFilters] = useState<ReportFilters>(defaultFilters);

  const current = useMemo(() => REPORTS.find((r) => r.key === active)!, [active]);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="Sistema · Insights operativos"
        title="Reportes"
        subtitle="Indicadores agronómicos y exportaciones por dominio"
      />

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        {/* Sidebar de reportes (desktop) */}
        <aside className="hidden lg:block">
          <Card className="sticky top-4 overflow-hidden">
            <CardContent className="p-2">
              {GROUPS.map((group) => (
                <div key={group} className="mb-2 last:mb-0">
                  <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </p>
                  <div className="space-y-0.5">
                    {REPORTS.filter((r) => r.group === group).map((r) => {
                      const Icon = r.icon;
                      const isActive = active === r.key;
                      return (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => setActive(r.key)}
                          data-testid={`tab-${r.key}`}
                          className={cn(
                            'group flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
                            isActive
                              ? 'bg-primary-soft text-primary'
                              : 'text-foreground hover:bg-muted/50',
                          )}
                        >
                          <Icon
                            className={cn(
                              'mt-0.5 h-4 w-4 shrink-0',
                              isActive
                                ? 'text-primary'
                                : 'text-muted-foreground group-hover:text-foreground',
                            )}
                          />
                          <div className="min-w-0">
                            <p
                              className={cn(
                                'text-sm leading-tight',
                                isActive ? 'font-semibold' : 'font-medium',
                              )}
                            >
                              {r.label}
                            </p>
                            <p
                              className={cn(
                                'mt-0.5 text-[11px] leading-tight',
                                isActive ? 'text-primary/80' : 'text-muted-foreground',
                              )}
                            >
                              {r.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        {/* Selector mobile (chips horizontales) */}
        <div className="lg:hidden -mx-2 overflow-x-auto px-2 pb-1">
          <div className="flex w-max gap-1.5">
            {REPORTS.map((r) => {
              const Icon = r.icon;
              const isActive = active === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setActive(r.key)}
                  data-testid={`tab-mobile-${r.key}`}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido del reporte */}
        <section className="min-w-0 space-y-4">
          {/* Header contextual del reporte activo */}
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-gradient-to-br from-primary-soft/40 to-transparent px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <current.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                {current.group}
              </p>
              <h2 className="text-base font-semibold leading-tight">{current.label}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{current.description}</p>
            </div>
          </div>

          {/* Descargas CSV (siempre visibles) */}
          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Exportar a CSV</p>
                  <p className="text-xs text-muted-foreground">
                    Descarga el dataset completo en formato CSV
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {CSV_REPORTS.map((r) => (
                  <a
                    key={r.key}
                    href={`/api/reports/${r.key}.csv`}
                    download
                    data-testid={`link-csv-${r.key}`}
                    className="flex items-start gap-2 rounded-lg border border-border/60 p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary-soft/30"
                  >
                    <Download className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-tight">{r.label}</p>
                      <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                        {r.description}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          <div data-testid={`report-${active}`}>
            {active === 'resumen' && <ResumenOperativo />}
            {active === 'bloques' && <ReportePorBloque />}
            {active === 'invernaderos' && <ReportePorInvernadero />}
            {active === 'riego' && (
              <CumplimientoRiego
                filters={irrigationFilters}
                onFiltersChange={setIrrigationFilters}
              />
            )}
            {active === 'tareas' && (
              <ReporteTareas filters={taskFilters} onFiltersChange={setTaskFilters} />
            )}
            {active === 'inventario' && (
              <InventarioCosecha filters={inventoryFilters} onFiltersChange={setInventoryFilters} />
            )}
            {active === 'observaciones' && (
              <ObservacionesExport
                filters={observationFilters}
                onFiltersChange={setObservationFilters}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
