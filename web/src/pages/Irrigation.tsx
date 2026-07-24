import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PageHeader } from '@/shared/ui/PageHeader';
import { WeatherStrip } from '@/features/today/WeatherStrip';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { QuickCaptureDrawer } from '@/shared/ui/QuickCaptureDrawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Droplets,
  Plus,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Check,
  Clock,
} from 'lucide-react';
import { MetricCard } from '@/shared/ui/MetricCard';
import { FilterBar } from '@/shared/ui/FilterBar';
import { MobileFieldRow } from '@/shared/ui/MobileFieldRow';
import { MobileActionBar } from '@/shared/ui/MobileActionBar';
import { DetailSidePanel } from '@/shared/ui/DetailSidePanel';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBlocks, useGreenhouses, useIrrigationEvents } from '@/hooks/data';
import {
  queueCreateIrrigation,
  queueMarkIrrigationDone,
  queueUpdateIrrigation,
  queueDeleteIrrigation,
} from '@/hooks/data/mutations';
import { RowActionsMenu } from '@/shared/ui/RowActionsMenu';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { irrigationStatusSchema, type IrrigationEvent, type ScopeType } from '@shared/schema';

const formSchema = z.object({
  scopeRef: z.string().min(1, 'Selecciona destino'),
  scheduledAt: z.string().min(1, 'Requerido'),
  durationMin: z.coerce.number().int().positive('Mayor a 0'),
  volumeL: z.coerce
    .number()
    .positive()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  responsible: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function QuickIrrigationForm({ onDone }: { onDone: () => void }) {
  const { data: blocks = [] } = useBlocks();
  const { data: greenhouses = [] } = useGreenhouses();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scopeRef: '',
      scheduledAt: new Date().toISOString().slice(0, 16),
      durationMin: 30,
      volumeL: undefined,
      responsible: '',
      notes: '',
    },
  });

  const submit = form.handleSubmit(async (values) => {
    const [scopeType, scopeId] = values.scopeRef.split(':') as [ScopeType, string];
    try {
      await queueCreateIrrigation({
        scopeType,
        scopeId,
        scheduledAt: new Date(values.scheduledAt).toISOString(),
        durationMin: values.durationMin,
        volumeL: typeof values.volumeL === 'number' ? values.volumeL : undefined,
        responsible: values.responsible || undefined,
        notes: values.notes || undefined,
      });
      toast.success('Riego registrado', {
        description: navigator.onLine ? 'Sincronizando…' : 'Pendiente en cola local.',
      });
      form.reset();
      onDone();
    } catch (err) {
      toast.error('Error al registrar', { description: (err as Error).message });
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
              <FormLabel>Bloque o invernadero</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger data-testid="select-irr-scope">
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
          name="scheduledAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha y hora</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} data-testid="input-irr-when" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="durationMin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración (min)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="30"
                    {...field}
                    data-testid="input-irr-duration"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="volumeL"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Volumen (L)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="1500"
                    {...field}
                    value={field.value ?? ''}
                    data-testid="input-irr-volume"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="responsible"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsable</FormLabel>
              <FormControl>
                <Input placeholder="Nombre" {...field} data-testid="input-irr-responsible" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Observaciones del riego…"
                  rows={3}
                  {...field}
                  data-testid="input-irr-notes"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" data-testid="button-submit-irr">
          Guardar (offline-friendly)
        </Button>
        <p className="text-xs text-muted-foreground">
          El registro se sincroniza al recuperar conexión.
        </p>
      </form>
    </Form>
  );
}

const editSchema = z.object({
  scheduledAt: z.string().min(1, 'Requerido'),
  durationMin: z.coerce.number().int().positive(),
  volumeL: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
  responsible: z.string().optional(),
  status: irrigationStatusSchema,
  notes: z.string().optional(),
});
type EditValues = z.infer<typeof editSchema>;

function toLocalDT(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditIrrigationForm({ ev, onDone }: { ev: IrrigationEvent; onDone: () => void }) {
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      scheduledAt: toLocalDT(ev.scheduledAt),
      durationMin: ev.durationMin,
      volumeL: ev.volumeL ?? '',
      responsible: ev.responsible ?? '',
      status: ev.status,
      notes: ev.notes ?? '',
    },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await queueUpdateIrrigation(ev.id, {
        scheduledAt: new Date(values.scheduledAt).toISOString(),
        durationMin: values.durationMin,
        volumeL: typeof values.volumeL === 'number' ? values.volumeL : undefined,
        responsible: values.responsible || undefined,
        status: values.status,
        notes: values.notes || undefined,
      });
      toast.success('Riego actualizado');
      onDone();
    } catch (err) {
      toast.error('No se pudo actualizar', { description: (err as Error).message });
    }
  });
  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormField
          control={form.control}
          name="scheduledAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha y hora</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} data-testid="input-irr-edit-when" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="durationMin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración (min)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} data-testid="input-irr-edit-duration" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="volumeL"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Volumen (L)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value ?? ''}
                    data-testid="input-irr-edit-volume"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="responsible"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsable</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-irr-edit-responsible" />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger data-testid="select-irr-edit-status">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="scheduled">Programado</SelectItem>
                    <SelectItem value="done">Realizado</SelectItem>
                    <SelectItem value="skipped">Omitido</SelectItem>
                    <SelectItem value="pending-sync">Pend. sync</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} data-testid="input-irr-edit-notes" />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" data-testid="button-submit-irr-edit">
          Guardar cambios
        </Button>
      </form>
    </Form>
  );
}

