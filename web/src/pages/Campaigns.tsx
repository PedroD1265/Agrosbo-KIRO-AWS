import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/shared/ui/PageHeader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { StageBadge } from "@/shared/ui/StageBadge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { QuickCaptureDrawer } from "@/shared/ui/QuickCaptureDrawer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RowActionsMenu } from "@/shared/ui/RowActionsMenu";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Plus, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useBlocks, useGreenhouses, useCampaigns } from "@/hooks/data";
import { queueCreateCampaign, queueUpdateCampaign, queueDeleteCampaign } from "@/hooks/data/mutations";
import { cropStageSchema, operationalStatusSchema, type Campaign, type ScopeType } from "@shared/schema";

const formSchema = z.object({
  scopeRef: z.string().min(1, "Selecciona destino"),
  crop: z.string().min(2, "Requerido"),
  variety: z.string().min(1, "Requerido"),
  startDate: z.string().min(1, "Requerido"),
  endDate: z.string().min(1, "Requerido"),
  stage: cropStageSchema,
  progress: z.coerce.number().int().min(0).max(100),
});
type FormValues = z.infer<typeof formSchema>;

function NewCampaignForm({ onDone }: { onDone: () => void }) {
  const { data: blocks = [] } = useBlocks();
  const { data: greenhouses = [] } = useGreenhouses();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scopeRef: "",
      crop: "",
      variety: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      stage: "seed",
      progress: 0,
    },
  });

  const submit = form.handleSubmit(async (values) => {
    const [scopeType, scopeId] = values.scopeRef.split(":") as [ScopeType, string];
    try {
      await queueCreateCampaign({
        scopeType,
        scopeId,
        crop: values.crop,
        variety: values.variety,
        startDate: values.startDate,
        endDate: values.endDate,
        stage: values.stage,
        progress: values.progress,
        status: "ok",
      });
      toast.success("Campaña creada", {
        description: navigator.onLine ? "Sincronizando…" : "Encolada offline.",
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
        <FormField control={form.control} name="scopeRef" render={({ field }) => (
          <FormItem><FormLabel>Bloque o invernadero</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl><SelectTrigger data-testid="select-camp-scope"><SelectValue placeholder="Seleccionar…" /></SelectTrigger></FormControl>
              <SelectContent>
                {blocks.map((b) => <SelectItem key={b.id} value={`block:${b.id}`}>{b.name}</SelectItem>)}
                {greenhouses.map((g) => <SelectItem key={g.id} value={`greenhouse:${g.id}`}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="crop" render={({ field }) => (
            <FormItem><FormLabel>Cultivo</FormLabel><FormControl><Input {...field} data-testid="input-camp-crop" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="variety" render={({ field }) => (
            <FormItem><FormLabel>Variedad</FormLabel><FormControl><Input {...field} data-testid="input-camp-variety" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="startDate" render={({ field }) => (
            <FormItem><FormLabel>Inicio</FormLabel><FormControl><Input type="date" {...field} data-testid="input-camp-start" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="endDate" render={({ field }) => (
            <FormItem><FormLabel>Fin estimado</FormLabel><FormControl><Input type="date" {...field} data-testid="input-camp-end" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="stage" render={({ field }) => (
            <FormItem><FormLabel>Etapa</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger data-testid="select-camp-stage"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="seed">Semilla</SelectItem>
                  <SelectItem value="veg">Vegetativo</SelectItem>
                  <SelectItem value="flower">Floración</SelectItem>
                  <SelectItem value="harvest">Cosecha</SelectItem>
                </SelectContent>
              </Select><FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="progress" render={({ field }) => (
            <FormItem><FormLabel>Progreso (%)</FormLabel><FormControl><Input type="number" min={0} max={100} {...field} data-testid="input-camp-progress" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <Button type="submit" className="w-full" data-testid="button-submit-camp">Crear campaña</Button>
      </form>
    </Form>
  );
}

const editSchema = z.object({
  stage: cropStageSchema,
  status: operationalStatusSchema,
  progress: z.coerce.number().int().min(0).max(100),
  endDate: z.string().min(1, "Requerido"),
});
type EditValues = z.infer<typeof editSchema>;

function EditCampaignForm({ camp, onDone }: { camp: Campaign; onDone: () => void }) {
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      stage: camp.stage,
      status: camp.status,
      progress: camp.progress,
      endDate: camp.endDate,
    },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await queueUpdateCampaign(camp.id, values);
      toast.success("Campaña actualizada");
      onDone();
    } catch (err) {
      toast.error("No se pudo actualizar", { description: (err as Error).message });
    }
  });
  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="stage" render={({ field }) => (
            <FormItem><FormLabel>Etapa</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger data-testid="select-camp-edit-stage"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="seed">Semilla</SelectItem>
                  <SelectItem value="veg">Vegetativo</SelectItem>
                  <SelectItem value="flower">Floración</SelectItem>
                  <SelectItem value="harvest">Cosecha</SelectItem>
                </SelectContent>
              </Select><FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem><FormLabel>Estado</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger data-testid="select-camp-edit-status"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="ok">Normal</SelectItem>
                  <SelectItem value="warn">Atención</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="idle">Inactivo</SelectItem>
                  <SelectItem value="pending-sync">Pend. sync</SelectItem>
                </SelectContent>
              </Select><FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="progress" render={({ field }) => (
            <FormItem><FormLabel>Progreso (%)</FormLabel><FormControl><Input type="number" min={0} max={100} {...field} data-testid="input-camp-edit-progress" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="endDate" render={({ field }) => (
            <FormItem><FormLabel>Fin estimado</FormLabel><FormControl><Input type="date" {...field} data-testid="input-camp-edit-end" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <Button type="submit" className="w-full" data-testid="button-submit-camp-edit">Guardar cambios</Button>
      </form>
    </Form>
  );
}

function fmtDate(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime())
    ? s
    : d.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

function progressBarTone(status: Campaign["status"]) {
  if (status === "critical") return "bg-status-critical";
  if (status === "warn") return "bg-status-warn";
  if (status === "idle") return "bg-status-idle";
  return "bg-primary";
}

export default function CampaignsPage() {
  const { data: campaigns = [] } = useCampaigns();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCamp, setEditCamp] = useState<Campaign | null>(null);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="Estructura · Ciclos"
        title="Campañas"
        subtitle="Ciclos productivos por bloque e invernadero"
        actions={
          <QuickCaptureDrawer
            open={open}
            onOpenChange={setOpen}
            trigger={<Button size="sm" data-testid="button-new-camp"><Plus className="h-4 w-4" /> Nueva campaña</Button>}
            title="Nueva campaña"
            description="Define un ciclo productivo"
          >
            <NewCampaignForm onDone={() => setOpen(false)} />
          </QuickCaptureDrawer>
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState
          title="Sin campañas activas"
          description="Crea una campaña para iniciar el ciclo productivo de un bloque o invernadero."
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Crear campaña
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {campaigns.map((c) => (
            <Card
              key={c.id}
              data-testid={`card-camp-${c.id}`}
              className="shadow-card transition-all hover:shadow-elevated"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-semibold">{c.scopeName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.crop} · {c.variety} · {c.scopeType === "block" ? "Bloque" : "Invernadero"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={c.status} />
                    <Button asChild variant="ghost" size="sm" data-testid={`button-camp-detail-${c.id}`}>
                      <Link to={`/campaigns/${c.id}`}>Detalle <ArrowRight className="ml-1 h-3 w-3" /></Link>
                    </Button>
                    <RowActionsMenu testId={`camp-${c.id}`} onEdit={() => setEditCamp(c)} onDelete={() => setDeleteId(c.id)} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StageBadge stage={c.stage} />
                  <span className="text-xs text-muted-foreground tabular">
                    {fmtDate(c.startDate)} → {fmtDate(c.endDate)}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-semibold tabular">{c.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${progressBarTone(c.status)}`}
                      style={{ width: `${c.progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <QuickCaptureDrawer
        open={Boolean(editCamp)}
        onOpenChange={(o) => !o && setEditCamp(null)}
        trigger={<span />}
        title={editCamp ? `Editar · ${editCamp.scopeName}` : "Editar campaña"}
        description="Actualiza etapa, estado, progreso o fecha de cierre"
      >
        {editCamp && <EditCampaignForm camp={editCamp} onDone={() => setEditCamp(null)} />}
      </QuickCaptureDrawer>
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="¿Eliminar campaña?"
        description="Esta acción no se puede deshacer."
        onConfirm={async () => {
          if (!deleteId) return;
          try {
            await queueDeleteCampaign(deleteId);
            toast.success("Campaña eliminada");
          } catch (err) {
            toast.error("No se pudo eliminar", { description: (err as Error).message });
          } finally {
            setDeleteId(null);
          }
        }}
        testId="delete-camp"
      />
    </div>
  );
}
