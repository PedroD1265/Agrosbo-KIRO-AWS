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
import { AlertBanner } from '@/shared/ui/AlertBanner';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { QuickCaptureDrawer } from '@/shared/ui/QuickCaptureDrawer';
import { GreenhouseForm } from '@/shared/forms/GreenhouseForm';
import { queueDeleteGreenhouse } from '@/hooks/data/mutations';
import { EntityQuickActions } from '@/shared/ui/EntityQuickActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Droplets,
  NotebookPen,
  Thermometer,
  Droplet,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  useGreenhouse,
  useIrrigationEvents,
  useObservations,
  useSpatialFeatures,
  useTasks,
} from '@/hooks/data';
import { SpatialMap } from '@/components/map/SpatialMap';

export default function GreenhouseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [openEdit, setOpenEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: g, isLoading } = useGreenhouse(id);
  const { data: observations = [] } = useObservations();
  const { data: tasks = [] } = useTasks();
  const { data: irrigation = [] } = useIrrigationEvents();
  const { data: spatial } = useSpatialFeatures();

  if (isLoading) return <DetailSkeleton />;
  if (!g)
    return (
      <EmptyState
        title="Invernadero no encontrado"
        description="Verifica el identificador en la URL o regresa al listado."
        action={
          <Button asChild size="sm">
            <Link to="/greenhouses">
              <ArrowLeft className="h-4 w-4" /> Volver a Invernaderos
            </Link>
          </Button>
        }
      />
    );

  const obs = observations.filter((o) => o.scopeType === 'greenhouse' && o.scopeId === g.id);
  const ts = tasks.filter((t) => t.scopeType === 'greenhouse' && t.scopeId === g.id);
  const irr = irrigation.filter((i) => i.scopeType === 'greenhouse' && i.scopeId === g.id);

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/greenhouses">
          <ArrowLeft className="h-4 w-4" /> Invernaderos
        </Link>
      </Button>
      <PageHeader
        title={g.name}
        subtitle={`Entorno protegido · ${g.areaM2} m² · ${g.crop}${g.variety ? ' · ' + g.variety : ''}`}
        meta={
          <>
            <StatusBadge status={g.status} />
            <StageBadge stage={g.stage} />
          </>
        }
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpenEdit(true)}
              data-testid="button-edit-gh"
            >
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              data-testid="button-delete-gh"
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          </div>
        }
      />

      <EntityQuickActions scopeType="greenhouse" scopeId={g.id} />

      <AlertBanner
        level="info"
        title="Sensores no conectados"
        description="Las condiciones internas son ingresadas manualmente. Conectar sensores desde Integraciones."
      />

      {(g.footprint || (g.lat != null && g.lng != null)) && (
        <Card className="overflow-hidden p-0" data-testid="card-greenhouse-minimap">
          <SpatialMap
            features={spatial}
            height={220}
            highlightId={g.id}
            anchorLat={g.lat ?? -17.4503}
            anchorLng={g.lng ?? -65.9712}
            initialPaddingM={80}
            showLegend={false}
            showGrid={false}
            interactive
          />
        </Card>
      )}

      {g.lat != null && g.lng != null ? (
        <div className="rounded-xl bg-gradient-to-br from-primary to-primary/85 p-3 shadow-card">
          <WeatherStrip lat={g.lat} lng={g.lng} />
        </div>
      ) : (
        <Card data-testid="card-greenhouse-no-weather">
          <CardContent className="p-4 text-xs text-muted-foreground">
            Sin ubicación para pronóstico. Edita el invernadero para añadir coordenadas.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Temperatura" value={`${g.tempC ?? '—'}°C`} icon={Thermometer} />
        <MetricCard label="Humedad" value={`${g.humidity ?? '—'}%`} icon={Droplet} />
        <MetricCard
          label="Tareas pendientes"
          value={ts.filter((t) => t.status !== 'done').length}
        />
        <MetricCard label="Alertas" value={g.alerts} tone={g.alerts > 0 ? 'warn' : 'default'} />
      </div>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="condiciones">Condiciones</TabsTrigger>
          <TabsTrigger value="riegos">Riegos</TabsTrigger>
          <TabsTrigger value="observaciones">Observaciones</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actividad reciente</CardTitle>
            </CardHeader>
            <CardContent>
              {obs.length === 0 ? (
                <EmptyState
                  title="Sin actividad reciente"
                  description="Las observaciones del invernadero se mostrarán aquí."
                  compact
                />
              ) : (
                <Timeline
                  items={obs.map((o) => ({
                    id: o.id,
                    title: `${o.author} · ${o.type}`,
                    description: o.text,
                    meta: new Date(o.createdAt).toLocaleString('es-BO'),
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="condiciones" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <EmptyState
                icon={Thermometer}
                title="Sin histórico de condiciones"
                description="Disponible al conectar sensores o ingresar lecturas manuales periódicas."
                compact
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="riegos" className="mt-4">
          {irr.length === 0 ? (
            <EmptyState
              icon={Droplets}
              title="Sin eventos de riego"
              description="Programa un riego desde el módulo Irrigation para verlo aquí."
              compact
            />
          ) : (
            <Card>
              <CardContent className="p-4 space-y-2">
                {irr.map((i) => (
                  <div
                    key={i.id}
                    className="flex justify-between border-b last:border-0 py-2 text-sm"
                  >
                    <span>{new Date(i.scheduledAt).toLocaleString('es-BO')}</span>
                    <span className="tabular">{i.durationMin} min</span>
                    <StatusBadge status={i.status === 'done' ? 'ok' : 'idle'} label={i.status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="observaciones" className="mt-4">
          {obs.length === 0 ? (
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
                  items={obs.map((o) => ({
                    id: o.id,
                    title: `${o.author} · ${o.type}`,
                    description: o.text,
                    meta: new Date(o.createdAt).toLocaleString('es-BO'),
                  }))}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <QuickCaptureDrawer
        open={openEdit}
        onOpenChange={setOpenEdit}
        trigger={<span />}
        title={`Editar · ${g.name}`}
      >
        <GreenhouseForm greenhouse={g} onDone={() => setOpenEdit(false)} />
      </QuickCaptureDrawer>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Eliminar invernadero?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar invernadero"
        onConfirm={async () => {
          try {
            await queueDeleteGreenhouse(g.id);
            toast.success('Invernadero eliminado');
            navigate('/greenhouses');
          } catch (err) {
            toast.error('No se pudo eliminar', { description: (err as Error).message });
          }
        }}
        testId="delete-gh"
      />
    </div>
  );
}