export default function IrrigationPage() {
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editEv, setEditEv] = useState<IrrigationEvent | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const isMobile = useIsMobile();
  const { data: irrigation = [] } = useIrrigationEvents();
  const { data: blocks = [] } = useBlocks();
  const { data: greenhouses = [] } = useGreenhouses();
  const selectedEv = useMemo(
    () => irrigation.find((i) => i.id === selectedId) ?? null,
    [irrigation, selectedId],
  );

  const scopeOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: 'all', label: 'Todos los destinos' },
    ];
    blocks.forEach((b) => opts.push({ value: `block:${b.id}`, label: `B · ${b.name}` }));
    greenhouses.forEach((g) => opts.push({ value: `greenhouse:${g.id}`, label: `I · ${g.name}` }));
    return opts;
  }, [blocks, greenhouses]);

  const upcoming = useMemo(
    () =>
      irrigation
        .filter((i) => i.status === 'scheduled')
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [irrigation],
  );
  const done = useMemo(
    () =>
      irrigation
        .filter((i) => i.status === 'done' || i.status === 'pending-sync')
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
    [irrigation],
  );
  const pendingSync = irrigation.filter((i) => i.status === 'pending-sync').length;
  const todayStr = new Date().toDateString();
  const todayCount = irrigation.filter(
    (i) => new Date(i.scheduledAt).toDateString() === todayStr,
  ).length;

  const matchesQ = (i: IrrigationEvent) => {
    const matchesScope = scopeFilter === 'all' || `${i.scopeType}:${i.scopeId}` === scopeFilter;
    if (!matchesScope) return false;
    if (!q) return true;
    const ql = q.toLowerCase();
    return [i.scopeName, i.responsible ?? '', i.notes ?? ''].join(' ').toLowerCase().includes(ql);
  };

  const upcomingBuckets = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);
    const dayAfter = new Date(today.getTime() + 86400000 * 2);
    const buckets: { label: string; tone?: 'critical' | 'warn'; items: IrrigationEvent[] }[] = [
      { label: 'Atrasados', tone: 'critical', items: [] },
      { label: 'Hoy', tone: 'warn', items: [] },
      { label: 'Mañana', items: [] },
      { label: 'Próximos días', items: [] },
    ];
    for (const i of upcoming.filter(matchesQ)) {
      const d = new Date(i.scheduledAt);
      if (d < today) buckets[0].items.push(i);
      else if (d < tomorrow) buckets[1].items.push(i);
      else if (d < dayAfter) buckets[2].items.push(i);
      else buckets[3].items.push(i);
    }
    return buckets.filter((b) => b.items.length > 0);
  }, [upcoming, q]);

  const filteredDone = done.filter(matchesQ);

  const farmCoords = useMemo(() => {
    const b = blocks.find((x) => x.centroidLat != null && x.centroidLng != null);
    if (b) return { lat: b.centroidLat as number, lng: b.centroidLng as number };
    const g = greenhouses.find((x) => x.lat != null && x.lng != null);
    if (g) return { lat: g.lat as number, lng: g.lng as number };
    return null;
  }, [blocks, greenhouses]);

  return (
    <div className={`space-y-5 animate-fade-in ${isMobile ? 'pb-24' : ''}`}>
      <PageHeader
        eyebrow="Operación · Riego"
        title="Riego"
        subtitle="Programación y registro de eventos de riego"
        actions={
          !isMobile && (
            <QuickCaptureDrawer
              open={open}
              onOpenChange={setOpen}
              trigger={
                <Button size="sm" data-testid="button-new-irr">
                  <Plus className="h-4 w-4" /> Registrar riego
                </Button>
              }
              title="Registrar riego"
              description="Captura rápida desde campo"
            >
              <QuickIrrigationForm onDone={() => setOpen(false)} />
            </QuickCaptureDrawer>
          )
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Programados"
          value={upcoming.length}
          icon={CalendarClock}
          tone={upcoming.length > 0 ? 'primary' : 'default'}
        />
        <MetricCard
          label="Hoy"
          value={todayCount}
          icon={Droplets}
          tone={todayCount > 0 ? 'warn' : 'default'}
        />
        <MetricCard label="Realizados" value={done.length} icon={CheckCircle2} tone="ok" />
        <MetricCard
          label="Pendientes sync"
          value={pendingSync}
          icon={AlertTriangle}
          tone={pendingSync > 0 ? 'warn' : 'default'}
          hint={pendingSync === 0 ? 'Todo sincronizado' : 'Se enviarán al recuperar conexión'}
        />
      </div>

      {farmCoords ? (
        <div
          className="rounded-xl bg-gradient-to-br from-primary to-primary/85 p-3 shadow-card"
          data-testid="irrigation-weather"
        >
          <WeatherStrip lat={farmCoords.lat} lng={farmCoords.lng} />
        </div>
      ) : (
        <Card data-testid="irrigation-no-weather">
          <CardContent className="p-4 text-xs text-muted-foreground">
            Sin coordenadas configuradas en bloques o invernaderos. Añade ubicación para ver el
            pronóstico antes de programar riegos.
          </CardContent>
        </Card>
      )}

      <FilterBar
        value={q}
        onValueChange={setQ}
        placeholder={
          isMobile ? 'Buscar destino, responsable…' : 'Buscar por destino, responsable o nota…'
        }
        resultCount={upcomingBuckets.reduce((s, b) => s + b.items.length, 0) + filteredDone.length}
        right={
          !isMobile && (
            <div className="flex items-center gap-2">
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger className="h-9 w-44" data-testid="select-irr-scope-filter">
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
              {(scopeFilter !== 'all' || q) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-xs text-muted-foreground"
                  onClick={() => {
                    setScopeFilter('all');
                    setQ('');
                  }}
                  data-testid="button-irr-clear-filters"
                >
                  Limpiar
                </Button>
              )}
            </div>
          )
        }
      />

      <div
        className={
          isMobile
            ? 'space-y-5'
            : selectedEv
              ? 'grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]'
              : 'grid gap-5 lg:grid-cols-2'
        }
      >
        {!isMobile && selectedEv ? (
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Droplets className="h-4 w-4" /> Próximos{' '}
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular text-muted-foreground">
                    {upcomingBuckets.reduce((s, b) => s + b.items.length, 0)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingBuckets.length === 0 && (
                  <p className="text-sm text-muted-foreground py-3">Sin riegos programados.</p>
                )}
                {upcomingBuckets.map((bucket) => (
                  <div key={bucket.label} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-wider ${bucket.tone === 'critical' ? 'text-status-critical' : bucket.tone === 'warn' ? 'text-status-warn' : 'text-muted-foreground'}`}
                      >
                        {bucket.label}
                      </p>
                      <div className="h-px flex-1 bg-border/60" />
                      <span
                        className={`text-[10px] tabular ${bucket.tone === 'critical' ? 'font-semibold text-status-critical' : 'text-muted-foreground'}`}
                      >
                        {bucket.items.length}
                      </span>
                    </div>
                    {bucket.items.map((i) => {
                      const isToday = bucket.label === 'Hoy';
                      const isLate = bucket.label === 'Atrasados';
                      const time = new Date(i.scheduledAt).toLocaleTimeString('es-BO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const dateStr = isLate
                        ? new Date(i.scheduledAt).toLocaleDateString('es-BO', {
                            day: '2-digit',
                            month: 'short',
                          })
                        : null;
                      const meta = `${dateStr ? `${dateStr} · ` : ''}${time} · ${i.durationMin} min${i.responsible ? ` · ${i.responsible}` : ''}`;
                      return (
                        <button
                          type="button"
                          key={i.id}
                          onClick={() => setSelectedId(i.id)}
                          aria-selected={selectedId === i.id}
                          className={`w-full text-left flex items-center justify-between rounded-md border px-3 py-2.5 transition-colors hover:bg-muted/30 aria-selected:bg-primary/5 aria-selected:ring-1 aria-selected:ring-primary/30 ${isLate ? 'border-status-critical/40 bg-status-critical-soft/30' : isToday ? 'border-status-warn/40 bg-status-warn-soft/30' : 'border-border/60'}`}
                          data-testid={`row-irr-upcoming-${i.id}`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{i.scopeName}</p>
                            <p
                              className={`text-xs tabular ${isLate ? 'text-status-critical font-medium' : 'text-muted-foreground'}`}
                            >
                              {meta}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isLate ? 'bg-status-critical/15 text-status-critical' : isToday ? 'bg-status-warn/15 text-status-warn' : 'bg-muted text-muted-foreground'}`}
                          >
                            {time}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Historial reciente{' '}
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular text-muted-foreground">
                    {filteredDone.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredDone.length === 0 && (
                  <p className="text-sm text-muted-foreground py-3">Sin historial.</p>
                )}
                {filteredDone.slice(0, 12).map((i) => {
                  const meta = `${new Date(i.scheduledAt).toLocaleString('es-BO')} · ${i.durationMin} min`;
                  return (
                    <button
                      type="button"
                      key={i.id}
                      onClick={() => setSelectedId(i.id)}
                      aria-selected={selectedId === i.id}
                      className="w-full text-left flex items-center justify-between rounded-md border border-border/60 px-3 py-2 transition-colors hover:bg-muted/30 aria-selected:bg-primary/5 aria-selected:ring-1 aria-selected:ring-primary/30"
                      data-testid={`row-irr-${i.id}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{i.scopeName}</p>
                        <p className="text-xs text-muted-foreground tabular truncate">{meta}</p>
                      </div>
                      <StatusBadge status={i.status === 'pending-sync' ? 'pending-sync' : 'ok'} />
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Droplets className="h-4 w-4" /> Próximos{' '}
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular text-muted-foreground">
                    {upcomingBuckets.reduce((s, b) => s + b.items.length, 0)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingBuckets.length === 0 && (
                  <p className="text-sm text-muted-foreground py-3">Sin riegos programados.</p>
                )}
                {upcomingBuckets.map((bucket) => (
                  <div key={bucket.label} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-wider ${bucket.tone === 'critical' ? 'text-status-critical' : bucket.tone === 'warn' ? 'text-status-warn' : 'text-muted-foreground'}`}
                      >
                        {bucket.label}
                      </p>
                      <div className="h-px flex-1 bg-border/60" />
                      <span
                        className={`text-[10px] tabular ${bucket.tone === 'critical' ? 'font-semibold text-status-critical' : 'text-muted-foreground'}`}
                      >
                        {bucket.items.length}
                      </span>
                    </div>
                    {bucket.items.map((i) => {
                      const isToday = bucket.label === 'Hoy';
                      const isLate = bucket.label === 'Atrasados';
                      const time = new Date(i.scheduledAt).toLocaleTimeString('es-BO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const dateStr = isLate
                        ? new Date(i.scheduledAt).toLocaleDateString('es-BO', {
                            day: '2-digit',
                            month: 'short',
                          })
                        : null;
                      const meta = `${dateStr ? `${dateStr} · ` : ''}${time} · ${i.durationMin} min${i.responsible ? ` · ${i.responsible}` : ''}`;
                      if (isMobile) {
                        return (
                          <MobileFieldRow
                            key={i.id}
                            accent={isLate ? 'critical' : isToday ? 'warn' : 'primary'}
                            title={i.scopeName}
                            subtitle={meta}
                            rightTop={
                              <RowActionsMenu
                                testId={`irr-${i.id}`}
                                onEdit={() => setEditEv(i)}
                                onDelete={() => setDeleteId(i.id)}
                              />
                            }
                            className={
                              isLate
                                ? 'bg-status-critical-soft/40'
                                : isToday
                                  ? 'bg-status-warn-soft/30'
                                  : ''
                            }
                          >
                            <Button
                              size="sm"
                              variant={isLate || isToday ? 'default' : 'outline'}
                              className="h-9 w-full text-[13px]"
                              onClick={() => {
                                queueMarkIrrigationDone(i.id)
                                  .then(() => toast.success('Riego marcado como realizado'))
                                  .catch((err) =>
                                    toast.error('No se pudo actualizar', {
                                      description: (err as Error).message,
                                    }),
                                  );
                              }}
                              data-testid={`button-done-${i.id}`}
                            >
                              <Check className="h-4 w-4" /> Marcar realizado
                            </Button>
                          </MobileFieldRow>
                        );
                      }
                      return (
                        <div
                          key={i.id}
                          className={`flex items-center justify-between rounded-md border px-3 py-2.5 transition-colors hover:bg-muted/30 ${isLate ? 'border-status-critical/40 bg-status-critical-soft/30' : isToday ? 'border-status-warn/40 bg-status-warn-soft/30' : 'border-border/60'}`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{i.scopeName}</p>
                            <p
                              className={`text-xs tabular ${isLate ? 'text-status-critical font-medium' : 'text-muted-foreground'}`}
                            >
                              {meta}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant={isLate || isToday ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                queueMarkIrrigationDone(i.id)
                                  .then(() => toast.success('Riego marcado como realizado'))
                                  .catch((err) =>
                                    toast.error('No se pudo actualizar', {
                                      description: (err as Error).message,
                                    }),
                                  );
                              }}
                              data-testid={`button-done-${i.id}`}
                            >
                              Marcar realizado
                            </Button>
                            <RowActionsMenu
                              testId={`irr-${i.id}`}
                              onEdit={() => setEditEv(i)}
                              onDelete={() => setDeleteId(i.id)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Historial reciente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredDone.length === 0 && (
                  <p className="text-sm text-muted-foreground py-3">Sin historial.</p>
                )}
                {filteredDone.map((i) => {
                  const meta = `${new Date(i.scheduledAt).toLocaleString('es-BO')} · ${i.durationMin} min${i.volumeL ? ` · ${i.volumeL}L` : ''}`;
                  if (isMobile) {
                    return (
                      <MobileFieldRow
                        key={i.id}
                        accent={i.status === 'pending-sync' ? 'warn' : 'ok'}
                        title={i.scopeName}
                        subtitle={meta}
                        rightTop={
                          <div className="flex items-center gap-1">
                            <StatusBadge
                              status={i.status === 'pending-sync' ? 'pending-sync' : 'ok'}
                            />
                            <RowActionsMenu
                              testId={`irr-${i.id}`}
                              onEdit={() => setEditEv(i)}
                              onDelete={() => setDeleteId(i.id)}
                            />
                          </div>
                        }
                      />
                    );
                  }
                  return (
                    <div
                      key={i.id}
                      className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/30"
                      data-testid={`row-irr-${i.id}`}
                    >
                      <div>
                        <p className="text-sm font-medium">{i.scopeName}</p>
                        <p className="text-xs text-muted-foreground tabular">{meta}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <StatusBadge status={i.status === 'pending-sync' ? 'pending-sync' : 'ok'} />
                        <RowActionsMenu
                          testId={`irr-${i.id}`}
                          onEdit={() => setEditEv(i)}
                          onDelete={() => setDeleteId(i.id)}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
        {!isMobile && selectedEv && (
          <DetailSidePanel
            title={selectedEv.scopeName}
            subtitle={`${selectedEv.scopeType === 'block' ? 'Bloque' : 'Invernadero'} · ${new Date(selectedEv.scheduledAt).toLocaleString('es-BO')}`}
            headerExtra={
              <StatusBadge
                status={
                  selectedEv.status === 'done'
                    ? 'ok'
                    : selectedEv.status === 'pending-sync'
                      ? 'pending-sync'
                      : selectedEv.status === 'skipped'
                        ? 'idle'
                        : 'warn'
                }
                label={
                  selectedEv.status === 'scheduled'
                    ? 'Programado'
                    : selectedEv.status === 'done'
                      ? 'Realizado'
                      : selectedEv.status === 'skipped'
                        ? 'Omitido'
                        : 'Pend. sync'
                }
              />
            }
            onClose={() => setSelectedId(null)}
            footer={
              <div className="flex items-center gap-2">
                {selectedEv.status === 'scheduled' && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      queueMarkIrrigationDone(selectedEv.id)
                        .then(() => toast.success('Riego marcado como realizado'))
                        .catch((err) =>
                          toast.error('No se pudo actualizar', {
                            description: (err as Error).message,
                          }),
                        );
                    }}
                    data-testid="button-irr-done-panel"
                  >
                    <Check className="h-4 w-4" /> Marcar realizado
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditEv(selectedEv)}
                  data-testid="button-irr-edit-panel"
                >
                  Editar
                </Button>
              </div>
            }
          >
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Programado
                </dt>
                <dd className="tabular">
                  {new Date(selectedEv.scheduledAt).toLocaleString('es-BO')}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Duración
                </dt>
                <dd className="tabular flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {selectedEv.durationMin}{' '}
                  min
                </dd>
              </div>
              {selectedEv.volumeL != null && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Volumen
                  </dt>
                  <dd className="tabular">{selectedEv.volumeL} L</dd>
                </div>
              )}
              {selectedEv.responsible && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Responsable
                  </dt>
                  <dd>{selectedEv.responsible}</dd>
                </div>
              )}
              {selectedEv.notes && (
                <div className="col-span-2">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Notas
                  </dt>
                  <dd className="whitespace-pre-wrap leading-relaxed">{selectedEv.notes}</dd>
                </div>
              )}
            </dl>
          </DetailSidePanel>
        )}
      </div>

      {isMobile && (
        <MobileActionBar
          hint={todayCount > 0 ? `${todayCount} riegos programados para hoy` : undefined}
        >
          <Button
            size="lg"
            className="h-12 flex-1 text-[15px] font-semibold"
            onClick={() => setOpen(true)}
            data-testid="button-new-irr-mobile"
          >
            <Plus className="h-5 w-5" /> Registrar riego
          </Button>
        </MobileActionBar>
      )}
      {isMobile && (
        <QuickCaptureDrawer
          open={open}
          onOpenChange={setOpen}
          trigger={<span />}
          title="Registrar riego"
          description="Captura rápida desde campo"
        >
          <QuickIrrigationForm onDone={() => setOpen(false)} />
        </QuickCaptureDrawer>
      )}
      <QuickCaptureDrawer
        open={Boolean(editEv)}
        onOpenChange={(o) => !o && setEditEv(null)}
        trigger={<span />}
        title={editEv ? `Editar · ${editEv.scopeName}` : 'Editar riego'}
        description="Actualiza horario, duración, volumen o estado"
      >
        {editEv && <EditIrrigationForm ev={editEv} onDone={() => setEditEv(null)} />}
      </QuickCaptureDrawer>
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="¿Eliminar riego?"
        description="Esta acción no se puede deshacer."
        onConfirm={async () => {
          if (!deleteId) return;
          try {
            await queueDeleteIrrigation(deleteId);
            toast.success('Riego eliminado');
          } catch (err) {
            toast.error('No se pudo eliminar', { description: (err as Error).message });
          } finally {
            setDeleteId(null);
          }
        }}
        testId="delete-irr"
      />
    </div>
  );
}
