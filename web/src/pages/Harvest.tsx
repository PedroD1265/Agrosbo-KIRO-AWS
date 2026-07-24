import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { usePermissions } from '@/lib/permissions';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { QuickCaptureDrawer } from '@/shared/ui/QuickCaptureDrawer';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FilterBar } from '@/shared/ui/FilterBar';
import { MetricCard } from '@/shared/ui/MetricCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { PackageCheck, Plus } from 'lucide-react';
import { MobileActionBar } from '@/shared/ui/MobileActionBar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBlocks, useGreenhouses, useHarvestLots, useCampaigns } from '@/hooks/data';
import {
  queueCreateHarvest,
  queueUpdateHarvestLot,
  queueDeleteHarvestLot,
} from '@/hooks/data/mutations';
import { RowActionsMenu } from '@/shared/ui/RowActionsMenu';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { operationalStatusSchema, type HarvestLot, type ScopeType } from '@shared/schema';

const formSchema = z.object({
  code: z.string().min(3, 'Código de lote (≥3)'),
  originRef: z.string().min(1, 'Selecciona origen'),
  campaignId: z.string().optional(),
  crop: z.string().min(2, 'Requerido'),
  variety: z.string().min(1, 'Requerido'),
  date: z.string().min(1, 'Requerido'),
  quantity: z.coerce.number().positive('Mayor a 0'),
  unit: z.string().min(1, 'Requerido'),
  destination: z.string().optional(),
  unitPrice: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().nonnegative('≥ 0').optional(),
  ),
  currency: z.string().max(8).optional(),
  costAllocated: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().nonnegative('≥ 0').optional(),
  ),
});
type FormValues = z.infer<typeof formSchema>;

const NONE_CAMPAIGN = '__none__';

function defaultCode() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const r = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `LOT-${y}${m}${day}-${r}`;
}

function NewHarvestForm({ onDone }: { onDone: () => void }) {
  const { data: blocks = [] } = useBlocks();
  const { data: greenhouses = [] } = useGreenhouses();
  const { data: campaigns = [] } = useCampaigns();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: defaultCode(),
      originRef: '',
      campaignId: NONE_CAMPAIGN,
      crop: '',
      variety: '',
      date: new Date().toISOString().slice(0, 10),
      quantity: 0,
      unit: 'kg',
      destination: '',
      unitPrice: undefined,
      currency: 'BOB',
      costAllocated: undefined,
    },
  });

  const originRef = form.watch('originRef');
  const matchingCampaigns = useMemo(() => {
    if (!originRef) return campaigns;
    const [t, id] = originRef.split(':');
    return campaigns.filter((c) => c.scopeType === t && c.scopeId === id);
  }, [campaigns, originRef]);

  const submit = form.handleSubmit(async (values) => {
    const [originType, originId] = values.originRef.split(':') as [ScopeType, string];
    try {
      await queueCreateHarvest({
        code: values.code,
        originType,
        originId,
        crop: values.crop,
        variety: values.variety,
        date: values.date,
        quantity: values.quantity,
        unit: values.unit,
        destination: values.destination || undefined,
        status: 'pending-sync',
        campaignId:
          values.campaignId && values.campaignId !== NONE_CAMPAIGN ? values.campaignId : undefined,
        unitPrice:
          typeof values.unitPrice === 'number' && !Number.isNaN(values.unitPrice)
            ? values.unitPrice
            : undefined,
        currency:
          (typeof values.unitPrice === 'number' || typeof values.costAllocated === 'number') &&
          values.currency
            ? values.currency
            : undefined,
        costAllocated:
          typeof values.costAllocated === 'number' && !Number.isNaN(values.costAllocated)
            ? values.costAllocated
            : undefined,
      });
      toast.success('Lote registrado', {
        description: navigator.onLine ? 'Sincronizando…' : 'Encolado offline.',
      });
      form.reset({ ...form.getValues(), code: defaultCode() });
      onDone();
    } catch (err) {
      toast.error('No se pudo registrar', { description: (err as Error).message });
    }
  });

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código de lote</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-lot-code" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="originRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Origen</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger data-testid="select-lot-origin">
                    <SelectValue placeholder="Bloque o invernadero…" />
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
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="crop"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cultivo</FormLabel>
                <FormControl>
                  <Input placeholder="Tomate" {...field} data-testid="input-lot-crop" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="variety"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variedad</FormLabel>
                <FormControl>
                  <Input placeholder="Río Grande" {...field} data-testid="input-lot-variety" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-lot-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cantidad</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} data-testid="input-lot-qty" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidad</FormLabel>
                <FormControl>
                  <Input placeholder="kg" {...field} data-testid="input-lot-unit" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="destination"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destino (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Mercado / Cliente" {...field} data-testid="input-lot-dest" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="campaignId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Campaña (opcional)</FormLabel>
              <Select value={field.value ?? NONE_CAMPAIGN} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger data-testid="select-lot-campaign">
                    <SelectValue placeholder="Sin campaña" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE_CAMPAIGN}>Sin campaña</SelectItem>
                  {matchingCampaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.crop} · {c.variety} ({c.scopeName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="unitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio unitario (opcional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 15.00"
                    {...field}
                    value={field.value ?? ''}
                    data-testid="input-lot-price"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Moneda</FormLabel>
                <FormControl>
                  <Input
                    maxLength={8}
                    placeholder="BOB"
                    {...field}
                    value={field.value ?? ''}
                    data-testid="input-lot-currency"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="costAllocated"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Costo asignado al lote (opcional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ej: 120.00"
                  {...field}
                  value={field.value ?? ''}
                  data-testid="input-lot-cost"
                />
              </FormControl>
              <p className="text-[11px] text-muted-foreground">
                Úsalo si ya tienes un costo estimado de insumos/jornales para este lote. Sin este
                dato, el margen no se calcula.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" data-testid="button-submit-lot">
          Registrar lote
        </Button>
      </form>
    </Form>
  );
}

const editSchema = z.object({
  code: z.string().min(3),
  date: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1),
  destination: z.string().optional(),
  status: operationalStatusSchema,
});
type EditValues = z.infer<typeof editSchema>;

