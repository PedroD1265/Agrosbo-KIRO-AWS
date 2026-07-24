import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { RowActionsMenu } from '@/shared/ui/RowActionsMenu';
import { DetailSidePanel } from '@/shared/ui/DetailSidePanel';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { QuickCaptureDrawer } from '@/shared/ui/QuickCaptureDrawer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/shared/ui/FilterBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Plus, NotebookPen, Bug, ShieldAlert, AlertTriangle, ListChecks } from 'lucide-react';
import { QuickTaskForm, type QuickTaskInitial } from '@/features/tasks/TaskForms';
import { MetricCard } from '@/shared/ui/MetricCard';
import { SegmentedChips } from '@/shared/ui/SegmentedChips';
import { MobileActionBar } from '@/shared/ui/MobileActionBar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBlocks, useGreenhouses, useObservations } from '@/hooks/data';
import { queueCreateObservation, queueDeleteObservation } from '@/hooks/data/mutations';
import { observationTypeSchema, type ObservationType, type ScopeType } from '@shared/schema';
import { AttachmentUploader } from '@/components/AttachmentUploader';

const formSchema = z.object({
  scopeRef: z.string().min(1, 'Selecciona destino'),
  type: observationTypeSchema,
  author: z.string().min(1, 'Requerido'),
  text: z.string().min(3, 'Describe lo observado'),
});
type FormValues = z.infer<typeof formSchema>;

