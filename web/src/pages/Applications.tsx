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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  useApplications, useBlocks, useGreenhouses, useCampaigns, useInventory,
} from "@/hooks/data";
import { queueCreateApplication } from "@/hooks/data/mutations";
import { applicationTypeSchema, type ScopeType } from "@shared/schema";

const formSchema = z.object({
  scopeRef: z.string().min(1, "Selecciona destino"),
  campaignId: z.string().optional(),
  applicationType: applicationTypeSchema,
  productName: z.string().min(2, "Producto requerido"),
  inventoryItemId: z.string().optional(),
  dose: z.coerce.number().nonnegative().optional(),
  doseUnit: z.string().optional(),
  quantityUsed: z.coerce.number().nonnegative().optional(),
  method: z.string().optional(),
  appliedAt: z.string().min(1),
  responsible: z.string().min(1),
  targetProblem: z.string().optional(),
  preHarvestIntervalDays: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const TYPE_LABEL: Record<string, string> = {
  fertilizer: "Fertilizante", pesticide: "Plaguicida", fungicide: "Fungicida",
  herbicide: "Herbicida", biological: "Biológico", other: "Otro",
};

function NewAppForm({ onDone }: { onDone: () => void }) {
  const { data: blocks = [] } = useBlocks();
  const { data: greenhouses = [] } = useGreenhouses();
  const { data: campaigns = [] } = useCampaigns();
  const { data: inventory = [] } = useInventory();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scopeRef: "", applicationType: "fertilizer", productName: "",
      appliedAt: new Date().toISOString().slice(0, 16), responsible: "",
    },
  });
  const submit = form.handleSubmit(async (v) => {
    const [scopeType, scopeId] = v.scopeRef.split(":") as [ScopeType, string];
    try {
      await queueCreateApplication({
        scopeType, scopeId,
        campaignId: v.campaignId || undefined,
        applicationType: v.applicationType,
        productName: v.productName,
        inventoryItemId: v.inventoryItemId || undefined,
        dose: v.dose, doseUnit: v.doseUnit || undefined,
        quantityUsed: v.quantityUsed,
        method: v.method || undefined,
        appliedAt: new Date(v.appliedAt).toISOString(),
        responsible: v.responsible,
        targetProblem: v.targetProblem || undefined,
        preHarvestIntervalDays: v.preHarvestIntervalDays,
        notes: v.notes || undefined,
      });
      toast.success("Aplicación registrada", {
        description: navigator.onLine ? "Sincronizando…" : "Encolada offline.",
      });
      form.reset();
      onDone();
    } catch (err) {
      toast.error("No se pudo registrar", { description: (err as Error).message });
    }
  });
  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormField control={form.control} name="scopeRef" render={({ field }) => (
          <FormItem><FormLabel>Bloque o invernadero</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl><SelectTrigger data-testid="select-app-scope"><SelectValue placeholder="Seleccionar…" /></SelectTrigger></FormControl>
              <SelectContent>
                {blocks.map((b) => <SelectItem key={b.id} value={`block:${b.id}`}>{b.name}</SelectItem>)}
                {greenhouses.map((g) => <SelectItem key={g.id} value={`greenhouse:${g.id}`}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="campaignId" render={({ field }) => (
          <FormItem><FormLabel>Campaña (opcional)</FormLabel>
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <FormControl><SelectTrigger><SelectValue placeholder="Sin campaña" /></SelectTrigger></FormControl>
              <SelectContent>
                {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.scopeName} · {c.crop}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="applicationType" render={({ field }) => (
            <FormItem><FormLabel>Tipo</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {Object.entries(TYPE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select><FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="productName" render={({ field }) => (
            <FormItem><FormLabel>Producto</FormLabel><FormControl><Input {...field} data-testid="input-app-product" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="inventoryItemId" render={({ field }) => (
          <FormItem><FormLabel>Insumo del inventario (opcional, descuenta stock)</FormLabel>
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <FormControl><SelectTrigger><SelectValue placeholder="Sin descuento de inventario" /></SelectTrigger></FormControl>
              <SelectContent>
                {inventory.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.stock} {i.unit})</SelectItem>)}
              </SelectContent>
            </Select>
          </FormItem>
        )} />
        <div className="grid grid-cols-3 gap-3">
          <FormField control={form.control} name="dose" render={({ field }) => (
            <FormItem><FormLabel>Dosis</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ""} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="doseUnit" render={({ field }) => (
            <FormItem><FormLabel>Unidad dosis</FormLabel><FormControl><Input placeholder="ml/L" {...field} value={field.value ?? ""} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="quantityUsed" render={({ field }) => (
            <FormItem><FormLabel>Cant. usada</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ""} /></FormControl></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="appliedAt" render={({ field }) => (
            <FormItem><FormLabel>Fecha y hora</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="responsible" render={({ field }) => (
            <FormItem><FormLabel>Responsable</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="targetProblem" render={({ field }) => (
            <FormItem><FormLabel>Objetivo / problema</FormLabel><FormControl><Input placeholder="Tizón, mosca, etc." {...field} value={field.value ?? ""} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="preHarvestIntervalDays" render={({ field }) => (
            <FormItem><FormLabel>Carencia (días)</FormLabel><FormControl><Input type="number" min={0} {...field} value={field.value ?? ""} data-testid="input-app-phi" /></FormControl></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="method" render={({ field }) => (
          <FormItem><FormLabel>Método (opcional)</FormLabel><FormControl><Input placeholder="Foliar / drench" {...field} value={field.value ?? ""} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl></FormItem>
        )} />
        <Button type="submit" className="w-full" data-testid="button-submit-app">Registrar aplicación</Button>
      </form>
    </Form>
  );
}

function fmtDateTime(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("es-BO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ApplicationsPage() {
  const { can } = usePermissions();
  const canWrite = can("applications:write");
  const { data: applications = [] } = useApplications();
  const [open, setOpen] = useState(false);
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="Producción · Trazabilidad"
        title="Aplicaciones"
        subtitle="Registro de fitosanitarios, fertilizantes y tratamientos"
        actions={
          canWrite && (
            <QuickCaptureDrawer
              open={open} onOpenChange={setOpen}
              trigger={<Button size="sm" data-testid="button-new-app"><Plus className="h-4 w-4" /> Nueva aplicación</Button>}
              title="Registrar aplicación"
              description="Producto, dosis, responsable y carencia"
            >
              <NewAppForm onDone={() => setOpen(false)} />
            </QuickCaptureDrawer>
          )
        }
      />
      {applications.length === 0 ? (
        <EmptyState title="Sin aplicaciones registradas" description="Registra fertilizantes, fungicidas u otros tratamientos." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {applications.map((a) => {
            const carencia = a.safeHarvestDate && a.safeHarvestDate >= todayIso;
            return (
              <Card key={a.id} data-testid={`card-app-${a.id}`}>
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-semibold">{a.productName}</p>
                      <p className="text-xs text-muted-foreground">{a.scopeName} · {fmtDateTime(a.appliedAt)} · {a.responsible}</p>
                    </div>
                    <Badge variant="outline">{TYPE_LABEL[a.applicationType] ?? a.applicationType}</Badge>
                  </div>
                  <p className="text-sm">
                    {a.dose != null && `Dosis: ${a.dose} ${a.doseUnit ?? ""}`}
                    {a.quantityUsed != null && ` · Usado: ${a.quantityUsed}`}
                    {a.method && ` · ${a.method}`}
                  </p>
                  {a.targetProblem && <p className="text-xs text-muted-foreground">Objetivo: {a.targetProblem}</p>}
                  {carencia && (
                    <Badge className="bg-status-warn/20 text-status-warn">
                      Carencia hasta {a.safeHarvestDate}
                    </Badge>
                  )}
                  {a.movementId && <p className="text-[10px] text-muted-foreground">Inventario descontado · mov {a.movementId}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
