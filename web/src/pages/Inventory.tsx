import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { usePermissions } from "@/lib/permissions";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { QuickCaptureDrawer } from "@/shared/ui/QuickCaptureDrawer";
import { EmptyState } from "@/shared/ui/EmptyState";
import { FilterBar } from "@/shared/ui/FilterBar";
import { MetricCard } from "@/shared/ui/MetricCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Plus, ArrowDownUp, Boxes, AlertTriangle } from "lucide-react";
import { SortableHeader } from "@/shared/ui/SortableHeader";
import { StockBar } from "@/shared/ui/StockBar";
import { MobileFieldRow } from "@/shared/ui/MobileFieldRow";
import { MobileActionBar } from "@/shared/ui/MobileActionBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInventory, useInventoryMovements } from "@/hooks/data";
import {
  queueCreateInventory,
  queueAdjustInventory,
  queueUpdateInventoryItem,
  queueDeleteInventoryItem,
} from "@/hooks/data/mutations";
import { RowActionsMenu } from "@/shared/ui/RowActionsMenu";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import type { InventoryItem } from "@shared/schema";

const createSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  category: z.string().min(2, "Requerido"),
  unit: z.string().min(1, "Requerido"),
  stock: z.coerce.number().nonnegative("≥ 0"),
  min: z.coerce.number().nonnegative("≥ 0"),
  unitCost: z.coerce.number().nonnegative("≥ 0").optional(),
  currency: z.string().max(8).optional(),
});
type CreateValues = z.infer<typeof createSchema>;