function QuickObsForm({ onDone }: { onDone: () => void }) {
  const { data: blocks = [] } = useBlocks();
  const { data: greenhouses = [] } = useGreenhouses();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { scopeRef: '', type: 'note', author: '', text: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    const [scopeType, scopeId] = values.scopeRef.split(':') as [ScopeType, string];
    try {
      await queueCreateObservation({
        scopeType,
        scopeId,
        type: values.type,
        author: values.author,
        text: values.text,
      });
      toast.success('Observación guardada', {
        description: navigator.onLine ? 'Sincronizando…' : 'Encolada hasta recuperar conexión.',
      });
      form.reset();
      onDone();
    } catch (err) {
      toast.error('No se pudo guardar', { description: (err as Error).message });
    }
  });

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormField
          control={form.control}
          name="scopeRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bloque/Invernadero</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger data-testid="select-obs-scope">
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {blocks.map((b) => (
                    <SelectItem key={b.id} value={`block:${b.id}`}>
                      {b.name}
                    </SelectItem>
                  ))}
                  {greenhouses.map((g) => (
                    <SelectItem key={g.id} value={`greenhouse:${g.id}`}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger data-testid="select-obs-type">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="note">Nota</SelectItem>
                  <SelectItem value="incident">Incidencia</SelectItem>
                  <SelectItem value="pest">Plaga</SelectItem>
                  <SelectItem value="disease">Enfermedad</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="author"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Autor</FormLabel>
              <FormControl>
                <Input placeholder="Tu nombre" {...field} data-testid="input-obs-author" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Qué observaste…"
                  {...field}
                  data-testid="input-obs-text"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" data-testid="button-submit-obs">
          Guardar observación
        </Button>
      </form>
    </Form>
  );
}

const TYPE_LABEL: Record<ObservationType, string> = {
  note: 'Nota',
  incident: 'Incidencia',
  pest: 'Plaga',
  disease: 'Enfermedad',
  general: 'General',
};

function typeTone(t: ObservationType): 'ok' | 'warn' | 'critical' | 'idle' {
  if (t === 'incident' || t === 'disease') return 'critical';
  if (t === 'pest') return 'warn';
  return 'idle';
}

export default function ObservationsPage() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<ObservationType | 'all'>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [taskInitial, setTaskInitial] = useState<QuickTaskInitial | null>(null);
  const isMobile = useIsMobile();
  const { data: observations = [] } = useObservations();
  const { data: blocks = [] } = useBlocks();
  const { data: greenhouses = [] } = useGreenhouses();
  const selectedObs = useMemo(
    () => observations.find((o) => o.id === selectedId) ?? null,
    [observations, selectedId],
  );

  const scopeOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: 'all', label: 'Todos los destinos' },
    ];
    blocks.forEach((b) => opts.push({ value: `block:${b.id}`, label: `B · ${b.name}` }));
    greenhouses.forEach((g) => opts.push({ value: `greenhouse:${g.id}`, label: `I · ${g.name}` }));
    return opts;
  }, [blocks, greenhouses]);

  const counts = useMemo(
    () => ({
      all: observations.length,
      note: observations.filter((o) => o.type === 'note').length,
      incident: observations.filter((o) => o.type === 'incident').length,
      pest: observations.filter((o) => o.type === 'pest').length,
      disease: observations.filter((o) => o.type === 'disease').length,
    }),
    [observations],
  );

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return observations.filter((o) => {
      const matchesType = filter === 'all' || o.type === filter;
      const matchesScope = scopeFilter === 'all' || `${o.scopeType}:${o.scopeId}` === scopeFilter;
      const matchesQ = !q || [o.text, o.author, o.scopeName].join(' ').toLowerCase().includes(ql);
      return matchesType && matchesScope && matchesQ;
    });
  }, [observations, filter, scopeFilter, q]);

  // Group by day for scannability — pure presentation, no data mutation.
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const o of filtered) {
      const day = new Date(o.createdAt).toDateString();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(o);
    }
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    return Array.from(map.entries()).map(([day, items]) => ({
      day,
      label:
        day === today
          ? 'Hoy'
          : day === yesterday
            ? 'Ayer'
            : new Date(day).toLocaleDateString('es-BO', {
                weekday: 'long',
                day: '2-digit',
                month: 'short',
              }),
      items,
    }));
  }, [filtered]);

  const buildTaskInitial = (o: (typeof observations)[number]): QuickTaskInitial => {
    const isCritical = o.type === 'incident' || o.type === 'disease';
    const isPest = o.type === 'pest';
    const prefix =
      o.type === 'pest'
        ? 'Atender plaga'
        : o.type === 'disease'
          ? 'Atender enfermedad'
          : o.type === 'incident'
            ? 'Resolver incidencia'
            : 'Seguimiento';
    const snippet = o.text.trim().split(/\s+/).slice(0, 8).join(' ');
    const title = `${prefix}: ${snippet}`.slice(0, 120);
    return {
      title,
      scopeRef: `${o.scopeType}:${o.scopeId}`,
      priority: isCritical ? 'high' : isPest ? 'high' : 'med',
      notes: `Origen: observación de ${o.author} (${TYPE_LABEL[o.type]})\n${o.text}`,
      sourceObservationId: o.id,
    };
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await queueDeleteObservation(deleteId);
      toast.success('Observación eliminada');
    } catch (err) {
      toast.error('No se pudo eliminar', { description: (err as Error).message });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className={`space-y-5 animate-fade-in ${isMobile ? 'pb-24' : ''}`}>
      <PageHeader
        eyebrow="Operación · Bitácora"
        title="Observaciones"
        subtitle="Bitácora de campo · notas e incidencias"
        actions={
          !isMobile && (
            <QuickCaptureDrawer
              open={open}
              onOpenChange={setOpen}
              trigger={
                <Button size="sm" data-testid="button-new-obs">
                  <Plus className="h-4 w-4" /> Nueva observación
                </Button>
              }
              title="Nueva observación"
              description="Captura rápida desde campo"
            >
              <QuickObsForm onDone={() => setOpen(false)} />
            </QuickCaptureDrawer>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Total" value={counts.all} icon={NotebookPen} tone="primary" />
        <MetricCard
          label="Incidencias"
          value={counts.incident}
          icon={AlertTriangle}
          tone={counts.incident > 0 ? 'critical' : 'default'}
        />
        <MetricCard
          label="Plagas"
          value={counts.pest}
          icon={Bug}
          tone={counts.pest > 0 ? 'warn' : 'default'}
        />
        <MetricCard
          label="Enfermedades"
          value={counts.disease}
          icon={ShieldAlert}
          tone={counts.disease > 0 ? 'critical' : 'default'}
        />
      </div>

      {isMobile ? (
        <SegmentedChips
          value={filter}
          onChange={(v) => setFilter(v as any)}
          ariaLabel="Filtro de observaciones"
          options={[
            { value: 'all' as const, label: 'Todas', count: counts.all },
            {
              value: 'incident' as const,
              label: 'Incidencias',
              count: counts.incident,
              tone: 'critical',
            },
            { value: 'pest' as const, label: 'Plagas', count: counts.pest, tone: 'warn' },
            {
              value: 'disease' as const,
              label: 'Enfermedades',
              count: counts.disease,
              tone: 'critical',
            },
            { value: 'note' as const, label: 'Notas', count: counts.note },
          ]}
        />
      ) : (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as ObservationType | 'all')}>
          <TabsList className="w-full justify-start overflow-x-auto md:w-auto">
            <TabsTrigger value="all">Todas ({counts.all})</TabsTrigger>
            <TabsTrigger value="note">Notas ({counts.note})</TabsTrigger>
            <TabsTrigger value="incident">Incidencias ({counts.incident})</TabsTrigger>
            <TabsTrigger value="pest">Plagas ({counts.pest})</TabsTrigger>
            <TabsTrigger value="disease">Enfermedades ({counts.disease})</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <FilterBar
        value={q}
        onValueChange={setQ}
        placeholder="Buscar por texto, autor o destino…"
        resultCount={filtered.length}
        right={
          !isMobile && (
            <div className="flex items-center gap-2">
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger className="h-9 w-44" data-testid="select-obs-scope-filter">
                  <SelectValue placeholder="Destino" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {scopeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(scopeFilter !== 'all' || filter !== 'all' || q) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-xs text-muted-foreground"
                  onClick={() => {
                    setScopeFilter('all');
                    setFilter('all');
                    setQ('');
                  }}
                  data-testid="button-obs-clear-filters"
                >
                  Limpiar
                </Button>
              )}
            </div>
          )
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title={
            observations.length === 0
              ? 'Sin observaciones todavía'
              : 'Sin resultados con este filtro'
          }
          description={
            observations.length === 0
              ? 'Registra notas, plagas, enfermedades o incidencias desde campo.'
              : 'Prueba cambiando el tipo o la búsqueda.'
          }
        />
      ) : (
        <div
          className={
            !isMobile && selectedObs ? 'grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]' : ''
          }
        >
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.day} className="space-y-2">
                <div className="sticky top-0 z-10 -mx-1 flex items-center gap-3 bg-background/95 px-1 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-background/70">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-[10px] tabular text-muted-foreground">
                    {group.items.length}
                  </span>
                </div>
                {group.items.map((o) => {
                  const isSelected = selectedId === o.id;
                  return (
                    <Card
                      key={o.id}
                      data-testid={`card-obs-${o.id}`}
                      onClick={() => !isMobile && setSelectedId(o.id)}
                      aria-selected={isSelected}
                      className={`transition-colors ${!isMobile ? 'cursor-pointer' : ''} hover:bg-muted/20 aria-selected:bg-primary/5 aria-selected:ring-1 aria-selected:ring-primary/30 ${typeTone(o.type) === 'critical' ? 'border-l-2 border-l-status-critical' : typeTone(o.type) === 'warn' ? 'border-l-2 border-l-status-warn' : ''}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">{o.scopeName}</p>
                              <StatusBadge status={typeTone(o.type)} label={TYPE_LABEL[o.type]} />
                              {o.pendingSync && <StatusBadge status="pending-sync" />}
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm">{o.text}</p>
                            <p className="mt-1.5 text-xs text-muted-foreground tabular">
                              {o.author} ·{' '}
                              {new Date(o.createdAt).toLocaleTimeString('es-BO', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <RowActionsMenu
                              testId={`obs-${o.id}`}
                              onDelete={() => setDeleteId(o.id)}
                              extraItems={[
                                {
                                  key: 'create-task',
                                  label: 'Crear tarea',
                                  icon: ListChecks,
                                  onSelect: () => setTaskInitial(buildTaskInitial(o)),
                                },
                              ]}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ))}
          </div>
          {!isMobile && selectedObs && (
            <DetailSidePanel
              title={selectedObs.scopeName}
              subtitle={`${TYPE_LABEL[selectedObs.type]} · ${selectedObs.author}`}
              headerExtra={
                <StatusBadge
                  status={typeTone(selectedObs.type)}
                  label={TYPE_LABEL[selectedObs.type]}
                />
              }
              onClose={() => setSelectedId(null)}
              footer={
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setTaskInitial(buildTaskInitial(selectedObs))}
                    data-testid="button-obs-create-task-panel"
                  >
                    <ListChecks className="h-4 w-4" /> Crear tarea
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-status-critical hover:bg-status-critical-soft hover:text-status-critical"
                    onClick={() => setDeleteId(selectedObs.id)}
                    data-testid="button-obs-delete-panel"
                  >
                    Eliminar observación
                  </Button>
                </div>
              }
            >
              <dl className="space-y-3 text-[13px]">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Registrada
                  </dt>
                  <dd className="tabular">
                    {new Date(selectedObs.createdAt).toLocaleString('es-BO')}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Descripción
                  </dt>
                  <dd className="whitespace-pre-wrap leading-relaxed">{selectedObs.text}</dd>
                </div>
                {selectedObs.pendingSync && (
                  <div className="rounded-md border border-status-pending-sync/30 bg-status-pending-sync-soft/40 px-2.5 py-1.5 text-[12px] text-status-pending-sync">
                    Pendiente de sincronizar
                  </div>
                )}
              </dl>
              {!selectedObs.pendingSync &&
                !selectedObs.id.startsWith('ob-') &&
                selectedObs.id.length > 8 && (
                  <div className="mt-4 border-t pt-4">
                    <AttachmentUploader entityType="observation" entityId={selectedObs.id} />
                  </div>
                )}
            </DetailSidePanel>
          )}
        </div>
      )}

      <QuickCaptureDrawer
        open={taskInitial !== null}
        onOpenChange={(o) => !o && setTaskInitial(null)}
        trigger={<span />}
        title="Crear tarea desde observación"
        description="Datos prellenados desde la observación. Ajusta lo necesario."
      >
        {taskInitial && <QuickTaskForm initial={taskInitial} onDone={() => setTaskInitial(null)} />}
      </QuickCaptureDrawer>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="¿Eliminar observación?"
        description="Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        testId="delete-obs"
      />

      {isMobile && (
        <>
          <MobileActionBar
            hint={
              counts.incident + counts.disease > 0 ? 'Hay incidencias críticas activas' : undefined
            }
          >
            <Button
              size="lg"
              className="h-12 flex-1 text-[15px] font-semibold"
              onClick={() => setOpen(true)}
              data-testid="button-new-obs-mobile"
            >
              <Plus className="h-5 w-5" /> Nueva observación
            </Button>
          </MobileActionBar>
          <QuickCaptureDrawer
            open={open}
            onOpenChange={setOpen}
            trigger={<span />}
            title="Nueva observación"
            description="Captura rápida desde campo"
          >
            <QuickObsForm onDone={() => setOpen(false)} />
          </QuickCaptureDrawer>
        </>
      )}
    </div>
  );
}
