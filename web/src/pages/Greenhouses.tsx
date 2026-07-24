import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/shared/ui/PageHeader";
import { FilterBar } from "@/shared/ui/FilterBar";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { StageBadge } from "@/shared/ui/StageBadge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { RowActionsMenu } from "@/shared/ui/RowActionsMenu";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { QuickCaptureDrawer } from "@/shared/ui/QuickCaptureDrawer";
import { GreenhouseForm } from "@/shared/forms/GreenhouseForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Thermometer, Droplet, Plus, Warehouse, AlertTriangle, Ruler } from "lucide-react";
import { MetricCard } from "@/shared/ui/MetricCard";
import { useGreenhouses } from "@/hooks/data";
import { queueDeleteGreenhouse } from "@/hooks/data/mutations";
import type { Greenhouse } from "@shared/schema";

export default function GreenhousesPage() {
  const [q, setQ] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Greenhouse | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data: greenhouses = [] } = useGreenhouses();
  const filtered = greenhouses.filter((g) => [g.name, g.crop].join(" ").toLowerCase().includes(q.toLowerCase()));

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await queueDeleteGreenhouse(deleteId);
      toast.success("Invernadero eliminado");
    } catch (err) {
      toast.error("No se pudo eliminar", { description: (err as Error).message });
    } finally {
      setDeleteId(null);
    }
  };

  const totalArea = greenhouses.reduce((s, g) => s + (g.areaM2 ?? 0), 0);
  const alertCount = greenhouses.reduce((s, g) => s + (g.alerts ?? 0), 0);
  const criticalCount = greenhouses.filter((g) => g.status === "critical").length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operación · Protegidos"
        title="Invernaderos"
        subtitle={`${greenhouses.length} invernaderos en producción`}
        actions={
          <QuickCaptureDrawer
            open={openCreate}
            onOpenChange={setOpenCreate}
            trigger={<Button size="sm" data-testid="button-new-gh"><Plus className="h-4 w-4" /> Nuevo invernadero</Button>}
            title="Nuevo invernadero"
            description="Alta de entorno protegido"
          >
            <GreenhouseForm onDone={() => setOpenCreate(false)} />
          </QuickCaptureDrawer>
        }
      />
      {greenhouses.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Invernaderos" value={greenhouses.length} icon={Warehouse} tone="primary" />
          <MetricCard label="Superficie total" value={`${totalArea} m²`} icon={Ruler} />
          <MetricCard label="Críticos" value={criticalCount} icon={AlertTriangle} tone={criticalCount > 0 ? "critical" : "ok"} />
          <MetricCard label="Alertas activas" value={alertCount} tone={alertCount > 0 ? "warn" : "default"} hint={alertCount === 0 ? "Sin alertas" : "Revisar pronto"} />
        </div>
      )}
      <FilterBar value={q} onValueChange={setQ} placeholder="Buscar invernadero o cultivo…" resultCount={greenhouses.length > 0 ? filtered.length : undefined} />

      {greenhouses.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title="Aún no tienes invernaderos"
          description="Registra tu primer invernadero para llevar control de cultivos protegidos."
          action={<Button size="sm" onClick={() => setOpenCreate(true)} data-testid="button-empty-new-gh"><Plus className="h-4 w-4" /> Crear invernadero</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <div key={g.id} className="relative">
              <Link to={`/greenhouses/${g.id}`} data-testid={`link-greenhouse-${g.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/30">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 pr-8">
                        <p className="text-base font-semibold">{g.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{g.areaM2} m² · {g.crop}{g.variety && ` · ${g.variety}`}</p>
                      </div>
                      <StatusBadge status={g.status} />
                    </div>
                    <div className="mt-4 flex items-center gap-2"><StageBadge stage={g.stage} />{g.alerts > 0 && <StatusBadge status="critical" label={`${g.alerts} alerta`} />}</div>
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground"><Thermometer className="h-3.5 w-3.5" /><span className="tabular">{g.tempC ?? "—"}°C</span></div>
                      <div className="flex items-center gap-1.5 text-muted-foreground"><Droplet className="h-3.5 w-3.5" /><span className="tabular">{g.humidity ?? "—"}% HR</span></div>
                    </div>
                    <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground/70">Datos manuales · sensores no conectados</p>
                  </CardContent>
                </Card>
              </Link>
              <div className="absolute right-2 top-2">
                <RowActionsMenu
                  testId={`gh-${g.id}`}
                  onEdit={() => setEditing(g)}
                  onDelete={() => setDeleteId(g.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <QuickCaptureDrawer
        open={Boolean(editing)}
        onOpenChange={(o) => !o && setEditing(null)}
        trigger={<span />}
        title={editing ? `Editar · ${editing.name}` : "Editar invernadero"}
      >
        {editing && <GreenhouseForm greenhouse={editing} onDone={() => setEditing(null)} />}
      </QuickCaptureDrawer>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="¿Eliminar invernadero?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar invernadero"
        onConfirm={handleDelete}
        testId="delete-gh"
      />
    </div>
  );
}
