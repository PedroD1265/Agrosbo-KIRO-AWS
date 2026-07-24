import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Droplets,
  ListChecks,
  AlertTriangle,
  NotebookPen,
  ChevronRight,
  Plus,
  Sprout,
  LayoutGrid,
  Sun,
  MapPin,
  ClipboardList,
  Activity,
  CalendarClock,
  CalendarRange,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertBanner } from '@/shared/ui/AlertBanner';
import { Timeline } from '@/shared/ui/Timeline';
import { EmptyState } from '@/shared/ui/EmptyState';
import { OnboardingHints } from '@/shared/ui/OnboardingHints';
import {
  useAlerts,
  useBlocks,
  useGreenhouses,
  useIrrigationEvents,
  useObservations,
  useTasks,
  useCampaigns,
} from '@/hooks/data';
import {
  rankTask,
  rankIrrigation,
  rankBlockRisk,
  getDueUrgency,
  getIrrigationUrgency,
  alertsBySeverity,
} from '@/features/today/priorityUtils';
import { PriorityTaskRow } from '@/features/today/PriorityTaskRow';
import { IrrigationRow } from '@/features/today/IrrigationRow';
import { EntityRiskCard } from '@/features/today/EntityRiskCard';
import { QuickActionTile } from '@/features/today/QuickActionTile';
import { AttentionFocusStrip } from '@/features/today/AttentionFocusStrip';
import { WeatherStrip } from '@/features/today/WeatherStrip';

