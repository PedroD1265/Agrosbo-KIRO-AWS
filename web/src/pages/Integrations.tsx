import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { AlertBanner } from '@/shared/ui/AlertBanner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { MetricCard } from '@/shared/ui/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Globe,
  CheckCircle2,
  Lock,
  Plug,
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDot,
} from 'lucide-react';
import type { Adapter } from '@shared/schema';
import { EXPORT_DATASETS, type Section } from '@/features/integrations/integrationUtils';
import { AdapterCard } from '@/features/integrations/AdapterCard';
import { ExportPanel } from '@/features/integrations/ExportPanel';
import { ImportPanel } from '@/features/integrations/ImportPanel';
import { WorkbenchNav } from '@/features/integrations/WorkbenchNav';

export default function IntegrationsPage() {
  const [section, setSection] = useState<Section>('overview');
  const {
    data: adapters,
    isLoading,
    isError,
  } = useQuery<Adapter[]>({
    queryKey: ['/api/integrations/adapters'],
  });

  const { connected, enabled, needsConfig, preview, total } = useMemo(() => {
    const list = adapters ?? [];
    return {
      connected: list.filter((a) => a.state === 'connected').length,
      enabled: list.filter((a) => a.enabled).length,
      needsConfig: list.filter((a) => a.requiresSecrets).length,
      preview: list.filter((a) => a.readiness === 'stub-only').length,
      total: list.length,
    };
  }, [adapters]);

  const activeAdapters = (adapters ?? []).filter((a) => a.readiness === 'ready');
  const previewAdapters = (adapters ?? []).filter((a) => a.readiness !== 'ready');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plataforma · Workbench"
        title="Integraciones"
        subtitle="Adaptadores, exportación e importación de datos del sistema"
        meta={
          adapters && (
            <>
              <StatusBadge
                status={connected > 0 ? 'ok' : 'idle'}
                label={`${connected} activo${connected !== 1 ? 's' : ''}`}
              />
              <StatusBadge
                status={needsConfig > 0 ? 'warn' : 'idle'}
                label={`${needsConfig} pendiente${needsConfig !== 1 ? 's' : ''}`}
              />
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{total} adaptadores registrados</span>
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <WorkbenchNav
          active={section}
          onChange={setSection}
          counts={{ adapters: total, csv: EXPORT_DATASETS.length }}
        />

        <div className="min-w-0 space-y-5">
          {section === 'overview' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Activos"
                  value={connected}
                  hint="Conectados y operativos"
                  icon={CheckCircle2}
                  tone={connected > 0 ? 'ok' : 'default'}
                />
                <MetricCard
                  label="Habilitados"
                  value={enabled}
                  hint="Disponibles para uso"
                  icon={Plug}
                  tone="primary"
                />
                <MetricCard
                  label="Requieren config"
                  value={needsConfig}
                  hint="Necesitan secretos futuros"
                  icon={Lock}
                  tone={needsConfig > 0 ? 'warn' : 'default'}
                />
                <MetricCard
                  label="Vista previa"
                  value={preview}
                  hint="Solo stubs por ahora"
                  icon={CircleDot}
                />
              </div>

              <AlertBanner
                level="info"
                title="Estado del workbench"
                description="CSV está operativo para imports/exports masivos. Los conectores de clima, IoT, imágenes y backend externo están preparados pero requieren configuración futura — no afectan la operación diaria."
              />

              <Card className="border-border/60 shadow-card">
                <CardHeader className="border-b border-border/40 pb-4">
                  <CardTitle className="text-base">Acciones rápidas</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Atajos a las herramientas más usadas del workbench
                  </p>
                </CardHeader>
                <CardContent className="grid gap-2 p-4 sm:grid-cols-2">
                  <button
                    onClick={() => setSection('csv')}
                    className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background p-3 text-left transition-all hover:border-primary/40 hover:bg-primary-soft/30"
                    data-testid="quick-action-export"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <ArrowDownToLine className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Exportar datos</p>
                      <p className="text-[11px] text-muted-foreground">
                        7 datasets disponibles en CSV
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => setSection('csv')}
                    className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background p-3 text-left transition-all hover:border-primary/40 hover:bg-primary-soft/30"
                    data-testid="quick-action-import"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <ArrowUpFromLine className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Importar CSV</p>
                      <p className="text-[11px] text-muted-foreground">
                        Carga masiva con validación previa
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => setSection('adapters')}
                    className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background p-3 text-left transition-all hover:border-primary/40 hover:bg-primary-soft/30 sm:col-span-2"
                    data-testid="quick-action-adapters"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Plug className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">Ver adaptadores</p>
                      <p className="text-[11px] text-muted-foreground">
                        {total} registrados · {connected} activos · {needsConfig} requieren
                        configuración
                      </p>
                    </div>
                  </button>
                </CardContent>
              </Card>
            </>
          )}

          {section === 'adapters' && (
            <div className="space-y-6">
              {isLoading && (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-5 space-y-3">
                        <Skeleton className="h-10 w-10 rounded-md" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {isError && (
                <AlertBanner
                  level="critical"
                  title="No se pudo cargar el registro de adaptadores"
                  description="Verifique que el servidor esté activo e intente de nuevo."
                />
              )}

              {adapters && adapters.length === 0 && (
                <EmptyState
                  icon={Globe}
                  title="Sin adaptadores registrados"
                  description="El registro está vacío. Esto no debería ocurrir en condiciones normales."
                />
              )}

              {activeAdapters.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                        Activos
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Listos para usar en operación diaria
                      </p>
                    </div>
                    <span className="rounded-full bg-status-ok-soft px-2 py-0.5 text-[10px] font-semibold tabular text-status-ok">
                      {activeAdapters.length}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {activeAdapters.map((adapter) => (
                      <AdapterCard key={adapter.id} adapter={adapter} />
                    ))}
                  </div>
                </section>
              )}

              {previewAdapters.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                        Preparados para el futuro
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Contratos definidos · pendientes de configuración o conexión real
                      </p>
                    </div>
                    <span className="rounded-full bg-status-warn-soft px-2 py-0.5 text-[10px] font-semibold tabular text-status-warn">
                      {previewAdapters.length}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {previewAdapters.map((adapter) => (
                      <AdapterCard key={adapter.id} adapter={adapter} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {section === 'csv' && (
            <div className="grid gap-4 xl:grid-cols-2">
              <ExportPanel />
              <ImportPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