function CreateInventoryForm({ onDone }: { onDone: () => void }) {
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", category: "Insumos", unit: "kg", stock: 0, min: 0, currency: "BOB" },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      const payload: Parameters<typeof queueCreateInventory>[0] = {
        name: values.name,
        category: values.category,
        unit: values.unit,
        stock: values.stock,
        min: values.min,
        unitCost: values.unitCost === undefined || Number.isNaN(values.unitCost) ? undefined : values.unitCost,
        currency: values.unitCost && values.currency ? values.currency : undefined,
      };
      await queueCreateInventory(payload);
      toast.success("Insumo creado", {
        description: navigator.onLine ? "Sincronizando…" : "Encolado offline.",
      });
      form.reset();
      onDone();
    } catch (err) {
      toast.error("No se pudo crear", { description: (err as Error).message });
    }
  });
  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input placeholder="Ej: Urea 46%" {...field} data-testid="input-inv-name" /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem><FormLabel>Categoría</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger data-testid="select-inv-category"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="Insumos">Insumos</SelectItem>
                  <SelectItem value="Fertilizantes">Fertilizantes</SelectItem>
                  <SelectItem value="Fitosanitarios">Fitosanitarios</SelectItem>
                  <SelectItem value="Semillas">Semillas</SelectItem>
                  <SelectItem value="Materiales">Materiales</SelectItem>
                </SelectContent>
              </Select><FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="unit" render={({ field }) => (
            <FormItem><FormLabel>Unidad</FormLabel><FormControl><Input placeholder="kg, L, u" {...field} data-testid="input-inv-unit" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="stock" render={({ field }) => (
            <FormItem><FormLabel>Stock inicial</FormLabel><FormControl><Input type="number" step="0.01" {...field} data-testid="input-inv-stock" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="min" render={({ field }) => (
            <FormItem><FormLabel>Mínimo</FormLabel><FormControl><Input type="number" step="0.01" {...field} data-testid="input-inv-min" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="unitCost" render={({ field }) => (
            <FormItem><FormLabel>Costo unitario (opcional)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ej: 12.50" {...field} value={field.value ?? ""} data-testid="input-inv-unit-cost" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="currency" render={({ field }) => (
            <FormItem><FormLabel>Moneda</FormLabel><FormControl><Input maxLength={8} placeholder="BOB" {...field} value={field.value ?? ""} data-testid="input-inv-currency" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <Button type="submit" className="w-full" data-testid="button-submit-inv">Crear insumo</Button>
      </form>
    </Form>
  );
}

const adjustSchema = z.object({
  direction: z.enum(["in", "out"]),
  amount: z.coerce.number().positive("Mayor a 0"),
  note: z.string().optional(),
  unitCost: z.coerce.number().nonnegative("≥ 0").optional(),
  currency: z.string().max(8).optional(),
});
type AdjustValues = z.infer<typeof adjustSchema>;

function AdjustInventoryForm({
  item,
  onDone,
}: { item: InventoryItem; onDone: () => void }) {
  const { data: movements = [] } = useInventoryMovements(item.id);
  const form = useForm<AdjustValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      direction: "out",
      amount: 1,
      note: "",
      unitCost: undefined,
      currency: item.currency ?? "BOB",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    const delta = values.direction === "in" ? values.amount : -values.amount;
    try {
      await queueAdjustInventory({
        id: item.id,
        delta,
        note: values.note || undefined,
        unitCost:
          values.unitCost === undefined || Number.isNaN(values.unitCost)
            ? undefined
            : values.unitCost,
        currency: values.unitCost && values.currency ? values.currency : undefined,
      });
      toast.success(values.direction === "in" ? "Entrada registrada" : "Salida registrada");
      form.reset({
        direction: "out",
        amount: 1,
        note: "",
        unitCost: undefined,
        currency: item.currency ?? "BOB",
      });
      onDone();
    } catch (err) {
      toast.error("No se pudo registrar", { description: (err as Error).message });
    }
  });
  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormField control={form.control} name="direction" render={({ field }) => (
          <FormItem><FormLabel>Tipo de movimiento</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl><SelectTrigger data-testid="select-mov-direction"><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="out">Salida (consumo)</SelectItem>
                <SelectItem value="in">Entrada (compra/ingreso)</SelectItem>
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="amount" render={({ field }) => (
          <FormItem><FormLabel>Cantidad ({item.unit})</FormLabel><FormControl><Input type="number" step="0.01" {...field} data-testid="input-mov-amount" /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="unitCost" render={({ field }) => (
            <FormItem>
              <FormLabel>Costo unitario {item.unitCost !== undefined ? `(últ. ${item.unitCost})` : "(opcional)"}</FormLabel>
              <FormControl><Input type="number" step="0.01" placeholder={item.unitCost?.toString() ?? "0.00"} {...field} value={field.value ?? ""} data-testid="input-mov-unit-cost" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="currency" render={({ field }) => (
            <FormItem><FormLabel>Moneda</FormLabel><FormControl><Input maxLength={8} placeholder="BOB" {...field} value={field.value ?? ""} data-testid="input-mov-currency" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="note" render={({ field }) => (
          <FormItem><FormLabel>Nota</FormLabel><FormControl><Input placeholder="Bloque destino, motivo…" {...field} data-testid="input-mov-note" /></FormControl></FormItem>
        )} />
        <Button type="submit" className="w-full" data-testid="button-submit-mov">Registrar movimiento</Button>

        {movements.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-border pt-3" data-testid="movements-history">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Últimos movimientos</div>
            <ul className="max-h-44 space-y-1.5 overflow-y-auto text-[13px]">
              {movements.slice(0, 8).map((m) => {
                const sign = m.delta > 0 ? "+" : "";
                const cost = typeof m.totalCost === "number"
                  ? ` · ${m.totalCost.toFixed(2)}${m.currency ? ` ${m.currency}` : ""}`
                  : "";
                return (
                  <li key={m.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5" data-testid={`movement-${m.id}`}>
                    <span className="tabular text-muted-foreground">{m.at.slice(0, 10)}</span>
                    <span className={m.delta > 0 ? "font-medium text-status-ok" : "font-medium text-status-critical"}>
                      {sign}{m.delta} {item.unit}
                    </span>
                    <span className="flex-1 truncate text-right text-muted-foreground">{m.note ?? "—"}{cost}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </form>
    </Form>
  );
}

const editSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  unit: z.string().min(1),
  min: z.coerce.number().nonnegative(),
});
type EditValues = z.infer<typeof editSchema>;

function EditInventoryForm({ item, onDone }: { item: InventoryItem; onDone: () => void }) {
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: item.name, category: item.category, unit: item.unit, min: item.min },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await queueUpdateInventoryItem(item.id, values);
      toast.success("Insumo actualizado");
      onDone();
    } catch (err) {
      toast.error("No se pudo actualizar", { description: (err as Error).message });
    }
  });
  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} data-testid="input-inv-edit-name" /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem><FormLabel>Categoría</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger data-testid="select-inv-edit-category"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="Insumos">Insumos</SelectItem>
                  <SelectItem value="Fertilizantes">Fertilizantes</SelectItem>
                  <SelectItem value="Fitosanitarios">Fitosanitarios</SelectItem>
                  <SelectItem value="Semillas">Semillas</SelectItem>
                  <SelectItem value="Materiales">Materiales</SelectItem>
                </SelectContent>
              </Select><FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="unit" render={({ field }) => (
            <FormItem><FormLabel>Unidad</FormLabel><FormControl><Input {...field} data-testid="input-inv-edit-unit" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="min" render={({ field }) => (
          <FormItem><FormLabel>Stock mínimo</FormLabel><FormControl><Input type="number" step="0.01" {...field} data-testid="input-inv-edit-min" /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" className="w-full" data-testid="button-submit-inv-edit">Guardar cambios</Button>
      </form>
    </Form>
  );
}

export default function InventoryPage() {
  const { can } = usePermissions();
  const canWrite = can("inventory:write");
  const { data: inventory = [] } = useInventory();
  const isMobile = useIsMobile();
  const [openCreate, setOpenCreate] = useState(false);
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const adjustItem = inventory.find((i) => i.id === adjustId);
  type SortKey = "name" | "category" | "stock" | "min" | "lastMovement";
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  const lowStock = useMemo(() => inventory.filter((i) => i.stock <= i.min), [inventory]);
  const stockValue = useMemo(() => {
    let total = 0;
    let priced = 0;
    let currency = "BOB";
    for (const i of inventory) {
      if (typeof i.unitCost === "number") {
        total += i.stock * i.unitCost;
        priced += 1;
        if (i.currency) currency = i.currency;
      }
    }
    return { total, priced, currency };
  }, [inventory]);
  const filtered = useMemo(() => {
    const base = inventory.filter((i) => {
      const matchesQ = q === "" || [i.name, i.category].join(" ").toLowerCase().includes(q.toLowerCase());
      const matchesLow = !onlyLow || i.stock <= i.min;
      return matchesQ && matchesLow;
    });
    const sign = sortDir === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      switch (sortKey) {
        case "name": return sign * a.name.localeCompare(b.name);
        case "category": return sign * a.category.localeCompare(b.category);
        case "stock": return sign * (a.stock - b.stock);
        case "min": return sign * (a.min - b.min);
        case "lastMovement": return sign * (a.lastMovement ?? "").localeCompare(b.lastMovement ?? "");
        default: return 0;
      }
    });
  }, [inventory, q, onlyLow, sortKey, sortDir]);

  return (
    <div className={`space-y-5 animate-fade-in ${isMobile ? "pb-24" : ""}`}>
      <PageHeader
        eyebrow="Operación · Recursos"
        title="Inventario"
        subtitle="Insumos, fitosanitarios y materiales"
        actions={
          !isMobile && canWrite && (
            <QuickCaptureDrawer
              open={openCreate}
              onOpenChange={setOpenCreate}
              trigger={<Button size="sm" data-testid="button-new-inv"><Plus className="h-4 w-4" /> Nuevo insumo</Button>}
              title="Nuevo insumo"
              description="Alta rápida en el catálogo"
            >
              <CreateInventoryForm onDone={() => setOpenCreate(false)} />
            </QuickCaptureDrawer>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Insumos totales" value={inventory.length} icon={Boxes} tone="primary" />
        <MetricCard
          label="Bajo stock"
          value={lowStock.length}
          icon={AlertTriangle}
          tone={lowStock.length > 0 ? "critical" : "ok"}
          hint={lowStock.length === 0 ? "Todo en niveles" : "Reponer pronto"}
        />
        <MetricCard
          label="Valor del stock"
          value={
            stockValue.total > 0
              ? `${stockValue.total.toFixed(2)} ${stockValue.currency}`
              : "—"
          }
          tone="default"
          hint={
            stockValue.priced < inventory.length
              ? `${stockValue.priced}/${inventory.length} con costo`
              : undefined
          }
        />
        <MetricCard
          label="Categorías"
          value={new Set(inventory.map((i) => i.category)).size}
          tone="default"
        />
      </div>

      <FilterBar
        value={q}
        onValueChange={setQ}
        placeholder={isMobile ? "Buscar insumo…" : "Buscar insumo o categoría…"}
        resultCount={filtered.length}
        right={
          <Button
            size="sm"
            variant={onlyLow ? "default" : "outline"}
            onClick={() => setOnlyLow((v) => !v)}
            data-testid="button-filter-low-stock"
            className="h-9"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {isMobile ? "Bajo stock" : "Solo bajo stock"}
          </Button>
        }
      />

      {inventory.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Sin insumos en el catálogo"
          description="Crea el primer insumo para comenzar a registrar entradas y salidas de stock."
          action={
            <Button size="sm" onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4" /> Crear insumo
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="Prueba ajustando la búsqueda o el filtro de bajo stock."
        />
      ) : isMobile ? (
        <div className="space-y-2.5">
          {filtered.map((i) => {
            const low = i.stock <= i.min;
            return (
              <MobileFieldRow
                key={i.id}
                accent={low ? "critical" : "ok"}
                title={i.name}
                subtitle={`${i.category} · ${i.stock} ${i.unit} disponibles`}
                meta={i.lastMovement ? `Últ. movimiento: ${i.lastMovement}` : undefined}
                rightTop={
                  <div className="flex items-center gap-1">
                    <StatusBadge status={low ? "critical" : "ok"} label={low ? "Bajo" : "OK"} />
                    {canWrite && <RowActionsMenu testId={`inv-${i.id}`} onEdit={() => setEditItem(i)} onDelete={() => setDeleteId(i.id)} />}
                  </div>
                }
                className={low ? "bg-status-critical-soft/20" : ""}
              >
                <div className="space-y-2">
                  <StockBar stock={i.stock} min={i.min} />
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-full text-[13px]"
                      onClick={() => setAdjustId(i.id)}
                      data-testid={`button-adjust-${i.id}`}
                    >
                      <ArrowDownUp className="h-4 w-4" /> Registrar movimiento
                    </Button>
                  )}
                </div>
              </MobileFieldRow>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <SortableHeader<SortKey> label="Insumo" sortKey="name" active={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableHeader<SortKey> label="Categoría" sortKey="category" active={sortKey} direction={sortDir} onSort={handleSort} />
                  <SortableHeader<SortKey> label="Stock" sortKey="stock" active={sortKey} direction={sortDir} onSort={handleSort} align="right" />
                  <SortableHeader<SortKey> label="Mínimo" sortKey="min" active={sortKey} direction={sortDir} onSort={handleSort} align="right" />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Nivel</th>
                  <SortableHeader<SortKey> label="Últ. movimiento" sortKey="lastMovement" active={sortKey} direction={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const low = i.stock <= i.min;
                  return (
                    <tr
                      key={i.id}
                      className={`group border-b border-border/50 last:border-0 transition-colors hover:bg-muted/30 ${low ? "bg-status-critical-soft/20" : ""}`}
                      data-testid={`row-inventory-${i.id}`}
                    >
                      <td className={`px-4 py-3 font-medium ${low ? "border-l-2 border-status-critical" : ""}`}>{i.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{i.category}</td>
                      <td className={`px-4 py-3 text-right tabular ${low ? "font-semibold text-status-critical" : ""}`}>
                        {i.stock} <span className="text-muted-foreground font-normal">{i.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular text-muted-foreground">
                        {i.min} {i.unit}
                      </td>
                      <td className="px-4 py-3"><StockBar stock={i.stock} min={i.min} /></td>
                      <td className="px-4 py-3 tabular text-muted-foreground">{i.lastMovement}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={low ? "critical" : "ok"} label={low ? "Bajo stock" : "OK"} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canWrite && (
                          <div className="flex items-center justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAdjustId(i.id)}
                              data-testid={`button-adjust-${i.id}`}
                            >
                              <ArrowDownUp className="h-3.5 w-3.5" /> Movimiento
                            </Button>
                            <RowActionsMenu
                              testId={`inv-${i.id}`}
                              onEdit={() => setEditItem(i)}
                              onDelete={() => setDeleteId(i.id)}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {isMobile && canWrite && (
        <>
          <MobileActionBar hint={lowStock.length > 0 ? `${lowStock.length} insumos bajo mínimo` : undefined}>
            <Button
              size="lg"
              className="h-12 flex-1 text-[15px] font-semibold"
              onClick={() => setOpenCreate(true)}
              data-testid="button-new-inv-mobile"
            >
              <Plus className="h-5 w-5" /> Nuevo insumo
            </Button>
          </MobileActionBar>
          <QuickCaptureDrawer
            open={openCreate}
            onOpenChange={setOpenCreate}
            trigger={<span />}
            title="Nuevo insumo"
            description="Alta rápida en el catálogo"
          >
            <CreateInventoryForm onDone={() => setOpenCreate(false)} />
          </QuickCaptureDrawer>
        </>
      )}

      <QuickCaptureDrawer
        open={Boolean(adjustId)}
        onOpenChange={(o) => !o && setAdjustId(null)}
        trigger={<span />}
        title={adjustItem ? `Movimiento · ${adjustItem.name}` : "Movimiento"}
        description="Entrada o salida de stock"
      >
        {adjustItem && (
          <AdjustInventoryForm
            item={adjustItem}
            onDone={() => setAdjustId(null)}
          />
        )}
      </QuickCaptureDrawer>

      <QuickCaptureDrawer
        open={Boolean(editItem)}
        onOpenChange={(o) => !o && setEditItem(null)}
        trigger={<span />}
        title={editItem ? `Editar · ${editItem.name}` : "Editar insumo"}
        description="Actualiza nombre, categoría, unidad o stock mínimo"
      >
        {editItem && <EditInventoryForm item={editItem} onDone={() => setEditItem(null)} />}
      </QuickCaptureDrawer>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="¿Eliminar insumo?"
        description="Esta acción no se puede deshacer. El historial de movimientos se mantiene pero quedará huérfano."
        confirmLabel="Eliminar insumo"
        onConfirm={async () => {
          if (!deleteId) return;
          try {
            await queueDeleteInventoryItem(deleteId);
            toast.success("Insumo eliminado");
          } catch (err) {
            toast.error("No se pudo eliminar", { description: (err as Error).message });
          } finally {
            setDeleteId(null);
          }
        }}
        testId="delete-inv"
      />
    </div>
  );
}
