import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ListChecks,
  Droplets,
  NotebookPen,
  PackageCheck,
  Boxes,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { StageBadge } from '@/shared/ui/StageBadge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useCampaigns,
  useCampaignSummary,
  useCropCatalog,
  useApplications,
  useAlerts,
  useCampaignCosts,
} from '@/hooks/data';
import { DollarSign } from 'lucide-react';
import { findCrop, estimateStage } from '@agrosbo/shared/cropCatalog';

function fmtDate(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime())
    ? s
    : d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMoney(n: number, currency: string | null) {
  return `${currency ?? ''} ${n.toLocaleString('es-BO', { maximumFractionDigits: 2 })}`.trim();
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaigns = [] } = useCampaigns();
  const { data: summary, isLoading } = useCampaignSummary(id);
  const { data: catalog = [] } = useCropCatalog();
  const { data: applications = [] } = useApplications();
  const { data: alerts = [] } = useAlerts();
  const { data: costs } = useCampaignCosts(id);

  const camp = campaigns.find((c) => c.id === id);
  if (!camp) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/campaigns">
            <ArrowLeft className="h-4 w-4" /> Campañas
          </Link>
        </Button>
        <EmptyState
          title="Campaña no encontrada"
          description="Es posible que haya sido eliminada."
        />
      </div>
    );
  }

  const cropDef =
    findCrop(camp.crop) ??
    catalog.find((c) => c.cropName.toLowerCase() === camp.crop.toLowerCase());
  const phenology = cropDef ? estimateStage(cropDef, camp.startDate) : null;

  const campApps = applications.filter(
    (a) =>
      a.campaignId === camp.id ||
      (a.scopeType === camp.scopeType &&
        a.scopeId === camp.scopeId &&
        a.appliedAt.slice(0, 10) >= camp.startDate &&
        a.appliedAt.slice(0, 10) <= camp.endDate),
  );
  const todayIso = new Date().toISOString().slice(0, 10);
  const activeCarencia = campApps.filter((a) => a.safeHarvestDate && a.safeHarvestDate >= todayIso);

  const relatedAlerts = alerts.filter((a) => a.scope === camp.scopeName);

  return (
    <div className="space-y-5 animate-fade-in">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/campaigns">
          <ArrowLeft className="h-4 w-4" /> Campañas
        </Link>
      </Button>
      <PageHeader
        eyebrow={`${camp.scopeType === 'block' ? 'Bloque' : 'Invernadero'} · ${camp.scopeName}`}
        title={`${camp.crop} · ${camp.variety}`}
        subtitle={`${fmtDate(camp.startDate)} → ${fmtDate(camp.endDate)} · Progreso ${camp.progress}%`}
        actions={
          <div className="flex items-center gap-2">
            <StageBadge stage={camp.stage} />
            <StatusBadge status={camp.status} />
          </div>
        }
      />

      {/* Phenology */}
      {phenology && cropDef && (
        <Card data-testid="card-camp-phenology">
          <CardContent className="p-5 space-y-2">
            <p className="text-xs uppercase text-muted-foreground tracking-wider">
              Fenología (referencial)
            </p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold">
                  Etapa estimada: {phenology.current?.label ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Día {phenology.dayOffset} de ~{cropDef.typicalCycleDays} (
                  {Math.round(phenology.cycleProgress * 100)}%)
                  {phenology.isOverdue && (
                    <span className="ml-2 text-status-warn">· Posiblemente atrasada</span>
                  )}
                </p>
              </div>
              <Badge variant="outline">Manual: {camp.stage}</Badge>
            </div>
            {phenology.current?.irrigationNotes && (
              <p className="text-sm">💧 {phenology.current.irrigationNotes}</p>
            )}
            {phenology.current?.taskSuggestions?.length ? (
              <p className="text-sm text-muted-foreground">
                Sugerencias: {phenology.current.taskSuggestions.join(', ')}
              </p>
            ) : null}
            {phenology.current?.monitoringSuggestions?.length ? (
              <p className="text-sm text-muted-foreground">
                Monitorear: {phenology.current.monitoringSuggestions.join(', ')}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Carencia activa */}
      {activeCarencia.length > 0 && (
        <Card data-testid="card-camp-carencia" className="border-status-warn/40">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-status-warn" />
              <p className="text-sm font-semibold">Carencia activa ({activeCarencia.length})</p>
            </div>
            <ul className="text-sm space-y-1">
              {activeCarencia.map((a) => (
                <li key={a.id}>
                  · {a.productName} → seguro a partir de {a.safeHarvestDate}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {isLoading || !summary ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Cargando resumen…</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <Card data-testid="card-camp-tasks">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                <p className="text-sm font-semibold">Tareas</p>
              </div>
              <p className="text-2xl font-bold tabular">{summary.tasks.total}</p>
              <p className="text-xs text-muted-foreground">
                Pend: {summary.tasks.pending} · En curso: {summary.tasks.in_progress} · Hechas:{' '}
                {summary.tasks.done}
                {summary.tasks.overdue > 0 && (
                  <span className="ml-1 text-status-warn">· Vencidas: {summary.tasks.overdue}</span>
                )}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="card-camp-irrigation">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                <p className="text-sm font-semibold">Riego</p>
              </div>
              <p className="text-2xl font-bold tabular">{summary.irrigation.total}</p>
              <p className="text-xs text-muted-foreground">
                Hechos: {summary.irrigation.done} · Programados: {summary.irrigation.scheduled}
                {summary.irrigation.totalDurationMin > 0 &&
                  ` · ${summary.irrigation.totalDurationMin}min totales`}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="card-camp-observations">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <NotebookPen className="h-4 w-4" />
                <p className="text-sm font-semibold">Observaciones</p>
              </div>
              <p className="text-2xl font-bold tabular">{summary.observations.total}</p>
              <p className="text-xs text-muted-foreground">
                {Object.entries(summary.observations.byType)
                  .map(([k, v]) => `${k}:${v}`)
                  .join(' · ') || 'Sin observaciones'}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="card-camp-applications">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4" />
                <p className="text-sm font-semibold">Aplicaciones</p>
              </div>
              <p className="text-2xl font-bold tabular">{campApps.length}</p>
              <p className="text-xs text-muted-foreground">
                {campApps.length > 0
                  ? `Última: ${fmtDate(campApps[0].appliedAt)}`
                  : 'Sin aplicaciones registradas'}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="card-camp-harvest" className="md:col-span-2">
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4" />
                <p className="text-sm font-semibold">Cosecha y margen</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Lotes</p>
                  <p className="text-lg font-bold tabular">{summary.harvest.lots}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cantidad</p>
                  <p className="text-lg font-bold tabular">
                    {summary.harvest.totalQuantity.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ingreso</p>
                  <p className="text-lg font-bold tabular">
                    {fmtMoney(summary.harvest.revenue, summary.harvest.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Margen prelim.</p>
                  {(() => {
                    const totalCost = summary.harvest.cost + summary.costs.fromMovements;
                    const hasRevenue = summary.harvest.revenue > 0;
                    if (hasRevenue && totalCost === 0) {
                      return <p className="text-lg font-bold tabular text-muted-foreground">—</p>;
                    }
                    const realMargin = summary.harvest.revenue - totalCost;
                    return (
                      <p
                        className={`text-lg font-bold tabular ${realMargin >= 0 ? 'text-status-ok' : 'text-status-critical'}`}
                      >
                        {fmtMoney(realMargin, summary.harvest.currency)}
                      </p>
                    );
                  })()}
                </div>
              </div>
              {summary.harvest.revenue > 0 &&
                summary.harvest.cost === 0 &&
                summary.costs.fromMovements === 0 && (
                  <p
                    className="text-[11px] text-muted-foreground"
                    data-testid="camp-margin-warning"
                  >
                    Margen no calculado · sin costos asignados a lotes ni movimientos de inventario
                    en el periodo
                  </p>
                )}
              <p className="text-xs text-muted-foreground">
                Costo asignado a lotes: {fmtMoney(summary.harvest.cost, summary.harvest.currency)}
                {' · '}Costo movimientos inventario:{' '}
                {fmtMoney(summary.costs.fromMovements, summary.costs.currency)}
              </p>
            </CardContent>
          </Card>
          {costs && (
            <Card data-testid="card-camp-costs" className="md:col-span-2">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <p className="text-sm font-semibold">Gastos registrados ({costs.count})</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Total BOB</p>
                    <p className="text-lg font-bold tabular" data-testid="text-camp-total-cost">
                      {costs.totalBOB.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Jornales</p>
                    <p className="text-lg font-bold tabular">{costs.laborTotal.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Insumos</p>
                    <p className="text-lg font-bold tabular">
                      {(costs.byCategory['insumo'] ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Margen real</p>
                    <p
                      className={`text-lg font-bold tabular ${summary && summary.harvest.revenue - costs.totalBOB >= 0 ? 'text-status-ok' : 'text-status-critical'}`}
                    >
                      {summary ? (summary.harvest.revenue - costs.totalBOB).toFixed(2) : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(costs.byCategory).map(([cat, amt]) => (
                    <Badge key={cat} variant="secondary" className="text-[10px]">
                      {cat}: {amt.toFixed(2)}
                    </Badge>
                  ))}
                </div>
                <Link to="/expenses" className="text-xs text-primary hover:underline">
                  Ver gastos →
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {relatedAlerts.length > 0 && (
        <Card data-testid="card-camp-alerts">
          <CardContent className="p-5 space-y-2">
            <p className="text-sm font-semibold">Alertas relacionadas ({relatedAlerts.length})</p>
            <ul className="text-sm space-y-1">
              {relatedAlerts.slice(0, 8).map((a) => (
                <li key={a.id} className="flex gap-2">
                  <Badge variant={a.level === 'critical' ? 'destructive' : 'secondary'}>
                    {a.level}
                  </Badge>
                  <span>{a.message}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
