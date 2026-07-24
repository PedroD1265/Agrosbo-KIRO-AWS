import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/shared/ui/PageHeader';
import { WeatherStrip } from '@/features/today/WeatherStrip';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { StageBadge } from '@/shared/ui/StageBadge';
import { MetricCard } from '@/shared/ui/MetricCard';
import { Timeline } from '@/shared/ui/Timeline';
import { EmptyState } from '@/shared/ui/EmptyState';
import { DetailSkeleton } from '@/shared/ui/DetailSkeleton';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { QuickCaptureDrawer } from '@/shared/ui/QuickCaptureDrawer';
import { BlockForm } from '@/shared/forms/BlockForm';
import { queueDeleteBlock } from '@/hooks/data/mutations';
import { EntityQuickActions } from '@/shared/ui/EntityQuickActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Droplets,
  LayoutGrid,
  ListChecks,
  NotebookPen,
  PackageCheck,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  useBlock,
  useCampaigns,
  useHarvestLots,
  useIrrigationEvents,
  useObservations,
  useSpatialFeatures,
  useTasks,
} from '@/hooks/data';
import { SpatialMap } from '@/components/map/SpatialMap';

export default function BlockDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [openEdit, setOpenEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: block, isLoading } = useBlock(id);
  const { data: campaigns = [] } = useCampaigns();
  const { data: irrigation = [] } = useIrrigationEvents();
  const { data: tasks = [] } = useTasks();
  const { data: observations = [] } = useObservations();
  const { data: lots = [] } = useHarvestLots();
  const { data: spatial } = useSpatialFeatures();

  if (isLoading) return <DetailSkeleton />;
  if (!block)
    return (
      <EmptyState
        icon={LayoutGrid}
        title="Bloque no encontrado"
        description="Verifica el identificador en la URL o regresa al listado."
        action={
          <Button asChild size="sm">
            <Link to="/blocks">
              <ArrowLeft className="h-4 w-4" /> Volver a Bloques
            </Link>
          </Button>
        }
      />
    );

  const campaign = campaigns.find((c) => c.scopeType === 'block' && c.scopeId === block.id);
  const blockIrrigation = irrigation.filter(
    (i) => i.scopeType === 'block' && i.scopeId === block.id,
  );
  const blockTasks = tasks.filter((t) => t.scopeType === 'block' && t.scopeId === block.id);
  const blockObs = observations.filter((o) => o.scopeType === 'block' && o.scopeId === block.id);
  const blockLots = lots.filter((l) => l.originType === 'block' && l.originId === block.id);

  return (
    <div className="space-y-5 animate-fade-in">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="-ml-2 h-8 text-muted-foreground hover:text-foreground"
      >
        <Link to="/blocks">
          <ArrowLeft className="h-4 w-4" /> Bloques
        </Link>
      </Button>

      <PageHeader
        eyebrow={`${block.farm} · ${block.areaHa} ha`}
        title={block.name}
        subtitle={`${block.crop}${block.variety ? ' · ' + block.variety : ''}`}
        meta={
          <>
            <StatusBadge status={block.status} />
            <StageBadge stage={block.stage} />
            {block.alerts > 0 && (
              <StatusBadge status="critical" label={`${block.alerts} alertas`} />
            )}
          </>
        }
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpenEdit(true)}
              data-testid="button-edit-block"
            >
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              data-testid="button-delete-block"
              className="text-status-critical hover:text-status-critical hover:bg-status-critical-soft"
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          </div>
        }
      />

      <EntityQuickActions scopeType="block" scopeId={block.id} />

      {(block.boundary || (block.centroidLat != null && block.centroidLng != null)) && (
        <Card className="overflow-hidden p-0" data-testid="card-block-minimap">
          <SpatialMap
            features={spatial}
            height={240}
            highlightId={block.id}
            anchorLat={block.centroidLat ?? -17.4503}
            anchorLng={block.centroidLng ?? -65.9712}
            initialPaddingM={120}
            showLegend={false}
            showGrid={false}
            interactive
          />
        </Card>
      )}

      {block.centroidLat != null && block.centroidLng != null ? (
        <div className="rounded-xl bg-gradient-to-br from-primary to-primary/85 p-3 shadow-card">
          <WeatherStrip lat={block.centroidLat} lng={block.centroidLng} />
        </div>
      ) : (
        <Card data-testid="card-block-no-weather">
          <CardContent className="p-4 text-xs text-muted-foreground">
            Sin ubicación para pronóstico. Edita el bloque para añadir coordenadas.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Campaña"
          value={campaign ? `${campaign.progress}%` : '—'}
          hint={campaign ? `${campaign.crop} · ${campaign.variety}` : 'Sin campaña activa'}
          tone={campaign ? 'primary' : 'default'}
        />
        <MetricCard
          label="Tareas pendientes"
          value={blockTasks.filter((t) => t.status !== 'done').length}
          icon={ListChecks}
          tone={blockTasks.filter((t) => t.status !== 'done').length > 0 ? 'warn' : 'ok'}
        />
        <MetricCard
          label="Riegos próximos"
          value={blockIrrigation.filter((i) => i.status === 'scheduled').length}
          icon={Droplets}
        />
        <MetricCard
          label="Lotes cosechados"
          value={blockLots.length}
          icon={PackageCheck}
          tone="ok"
        />
      </div>

      <Tabs defaultValue="resumen">
        <TabsList className="w-full justify-start overflow-x-auto md:w-auto">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="tareas">Tareas ({blockTasks.length})</TabsTrigger>
          <TabsTrigger value="riegos">Riegos ({blockIrrigation.length})</TabsTrigger>
          <TabsTrigger value="observaciones">Observaciones ({blockObs.length})</TabsTrigger>
          <TabsTrigger value="cosechas">Cosechas ({blockLots.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Campaña activa</CardTitle>
            </CardHeader>
            <CardContent>
              {campaign ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cultivo</span>
                    <span className="font-medium">
                      {campaign.crop} · {campaign.variety}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inicio</span>
                    <span className="tabular">{campaign.startDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fin estimado</span>
                    <span className="tabular">{campaign.endDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Etapa</span>
                    <StageBadge stage={campaign.stage} />
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${campaign.progress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground tabular">
                    {campaign.progress}% completado
                  </p>
                </div>
              ) : (
                <EmptyState
                  title="Sin campaña activa"
                  description="Inicia una campaña para registrar etapa, riegos y cosechas asociadas."
                  compact
                />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actividad reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline
                items={[
                  ...blockIrrigation.slice(0, 2).map((i) => ({
                    id: i.id,
                    title: `Riego ${i.status === 'done' ? 'realizado' : 'programado'}`,
                    description: `${i.durationMin} min${i.volumeL ? ` · ${i.volumeL}L` : ''}`,
                    meta: new Date(i.scheduledAt).toLocaleString('es-BO'),
                    tone: 'default' as const,
                  })),
                  ...blockObs.slice(0, 2).map((o) => ({
                    id: o.id,
                    title: `${o.author} · observación`,
                    description: o.text,
                    meta: new Date(o.createdAt).toLocaleString('es-BO'),
                    tone: o.type === 'incident' ? ('critical' as const) : ('warn' as const),
                  })),
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tareas" className="mt-4">
          {blockTasks.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Sin tareas asignadas"
              description="Las tareas vinculadas a este bloque aparecerán aquí."
              compact
            />
          ) : (
            <div className="space-y-3">
              {blockTasks.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.assignee} · vence {t.dueDate}
                        </p>
                      </div>
                      <StatusBadge
                        status={
                          t.status === 'done' ? 'ok' : t.status === 'in_progress' ? 'warn' : 'idle'
                        }
                        label={t.status}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="riegos" className="mt-4">
          {blockIrrigation.length === 0 ? (
            <EmptyState
              icon={Droplets}
              title="Sin eventos de riego"
              description="Programa un riego desde el módulo Irrigation para verlo aquí."
              compact
            />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Fecha</th>
                      <th className="px-4 py-2 text-left">Duración</th>
                      <th className="px-4 py-2 text-left">Volumen</th>
                      <th className="px-4 py-2 text-left">Responsable</th>
                      <th className="px-4 py-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockIrrigation.map((i) => (
                      <tr key={i.id} className="border-b last:border-0">
                        <td className="px-4 py-2 tabular">
                          {new Date(i.scheduledAt).toLocaleString('es-BO')}
                        </td>
                        <td className="px-4 py-2 tabular">{i.durationMin} min</td>
                        <td className="px-4 py-2 tabular">{i.volumeL ? `${i.volumeL} L` : '—'}</td>
                        <td className="px-4 py-2">{i.responsible}</td>
                        <td className="px-4 py-2">
                          <StatusBadge
                            status={
                              i.status === 'done'
                                ? 'ok'
                                : i.status === 'pending-sync'
                                  ? 'pending-sync'
                                  : 'idle'
                            }
                            label={i.status}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="observaciones" className="mt-4">
          {blockObs.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="Sin observaciones"
              description="Registra incidencias, plagas o notas del campo desde Observations."
              compact
            />
          ) : (
            <Card>
              <CardContent className="p-6">
                <Timeline
                  items={blockObs.map((o) => ({
                    id: o.id,
                    title: `${o.author} · ${o.type}`,
                    description: o.text,
                    meta: new Date(o.createdAt).toLocaleString('es-BO'),
                    tone:
                      o.type === 'incident' || o.type === 'disease'
                        ? 'critical'
                        : o.type === 'pest'
                          ? 'warn'
                          : 'default',
                  }))}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cosechas" className="mt-4">
          {blockLots.length === 0 ? (
            <EmptyState
              icon={PackageCheck}
              title="Sin lotes cosechados"
              description="Los lotes registrados en Harvest se mostrarán aquí."
              compact
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {blockLots.map((l) => (
                <Card key={l.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between">
                      <p className="font-medium">{l.code}</p>
                      <StatusBadge status={l.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {l.crop} · {l.variety}
                    </p>
                    <p className="mt-2 text-sm tabular">
                      {l.quantity} {l.unit} · {l.date}
                    </p>
                    {l.destination && (
                      <p className="text-xs text-muted-foreground">→ {l.destination}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <QuickCaptureDrawer
        open={openEdit}
        onOpenChange={setOpenEdit}
        trigger={<span />}
        title={`Editar · ${block.name}`}
      >
        <BlockForm block={block} onDone={() => setOpenEdit(false)} />
      </QuickCaptureDrawer>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Eliminar bloque?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar bloque"
        onConfirm={async () => {
          try {
            await queueDeleteBlock(block.id);
            toast.success('Bloque eliminado');
            navigate('/blocks');
          } catch (err) {
            toast.error('No se pudo eliminar', { description: (err as Error).message });
          }
        }}
        testId="delete-block"
      />
    </div>
  );
}