function EditHarvestForm({ lot, onDone }: { lot: HarvestLot; onDone: () => void }) {
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      code: lot.code,
      date: lot.date,
      quantity: lot.quantity,
      unit: lot.unit,
      destination: lot.destination ?? '',
      status: lot.status,
    },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await queueUpdateHarvestLot(lot.id, {
        code: values.code,
        date: values.date,
        quantity: values.quantity,
        unit: values.unit,
        destination: values.destination || undefined,
        status: values.status,
      });
      toast.success('Lote actualizado');
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
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código de lote</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-lot-edit-code" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-lot-edit-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cantidad</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} data-testid="input-lot-edit-qty" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidad</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-lot-edit-unit" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="destination"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destino</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-lot-edit-dest" />
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
                  <SelectTrigger data-testid="select-lot-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ok">Confirmado</SelectItem>
                  <SelectItem value="warn">Atención</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="idle">Inactivo</SelectItem>
                  <SelectItem value="pending-sync">Pend. sync</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" data-testid="button-submit-lot-edit">
          Guardar cambios
        </Button>
      </form>
    </Form>
  );
}

export default function HarvestPage() {
  const { can } = usePermissions();
  const canWrite = can('harvestLots:write');
  const { data: harvestLots = [] } = useHarvestLots();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editLot, setEditLot] = useState<HarvestLot | null>(null);
  const [q, setQ] = useState('');
  const [cropFilter, setCropFilter] = useState<string>('all');

  const crops = useMemo(
    () => Array.from(new Set(harvestLots.map((l) => l.crop))).sort(),
    [harvestLots],
  );
  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return [...harvestLots]
      .filter((l) => {
        const matchesQ =
          !q ||
          [l.code, l.crop, l.variety, l.origin, l.destination ?? '']
            .join(' ')
            .toLowerCase()
            .includes(ql);
        const matchesCrop = cropFilter === 'all' || l.crop === cropFilter;
        return matchesQ && matchesCrop;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [harvestLots, q, cropFilter]);

  const totalKg = harvestLots
    .filter((l) => l.unit.toLowerCase() === 'kg')
    .reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div className={`space-y-5 animate-fade-in ${isMobile ? 'pb-24' : ''}`}>
      <PageHeader
        eyebrow="Producción · Trazabilidad"
        title="Cosecha y lotes"
        subtitle="Trazabilidad de lotes cosechados desde campo"
        actions={
          !isMobile &&
          canWrite && (
            <QuickCaptureDrawer
              open={open}
              onOpenChange={setOpen}
              trigger={
                <Button size="sm" data-testid="button-new-lot">
                  <Plus className="h-4 w-4" /> Registrar lote
                </Button>
              }
              title="Nuevo lote de cosecha"
              description="Captura desde campo"
            >
              <NewHarvestForm onDone={() => setOpen(false)} />
            </QuickCaptureDrawer>
          )
        }
      />

      {harvestLots.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Sin lotes registrados"
          description="Cuando registres una cosecha, aparecerá aquí con código de trazabilidad y origen."
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Registrar primer lote
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <MetricCard
              label="Lotes registrados"
              value={harvestLots.length}
              icon={PackageCheck}
              tone="primary"
            />
            <MetricCard
              label="Total cosechado (kg)"
              value={totalKg.toFixed(1)}
              hint="Solo unidades en kg"
            />
            <MetricCard
              label="Cultivos distintos"
              value={new Set(harvestLots.map((l) => l.crop)).size}
            />
          </div>

          <FilterBar
            value={q}
            onValueChange={setQ}
            placeholder="Buscar por código, cultivo, origen o destino…"
            resultCount={filtered.length}
            right={
              <Select value={cropFilter} onValueChange={setCropFilter}>
                <SelectTrigger className="h-9 w-44" data-testid="select-lot-crop-filter">
                  <SelectValue placeholder="Todos los cultivos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cultivos</SelectItem>
                  {crops.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((l) => {
              const d = new Date(l.date);
              const dateLabel = isNaN(d.getTime())
                ? l.date
                : d.toLocaleDateString('es-BO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
              return (
                <Card
                  key={l.id}
                  data-testid={`card-lot-${l.id}`}
                  className="shadow-card transition-all hover:shadow-elevated"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                          <PackageCheck className="h-4 w-4" />
                        </div>
                        <p className="font-mono text-sm font-semibold tracking-tight">{l.code}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <StatusBadge status={l.status} />
                        {canWrite && (
                          <RowActionsMenu
                            testId={`lot-${l.id}`}
                            onEdit={() => setEditLot(l)}
                            onDelete={() => setDeleteId(l.id)}
                          />
                        )}
                      </div>
                    </div>
                    <p className="mt-3 text-base font-semibold">{l.crop}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.variety} · origen {l.origin}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Cantidad
                        </p>
                        <p className="mt-0.5 text-sm font-semibold tabular">
                          {l.quantity}{' '}
                          <span className="text-muted-foreground font-normal">{l.unit}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Fecha
                        </p>
                        <p className="mt-0.5 text-sm font-semibold tabular">{dateLabel}</p>
                      </div>
                    </div>
                    {l.destination && (
                      <p className="mt-3 text-xs">
                        <span className="text-muted-foreground">Destino: </span>
                        <span className="font-medium">{l.destination}</span>
                      </p>
                    )}
                    {(typeof l.unitPrice === 'number' || typeof l.costAllocated === 'number') &&
                      (() => {
                        const hasPrice = typeof l.unitPrice === 'number';
                        const hasCost = typeof l.costAllocated === 'number';
                        const ingreso = hasPrice ? l.quantity * (l.unitPrice as number) : null;
                        const costo = hasCost ? (l.costAllocated as number) : null;
                        const canMargin = ingreso !== null && costo !== null;
                        return (
                          <div
                            className="mt-3 space-y-2 border-t border-border/60 pt-3"
                            data-testid={`margin-${l.id}`}
                          >
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {hasPrice ? 'Ingreso' : 'Ingreso'}
                                </p>
                                <p className="mt-0.5 text-sm font-semibold tabular">
                                  {hasPrice ? (
                                    <>
                                      {(ingreso as number).toFixed(2)}{' '}
                                      <span className="text-muted-foreground font-normal">
                                        {l.currency ?? ''}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground font-normal">—</span>
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  Costo
                                </p>
                                <p className="mt-0.5 text-sm font-semibold tabular">
                                  {hasCost ? (
                                    <>
                                      {(costo as number).toFixed(2)}{' '}
                                      <span className="text-muted-foreground font-normal">
                                        {l.currency ?? ''}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground font-normal">
                                      No asignado
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  Margen
                                </p>
                                {canMargin ? (
                                  (() => {
                                    const margin = (ingreso as number) - (costo as number);
                                    const positive = margin >= 0;
                                    return (
                                      <p
                                        className={`mt-0.5 text-sm font-semibold tabular ${positive ? 'text-status-ok' : 'text-status-critical'}`}
                                      >
                                        {margin.toFixed(2)}{' '}
                                        <span className="text-muted-foreground font-normal">
                                          {l.currency ?? ''}
                                        </span>
                                      </p>
                                    );
                                  })()
                                ) : (
                                  <p className="mt-0.5 text-sm font-semibold tabular text-muted-foreground">
                                    —
                                  </p>
                                )}
                              </div>
                            </div>
                            {hasPrice && !hasCost && (
                              <p
                                className="text-[11px] text-muted-foreground"
                                data-testid={`margin-warning-${l.id}`}
                              >
                                Margen no calculado · costos no asignados
                              </p>
                            )}
                          </div>
                        );
                      })()}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <QuickCaptureDrawer
        open={Boolean(editLot)}
        onOpenChange={(o) => !o && setEditLot(null)}
        trigger={<span />}
        title={editLot ? `Editar · ${editLot.code}` : 'Editar lote'}
        description="Actualiza código, cantidad, destino o estado"
      >
        {editLot && <EditHarvestForm lot={editLot} onDone={() => setEditLot(null)} />}
      </QuickCaptureDrawer>
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="¿Eliminar lote?"
        description="Esta acción no se puede deshacer."
        onConfirm={async () => {
          if (!deleteId) return;
          try {
            await queueDeleteHarvestLot(deleteId);
            toast.success('Lote eliminado');
          } catch (err) {
            toast.error('No se pudo eliminar', { description: (err as Error).message });
          } finally {
            setDeleteId(null);
          }
        }}
        testId="delete-lot"
      />

      {isMobile && canWrite && (
        <>
          <MobileActionBar>
            <Button
              size="lg"
              className="h-12 flex-1 text-[15px] font-semibold"
              onClick={() => setOpen(true)}
              data-testid="button-new-lot-mobile"
            >
              <Plus className="h-5 w-5" /> Registrar lote
            </Button>
          </MobileActionBar>
          <QuickCaptureDrawer
            open={open}
            onOpenChange={setOpen}
            trigger={<span />}
            title="Nuevo lote de cosecha"
            description="Captura desde campo"
          >
            <NewHarvestForm onDone={() => setOpen(false)} />
          </QuickCaptureDrawer>
        </>
      )}
    </div>
  );
}
