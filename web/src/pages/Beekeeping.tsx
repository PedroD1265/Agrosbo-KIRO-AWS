import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { usePermissions } from "@/lib/permissions";
import { PageHeader } from "@/shared/ui/PageHeader";
import { EmptyState } from "@/shared/ui/EmptyState";
import { QuickCaptureDrawer } from "@/shared/ui/QuickCaptureDrawer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useApiaries, useHives, useHiveInspections, useHoneyHarvests, useInventory,
} from "@/hooks/data";
import {
  queueCreateApiary, queueCreateHive, queueCreateInspection, queueCreateHoneyHarvest,
} from "@/hooks/data/mutations";
import {
  queenStatusSchema, colonyLevelSchema, broodLevelSchema, honeyLevelSchema,
} from "@shared/schema";

/* ---------- New apiary ---------- */
const apiarySchema = z.object({
  name: z.string().min(2), location: z.string().min(2),
  lat: z.coerce.number().optional(), lng: z.coerce.number().optional(),
  notes: z.string().optional(),
});
function NewApiaryForm({ onDone }: { onDone: () => void }) {
  const form = useForm<z.infer<typeof apiarySchema>>({ resolver: zodResolver(apiarySchema) });
  const submit = form.handleSubmit(async (v) => {
    try {
      await queueCreateApiary({ name: v.name, location: v.location,
        lat: v.lat, lng: v.lng, notes: v.notes });
      toast.success("Apiario registrado");
      form.reset(); onDone();
    } catch (err) { toast.error("Error", { description: (err as Error).message }); }
  });
  return (
    <Form {...form}><form className="space-y-3" onSubmit={submit}>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} data-testid="input-apiary-name" /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="location" render={({ field }) => (
        <FormItem><FormLabel>Ubicación</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <div className="grid grid-cols-2 gap-3">
        <FormField control={form.control} name="lat" render={({ field }) => (
          <FormItem><FormLabel>Lat</FormLabel><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="lng" render={({ field }) => (
          <FormItem><FormLabel>Lng</FormLabel><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} /></FormControl></FormItem>
        )} />
      </div>
      <FormField control={form.control} name="notes" render={({ field }) => (
        <FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl></FormItem>
      )} />
      <Button type="submit" className="w-full" data-testid="button-submit-apiary">Crear apiario</Button>
    </form></Form>
  );
}

/* ---------- New hive ---------- */
const hiveSchema = z.object({ apiaryId: z.string().min(1), code: z.string().min(1), notes: z.string().optional() });
function NewHiveForm({ onDone }: { onDone: () => void }) {
  const { data: apiaries = [] } = useApiaries();
  const form = useForm<z.infer<typeof hiveSchema>>({
    resolver: zodResolver(hiveSchema),
    defaultValues: { apiaryId: "", code: "", notes: "" },
  });
  const submit = form.handleSubmit(async (v) => {
    try { await queueCreateHive({ apiaryId: v.apiaryId, code: v.code, notes: v.notes }); toast.success("Colmena creada"); form.reset(); onDone(); }
    catch (err) { toast.error("Error", { description: (err as Error).message }); }
  });
  return (
    <Form {...form}><form className="space-y-3" onSubmit={submit}>
      <FormField control={form.control} name="apiaryId" render={({ field }) => (
        <FormItem><FormLabel>Apiario</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl><SelectTrigger data-testid="select-hive-apiary"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
            <SelectContent>{apiaries.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select><FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="code" render={({ field }) => (
        <FormItem><FormLabel>Código</FormLabel><FormControl><Input {...field} placeholder="C-001" data-testid="input-hive-code" /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="notes" render={({ field }) => (
        <FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl></FormItem>
      )} />
      <Button type="submit" className="w-full" data-testid="button-submit-hive">Crear colmena</Button>
    </form></Form>
  );
}

/* ---------- New inspection ---------- */
const inspSchema = z.object({
  hiveId: z.string().min(1),
  inspectedAt: z.string().min(1),
  inspector: z.string().min(1),
  queenSeen: z.boolean().default(false),
  queenStatus: queenStatusSchema,
  colonyStrength: colonyLevelSchema,
  broodLevel: broodLevelSchema,
  honeyStores: honeyLevelSchema,
  pestsOrDisease: z.string().optional(),
  feedingGiven: z.string().optional(),
  treatmentGiven: z.string().optional(),
  inventoryItemId: z.string().optional(),
  quantityUsed: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});
function NewInspectionForm({ onDone }: { onDone: () => void }) {
  const { data: hives = [] } = useHives();
  const { data: inventory = [] } = useInventory();
  const form = useForm<z.infer<typeof inspSchema>>({
    resolver: zodResolver(inspSchema),
    defaultValues: {
      hiveId: "", inspectedAt: new Date().toISOString().slice(0, 16), inspector: "",
      queenSeen: false, queenStatus: "unknown", colonyStrength: "medium",
      broodLevel: "medium", honeyStores: "medium",
    },
  });
  const submit = form.handleSubmit(async (v) => {
    try {
      await queueCreateInspection({
        hiveId: v.hiveId, inspectedAt: new Date(v.inspectedAt).toISOString(), inspector: v.inspector,
        queenSeen: v.queenSeen, queenStatus: v.queenStatus,
        colonyStrength: v.colonyStrength, broodLevel: v.broodLevel, honeyStores: v.honeyStores,
        pestsOrDisease: v.pestsOrDisease || undefined,
        feedingGiven: v.feedingGiven || undefined,
        treatmentGiven: v.treatmentGiven || undefined,
        inventoryItemId: v.inventoryItemId || undefined,
        quantityUsed: v.quantityUsed,
        notes: v.notes || undefined,
      });
      toast.success("Inspección registrada"); form.reset(); onDone();
    } catch (err) { toast.error("Error", { description: (err as Error).message }); }
  });
  return (
    <Form {...form}><form className="space-y-3" onSubmit={submit}>
      <FormField control={form.control} name="hiveId" render={({ field }) => (
        <FormItem><FormLabel>Colmena</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
            <SelectContent>{hives.map((h) => <SelectItem key={h.id} value={h.id}>{h.code}</SelectItem>)}</SelectContent>
          </Select><FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-3">
        <FormField control={form.control} name="inspectedAt" render={({ field }) => (
          <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="inspector" render={({ field }) => (
          <FormItem><FormLabel>Inspector</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
        )} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField control={form.control} name="queenStatus" render={({ field }) => (
          <FormItem><FormLabel>Reina</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="seen">Vista</SelectItem>
                <SelectItem value="not_seen">No vista</SelectItem>
                <SelectItem value="absent">Ausente</SelectItem>
                <SelectItem value="replaced">Reemplazada</SelectItem>
                <SelectItem value="unknown">Desconocido</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="colonyStrength" render={({ field }) => (
          <FormItem><FormLabel>Colonia</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="weak">Débil</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="strong">Fuerte</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField control={form.control} name="broodLevel" render={({ field }) => (
          <FormItem><FormLabel>Cría</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="none">Ninguna</SelectItem><SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem><SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="honeyStores" render={({ field }) => (
          <FormItem><FormLabel>Reservas miel</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="none">Ninguna</SelectItem><SelectItem value="low">Bajas</SelectItem><SelectItem value="medium">Medias</SelectItem><SelectItem value="high">Altas</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <FormField control={form.control} name="queenSeen" render={({ field }) => (
        <FormItem className="flex items-center gap-2 space-y-0">
          <FormControl><Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} /></FormControl>
          <FormLabel className="!mt-0">Reina vista durante la inspección</FormLabel>
        </FormItem>
      )} />
      <FormField control={form.control} name="pestsOrDisease" render={({ field }) => (
        <FormItem><FormLabel>Plagas/enfermedades</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
      )} />
      <div className="grid grid-cols-2 gap-3">
        <FormField control={form.control} name="feedingGiven" render={({ field }) => (
          <FormItem><FormLabel>Alimentación</FormLabel><FormControl><Input placeholder="Jarabe 1:1" {...field} value={field.value ?? ""} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="treatmentGiven" render={({ field }) => (
          <FormItem><FormLabel>Tratamiento</FormLabel><FormControl><Input placeholder="Ácido oxálico" {...field} value={field.value ?? ""} /></FormControl></FormItem>
        )} />
      </div>
      <FormField control={form.control} name="inventoryItemId" render={({ field }) => (
        <FormItem><FormLabel>Insumo (opcional, descuenta stock)</FormLabel>
          <Select value={field.value ?? ""} onValueChange={field.onChange}>
            <FormControl><SelectTrigger><SelectValue placeholder="Sin descuento" /></SelectTrigger></FormControl>
            <SelectContent>{inventory.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.stock} {i.unit})</SelectItem>)}</SelectContent>
          </Select>
        </FormItem>
      )} />
      <FormField control={form.control} name="quantityUsed" render={({ field }) => (
        <FormItem><FormLabel>Cant. usada</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ""} /></FormControl></FormItem>
      )} />
      <FormField control={form.control} name="notes" render={({ field }) => (
        <FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl></FormItem>
      )} />
      <Button type="submit" className="w-full" data-testid="button-submit-inspection">Registrar inspección</Button>
    </form></Form>
  );
}

/* ---------- Honey harvest ---------- */
const honeySchema = z.object({
  apiaryId: z.string().min(1), hiveId: z.string().optional(),
  date: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1),
  destination: z.string().optional(), notes: z.string().optional(),
});
function NewHoneyForm({ onDone }: { onDone: () => void }) {
  const { data: apiaries = [] } = useApiaries();
  const { data: hives = [] } = useHives();
  const form = useForm<z.infer<typeof honeySchema>>({
    resolver: zodResolver(honeySchema),
    defaultValues: { apiaryId: "", date: new Date().toISOString().slice(0, 10), quantity: 0, unit: "kg" },
  });
  const watchApiary = form.watch("apiaryId");
  const submit = form.handleSubmit(async (v) => {
    try {
      await queueCreateHoneyHarvest({
        apiaryId: v.apiaryId,
        hiveId: v.hiveId || undefined,
        date: v.date, quantity: v.quantity, unit: v.unit,
        destination: v.destination || undefined,
        notes: v.notes || undefined,
      });
      toast.success("Cosecha de miel registrada"); form.reset(); onDone();
    } catch (err) { toast.error("Error", { description: (err as Error).message }); }
  });
  return (
    <Form {...form}><form className="space-y-3" onSubmit={submit}>
      <FormField control={form.control} name="apiaryId" render={({ field }) => (
        <FormItem><FormLabel>Apiario</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
            <SelectContent>{apiaries.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select><FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="hiveId" render={({ field }) => (
        <FormItem><FormLabel>Colmena (opcional)</FormLabel>
          <Select value={field.value ?? ""} onValueChange={field.onChange}>
            <FormControl><SelectTrigger><SelectValue placeholder="Cosecha por apiario" /></SelectTrigger></FormControl>
            <SelectContent>
              {hives.filter((h) => h.apiaryId === watchApiary).map((h) => <SelectItem key={h.id} value={h.id}>{h.code}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormItem>
      )} />
      <div className="grid grid-cols-3 gap-3">
        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="quantity" render={({ field }) => (
          <FormItem><FormLabel>Cantidad</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="unit" render={({ field }) => (
          <FormItem><FormLabel>Unidad</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
        )} />
      </div>
      <FormField control={form.control} name="destination" render={({ field }) => (
        <FormItem><FormLabel>Destino</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
      )} />
      <FormField control={form.control} name="notes" render={({ field }) => (
        <FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl></FormItem>
      )} />
      <Button type="submit" className="w-full" data-testid="button-submit-honey">Registrar cosecha</Button>
    </form></Form>
  );
}

const QUEEN_LABEL: Record<string, string> = { seen: "Vista", not_seen: "No vista", absent: "Ausente", replaced: "Reemplazada", unknown: "—" };

export default function BeekeepingPage() {
  const { can } = usePermissions();
  const canWrite = can("inventory:write");
  const { data: apiaries = [] } = useApiaries();
  const { data: hives = [] } = useHives();
  const { data: inspections = [] } = useHiveInspections();
  const { data: honey = [] } = useHoneyHarvests();
  const [openApiary, setOpenApiary] = useState(false);
  const [openHive, setOpenHive] = useState(false);
  const [openInsp, setOpenInsp] = useState(false);
  const [openHoney, setOpenHoney] = useState(false);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="Producción · Apicultura"
        title="Apicultura"
        subtitle="Apiarios, colmenas, inspecciones y cosecha de miel"
        actions={
          canWrite ? (
            <div className="flex gap-2 flex-wrap">
              <QuickCaptureDrawer open={openApiary} onOpenChange={setOpenApiary}
                trigger={<Button size="sm" variant="outline" data-testid="button-new-apiary"><Plus className="h-4 w-4" /> Apiario</Button>}
                title="Nuevo apiario"><NewApiaryForm onDone={() => setOpenApiary(false)} /></QuickCaptureDrawer>
              <QuickCaptureDrawer open={openHive} onOpenChange={setOpenHive}
                trigger={<Button size="sm" variant="outline" data-testid="button-new-hive"><Plus className="h-4 w-4" /> Colmena</Button>}
                title="Nueva colmena"><NewHiveForm onDone={() => setOpenHive(false)} /></QuickCaptureDrawer>
              <QuickCaptureDrawer open={openInsp} onOpenChange={setOpenInsp}
                trigger={<Button size="sm" data-testid="button-new-inspection"><Plus className="h-4 w-4" /> Inspección</Button>}
                title="Inspección de colmena"><NewInspectionForm onDone={() => setOpenInsp(false)} /></QuickCaptureDrawer>
              <QuickCaptureDrawer open={openHoney} onOpenChange={setOpenHoney}
                trigger={<Button size="sm" variant="outline" data-testid="button-new-honey"><Plus className="h-4 w-4" /> Miel</Button>}
                title="Cosecha de miel"><NewHoneyForm onDone={() => setOpenHoney(false)} /></QuickCaptureDrawer>
            </div>
          ) : undefined
        }
      />

      <Tabs defaultValue="hives">
        <TabsList>
          <TabsTrigger value="hives">Colmenas ({hives.length})</TabsTrigger>
          <TabsTrigger value="apiaries">Apiarios ({apiaries.length})</TabsTrigger>
          <TabsTrigger value="inspections">Inspecciones ({inspections.length})</TabsTrigger>
          <TabsTrigger value="honey">Miel ({honey.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="hives" className="mt-4">
          {hives.length === 0 ? <EmptyState title="Sin colmenas" description="Crea un apiario y luego añade colmenas." /> : (
            <div className="grid gap-3 md:grid-cols-2">
              {hives.map((h) => {
                const apiary = apiaries.find((a) => a.id === h.apiaryId);
                const days = h.lastInspectionAt ? Math.floor((Date.now() - Date.parse(h.lastInspectionAt)) / 86_400_000) : null;
                return (
                  <Card key={h.id} data-testid={`card-hive-${h.id}`}>
                    <CardContent className="p-5 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-base font-semibold">{h.code}</p>
                          <p className="text-xs text-muted-foreground">{apiary?.name ?? "—"}</p>
                        </div>
                        {h.queenStatus === "absent" && <Badge variant="destructive">Sin reina</Badge>}
                        {h.colonyStrength === "weak" && <Badge className="bg-status-warn/20 text-status-warn">Débil</Badge>}
                      </div>
                      <div className="text-sm grid grid-cols-2 gap-1">
                        <span>Reina: {QUEEN_LABEL[h.queenStatus]}</span>
                        <span>Colonia: {h.colonyStrength}</span>
                        <span>Cría: {h.broodLevel}</span>
                        <span>Miel: {h.honeyStores}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {h.lastInspectionAt ? `Última inspección hace ${days}d` : "Sin inspecciones"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="apiaries" className="mt-4">
          {apiaries.length === 0 ? <EmptyState title="Sin apiarios" description="Crea un apiario para empezar." /> : (
            <div className="grid gap-3 md:grid-cols-2">
              {apiaries.map((a) => (
                <Card key={a.id} data-testid={`card-apiary-${a.id}`}>
                  <CardContent className="p-5 space-y-1">
                    <p className="text-base font-semibold">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.location}</p>
                    {a.notes && <p className="text-sm">{a.notes}</p>}
                    <p className="text-xs">{hives.filter((h) => h.apiaryId === a.id).length} colmenas</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="inspections" className="mt-4">
          {inspections.length === 0 ? <EmptyState title="Sin inspecciones" /> : (
            <div className="space-y-2">
              {inspections.map((i) => {
                const hive = hives.find((h) => h.id === i.hiveId);
                return (
                  <Card key={i.id} data-testid={`card-insp-${i.id}`}>
                    <CardContent className="p-4 space-y-1">
                      <div className="flex justify-between">
                        <p className="font-semibold">{hive?.code ?? i.hiveId} · {new Date(i.inspectedAt).toLocaleDateString("es-BO")}</p>
                        <p className="text-xs text-muted-foreground">{i.inspector}</p>
                      </div>
                      <p className="text-sm">Reina: {QUEEN_LABEL[i.queenStatus]} · Colonia: {i.colonyStrength} · Cría: {i.broodLevel} · Miel: {i.honeyStores}</p>
                      {i.pestsOrDisease && <p className="text-sm text-status-warn">⚠ {i.pestsOrDisease}</p>}
                      {i.treatmentGiven && <p className="text-xs">Tratamiento: {i.treatmentGiven}</p>}
                      {i.movementId && <p className="text-[10px] text-muted-foreground">Inventario descontado · {i.movementId}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="honey" className="mt-4">
          {honey.length === 0 ? <EmptyState title="Sin cosechas de miel" /> : (
            <div className="space-y-2">
              {honey.map((h) => (
                <Card key={h.id}><CardContent className="p-4 flex justify-between">
                  <div>
                    <p className="font-semibold">{h.quantity} {h.unit}</p>
                    <p className="text-xs text-muted-foreground">{apiaries.find((a) => a.id === h.apiaryId)?.name} · {h.date}</p>
                  </div>
                  {h.destination && <Badge variant="outline">{h.destination}</Badge>}
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