export default function TodayPage() {
  const now = new Date();
  const today = now.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });
  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  const { data: tasks = [] } = useTasks();
  const { data: irrigation = [] } = useIrrigationEvents();
  const { data: blocks = [] } = useBlocks();
  const { data: greenhouses = [] } = useGreenhouses();
  const { data: alerts = [] } = useAlerts();
  const { data: observations = [] } = useObservations();
  const { data: campaigns = [] } = useCampaigns();

  const isOnboarding = blocks.length === 0 && greenhouses.length === 0;

  const sortedTasks = useMemo(
    () => [...tasks].filter((t) => t.status !== 'done').sort((a, b) => rankTask(b) - rankTask(a)),
    [tasks],
  );
  const overdueTasks = sortedTasks.filter((t) => getDueUrgency(t.dueDate) === 'overdue');
  const todayTasks = sortedTasks.filter((t) => getDueUrgency(t.dueDate) === 'today');
  const completedToday = tasks.filter((t) => t.status === 'done').length;

  const sortedIrrigation = useMemo(
    () =>
      [...irrigation]
        .filter((i) => i.status === 'scheduled')
        .sort((a, b) => rankIrrigation(b) - rankIrrigation(a)),
    [irrigation],
  );
  const overdueIrr = sortedIrrigation.filter(
    (i) => getIrrigationUrgency(i.scheduledAt) === 'overdue',
  );
  const todayIrr = sortedIrrigation.filter((i) => {
    const u = getIrrigationUrgency(i.scheduledAt);
    return u === 'today' || u === 'soon';
  });

  const riskEntities = useMemo(() => {
    const b = blocks
      .filter((x) => x.status === 'critical' || x.status === 'warn')
      .map((x) => ({ kind: 'block' as const, ...x }));
    const g = greenhouses
      .filter((x) => x.status === 'critical' || x.status === 'warn')
      .map((x) => ({ kind: 'greenhouse' as const, ...x }));
    return [...b, ...g].sort((a, b) => rankBlockRisk(b) - rankBlockRisk(a));
  }, [blocks, greenhouses]);

  const alertCounts = alertsBySeverity(alerts);
  const attentionCount =
    overdueTasks.length + todayTasks.length + overdueIrr.length + todayIrr.length;
  const overdueTotal = overdueTasks.length + overdueIrr.length;
  const recentIncidents = useMemo(
    () => observations.filter((o) => o.type !== 'note').slice(0, 5),
    [observations],
  );

  // Centroide promedio de los bloques con coordenadas — usado para el clima.
  const farmCentroid = useMemo(() => {
    const withCoords = blocks
      .map((b) => ({
        lat: (b as any).centroidLat as number | null,
        lng: (b as any).centroidLng as number | null,
      }))
      .filter(
        (c): c is { lat: number; lng: number } =>
          typeof c.lat === 'number' && typeof c.lng === 'number',
      );
    if (withCoords.length === 0) return { lat: -17.5, lng: -65.95 }; // fallback Toco, Cochabamba
    const lat = withCoords.reduce((s, c) => s + c.lat, 0) / withCoords.length;
    const lng = withCoords.reduce((s, c) => s + c.lng, 0) / withCoords.length;
    return { lat, lng };
  }, [blocks]);

  if (isOnboarding) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8 text-primary-foreground shadow-elevated md:p-10">
          <div className="relative z-10 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
              Bienvenida a AgrosBO · {today}
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">
              Configuremos tu primera unidad de producción
            </h1>
            <p className="mt-3 text-sm text-primary-foreground/85 md:text-base">
              Registra al menos un bloque o invernadero para empezar a programar riegos, asignar
              tareas, registrar cosechas y observaciones de campo.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="lg" variant="secondary" asChild data-testid="button-onboard-block">
                <Link to="/blocks">
                  <LayoutGrid className="h-4 w-4" /> Crear bloque
                </Link>
              </Button>
              <Button
                size="lg"
                asChild
                data-testid="button-onboard-gh"
                className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25 border border-primary-foreground/20"
              >
                <Link to="/greenhouses">
                  <Sprout className="h-4 w-4" /> Crear invernadero
                </Link>
              </Button>
            </div>
          </div>
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-16 left-1/3 h-72 w-72 rounded-full bg-primary-foreground/10 blur-3xl" />
        </div>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Próximos pasos sugeridos</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {[
                'Crea un bloque o invernadero con su cultivo y etapa.',
                'Define una campaña activa para iniciar el ciclo productivo.',
                'Programa el primer riego y asigna tareas a tu equipo.',
                'Registra observaciones de campo desde móvil (funciona offline).',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ------------- Workboard ------------- */
  const dayStable = attentionCount === 0 && alertCounts.critical === 0 && riskEntities.length === 0;
  const heroTitle =
    overdueTotal > 0
      ? `${overdueTotal} pendiente${overdueTotal === 1 ? '' : 's'} vencido${overdueTotal === 1 ? '' : 's'}. Atender primero.`
      : attentionCount > 0
        ? `${greeting}. ${attentionCount} ${attentionCount === 1 ? 'ítem requiere' : 'ítems requieren'} tu atención.`
        : `${greeting}. Estás al día.`;

  return (
    <div className="space-y-5 animate-fade-in pb-4">
      {/* Hero compacto — densidad alta, sin desperdicio vertical */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero px-5 py-5 text-primary-foreground shadow-elevated md:px-7 md:py-6">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
              <Sun className="h-3.5 w-3.5" /> {today}
            </div>
            <h1 className="mt-1.5 text-xl font-semibold leading-tight md:text-2xl text-balance">
              {heroTitle}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-primary-foreground/80 md:text-sm">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Toco, Cochabamba
              </span>
              <span className="text-primary-foreground/40">·</span>
              <span className="tabular">{blocks.length} bloques</span>
              <span className="text-primary-foreground/40">·</span>
              <span className="tabular">{greenhouses.length} invernaderos</span>
            </p>
          </div>
          <div className="flex shrink-0 items-stretch gap-2">
            <div
              className={cn(
                'flex flex-col justify-center rounded-xl border border-primary-foreground/15 px-3.5 py-2 backdrop-blur-sm min-w-[68px]',
                overdueTotal > 0
                  ? 'bg-status-critical/25 ring-1 ring-status-critical/40'
                  : 'bg-primary-foreground/10',
              )}
            >
              <span className="text-2xl font-semibold tabular leading-none md:text-[28px]">
                {overdueTotal}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-wider text-primary-foreground/85">
                vencidos
              </span>
            </div>
            <div className="flex flex-col justify-center rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-3.5 py-2 backdrop-blur-sm min-w-[68px]">
              <span className="text-2xl font-semibold tabular leading-none md:text-[28px]">
                {todayTasks.length + todayIrr.length}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-wider text-primary-foreground/85">
                de hoy
              </span>
            </div>
            <div className="hidden flex-col justify-center rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-3.5 py-2 backdrop-blur-sm min-w-[68px] md:flex">
              <span className="text-2xl font-semibold tabular leading-none md:text-[28px]">
                {completedToday}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-wider text-primary-foreground/85">
                hechas
              </span>
            </div>
          </div>
        </div>
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
      </div>

      <WeatherStrip lat={farmCentroid.lat} lng={farmCentroid.lng} />

      {/* Banner crítico — solo si hay vencidos o alertas críticas */}
      {(alertCounts.critical > 0 || overdueTotal > 0) && (
        <AlertBanner
          level="critical"
          title={
            overdueTotal > 0
              ? `${overdueTotal} pendiente${overdueTotal === 1 ? '' : 's'} vencido${overdueTotal === 1 ? '' : 's'}`
              : `${alertCounts.critical} alerta${alertCounts.critical === 1 ? '' : 's'} crítica${alertCounts.critical === 1 ? '' : 's'}`
          }
          description="Resuelve estos ítems antes de continuar con el resto del día."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/tasks">Revisar</Link>
            </Button>
          }
        />
      )}

      {/* Foco operativo — solo cuando hay carga real; si día estable, se omite */}
      {!dayStable && (
        <AttentionFocusStrip
          overdueCount={overdueTotal}
          todayTasksCount={todayTasks.length}
          irrigationCount={todayIrr.length + overdueIrr.length}
          riskCount={riskEntities.length}
        />
      )}

      {dayStable && (
        <div className="flex items-center gap-3 rounded-xl border border-status-ok/30 bg-status-ok-soft/50 px-4 py-3 text-sm text-status-ok">
          <Activity className="h-4 w-4 shrink-0" />
          <p className="font-medium">Día estable.</p>
          <p className="text-status-ok/80">
            Sin vencidos, sin alertas críticas, sin unidades en riesgo.
          </p>
        </div>
      )}

      {/* Onboarding hints (descartables) */}
      <OnboardingHints
        steps={[
          {
            id: 'unit',
            label: 'Crear bloque o invernadero',
            to: '/blocks',
            done: blocks.length + greenhouses.length > 0,
            icon: LayoutGrid,
          },
          {
            id: 'campaign',
            label: 'Iniciar primera campaña',
            to: '/campaigns',
            done: campaigns.length > 0,
            icon: CalendarRange,
          },
          {
            id: 'task',
            label: 'Asignar primera tarea',
            to: '/tasks',
            done: tasks.length > 0,
            icon: ListChecks,
          },
          {
            id: 'irrigation',
            label: 'Programar primer riego',
            to: '/irrigation',
            done: irrigation.length > 0,
            icon: Droplets,
          },
        ]}
      />

      {/* Layout principal — desktop: 2/3 + 1/3, mobile: stack */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        {/* Columna principal: prioridades operativas */}
        <div className="space-y-5">
          {/* Tareas + Riegos en grid 2 columnas dentro de la columna principal en lg */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="shadow-card">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ListChecks className="h-4 w-4 text-primary" /> Tareas prioritarias
                    {sortedTasks.length > 0 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular text-muted-foreground">
                        {sortedTasks.length}
                      </span>
                    )}
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Vencidas y de hoy, ordenadas por urgencia
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/tasks">
                    Todas <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {sortedTasks.length === 0 ? (
                  <EmptyState
                    icon={ListChecks}
                    title="Sin tareas pendientes"
                    description="Todo el trabajo del día está completo."
                    compact
                  />
                ) : (
                  sortedTasks.slice(0, 5).map((t) => <PriorityTaskRow key={t.id} task={t} />)
                )}
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/tasks">
                    <Plus className="h-4 w-4" />{' '}
                    {sortedTasks.length === 0 ? 'Asignar nueva tarea' : 'Crear nueva tarea'}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Droplets className="h-4 w-4 text-status-pending-sync" /> Riegos próximos
                    {sortedIrrigation.length > 0 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular text-muted-foreground">
                        {sortedIrrigation.length}
                      </span>
                    )}
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Programados, vencidos o en próximas horas
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/irrigation">
                    Todos <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {sortedIrrigation.length === 0 ? (
                  <EmptyState
                    icon={Droplets}
                    title="Sin riegos programados"
                    description="No hay eventos de riego pendientes en este momento."
                    compact
                  />
                ) : (
                  sortedIrrigation.slice(0, 5).map((i) => <IrrigationRow key={i.id} event={i} />)
                )}
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/irrigation">
                    <Plus className="h-4 w-4" />{' '}
                    {sortedIrrigation.length === 0 ? 'Programar primer riego' : 'Programar riego'}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Unidades en riesgo */}
          <Card className="shadow-card">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-status-warn" /> Unidades que preocupan
                  {riskEntities.length > 0 && (
                    <span className="rounded-full bg-status-warn-soft px-2 py-0.5 text-[10px] font-semibold tabular text-status-warn">
                      {riskEntities.length}
                    </span>
                  )}
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Bloques e invernaderos en estado crítico o de atención
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/blocks">
                  Ver bloques <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {riskEntities.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="Toda la operación está estable"
                  description="Ningún bloque o invernadero requiere atención inmediata."
                />
              ) : (
                <div className="grid gap-2.5 md:grid-cols-2">
                  {riskEntities.slice(0, 6).map((e) => (
                    <EntityRiskCard
                      key={`${e.kind}-${e.id}`}
                      entity={e}
                      lastIrrigation={
                        e.kind === 'block'
                          ? new Date(e.lastIrrigation).toLocaleDateString('es-BO', {
                              day: '2-digit',
                              month: 'short',
                            })
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: quick actions + actividad reciente (sticky en xl) */}
        <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-accent" /> Acciones rápidas
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Captura desde campo en segundos
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
                <QuickActionTile
                  to="/irrigation"
                  icon={Droplets}
                  label="Registrar riego"
                  hint="Programar o ejecutar"
                  tone="primary"
                  testId="qa-irrigation"
                />
                <QuickActionTile
                  to="/tasks"
                  icon={ListChecks}
                  label="Crear tarea"
                  hint="Asignar al equipo"
                  tone="accent"
                  testId="qa-task"
                />
                <QuickActionTile
                  to="/observations"
                  icon={NotebookPen}
                  label="Observación"
                  hint="Bitácora de campo"
                  tone="default"
                  testId="qa-obs"
                />
                <QuickActionTile
                  to="/harvest"
                  icon={ClipboardList}
                  label="Registrar cosecha"
                  hint="Crear lote"
                  tone="warn"
                  testId="qa-harvest"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  {recentIncidents.length > 0 ? (
                    <AlertTriangle className="h-4 w-4 text-status-warn" />
                  ) : (
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  )}
                  {recentIncidents.length > 0 ? 'Incidencias recientes' : 'Bitácora reciente'}
                  {recentIncidents.length > 0 && (
                    <span className="rounded-full bg-status-warn-soft px-2 py-0.5 text-[10px] font-semibold tabular text-status-warn">
                      {recentIncidents.length}
                    </span>
                  )}
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {recentIncidents.length > 0
                    ? 'Plagas, enfermedades e incidencias detectadas'
                    : 'Últimas observaciones de campo'}
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/observations" aria-label="Ver todas las observaciones">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {observations.length === 0 ? (
                <EmptyState
                  icon={NotebookPen}
                  title="Sin observaciones aún"
                  description="Registra incidencias, plagas o notas desde el equipo en campo."
                  compact
                />
              ) : (
                <Timeline
                  items={(recentIncidents.length > 0
                    ? recentIncidents
                    : observations.slice(0, 5)
                  ).map((o) => ({
                    id: o.id,
                    title: `${o.scopeName} · ${o.author}`,
                    description: o.text,
                    meta: new Date(o.createdAt).toLocaleString('es-BO', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }),
                    tone:
                      o.type === 'incident' || o.type === 'disease'
                        ? 'critical'
                        : o.type === 'pest'
                          ? 'warn'
                          : 'default',
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
