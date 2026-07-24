import { MetricCard } from "@/shared/ui/MetricCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, Clock, AlertTriangle, Droplets, Eye, Package, Sprout, Activity } from "lucide-react";
import { useResumenOperativo } from "./useReportData";
import { ReportSectionHeader } from "./ReportSectionHeader";

export function ResumenOperativo() {
  const d = useResumenOperativo();

  if (d.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const attentionCount = d.overdueTasks + d.lowStock + d.scheduledIrrigation;

  return (
    <div className="space-y-5">
      {/* Hero ejecutivo */}
      <Card className="overflow-hidden border-border/60 shadow-card">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/80">
                Estado operativo del campo
              </p>
              <p className="mt-2 text-2xl font-semibold leading-tight md:text-3xl">
                {attentionCount === 0
                  ? "Todo bajo control"
                  : `${attentionCount} ${attentionCount === 1 ? "punto" : "puntos"} requieren atención`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {d.overdueTasks > 0 && `${d.overdueTasks} tarea${d.overdueTasks > 1 ? "s" : ""} vencida${d.overdueTasks > 1 ? "s" : ""}`}
                {d.overdueTasks > 0 && (d.lowStock > 0 || d.scheduledIrrigation > 0) && " · "}
                {d.lowStock > 0 && `${d.lowStock} insumo${d.lowStock > 1 ? "s" : ""} con stock bajo`}
                {d.lowStock > 0 && d.scheduledIrrigation > 0 && " · "}
                {d.scheduledIrrigation > 0 && `${d.scheduledIrrigation} riego${d.scheduledIrrigation > 1 ? "s" : ""} programado${d.scheduledIrrigation > 1 ? "s" : ""}`}
                {attentionCount === 0 && "Sin pendientes críticos en este momento."}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">Snapshot · {new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "long", year: "numeric" })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReportSectionHeader title="Tareas" description="Carga de trabajo y vencimientos" icon={CheckSquare} tone="primary" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Total tareas" value={d.totalTasks} icon={CheckSquare} />
        <MetricCard
          label="Pendientes / En curso"
          value={d.pendingTasks}
          icon={Clock}
          tone={d.pendingTasks > 0 ? "warn" : "ok"}
        />
        <MetricCard
          label="Vencidas"
          value={d.overdueTasks}
          icon={AlertTriangle}
          tone={d.overdueTasks > 0 ? "critical" : "ok"}
          hint={d.overdueTasks > 0 ? "Requieren atención" : "Todo al día"}
        />
      </div>

      <ReportSectionHeader title="Riego" description="Programación y cumplimiento" icon={Droplets} tone="primary" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Programados" value={d.scheduledIrrigation} icon={Droplets} tone={d.scheduledIrrigation > 0 ? "warn" : "default"} />
        <MetricCard label="Completados" value={d.doneIrrigation} icon={Droplets} tone="ok" />
      </div>

      <ReportSectionHeader title="Bitácora y producción" description="Observaciones, stock y cosecha" icon={Eye} tone="primary" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Obs. últimos 7 días" value={d.recentObservations} icon={Eye} />
        <MetricCard
          label="Ítems stock bajo"
          value={d.lowStock}
          icon={Package}
          tone={d.lowStock > 0 ? "critical" : "ok"}
          hint={d.lowStock > 0 ? "Stock < mínimo" : undefined}
        />
        <MetricCard label="Lotes de cosecha" value={d.harvestLotCount} icon={Sprout} />
      </div>
    </div>
  );
}
