import { ReportTable } from "./ReportTable";
import { ReportFilters } from "./ReportFilters";
import { ExportBar } from "./ExportBar";
import { ReportSectionHeader } from "./ReportSectionHeader";
import { MetricCard } from "@/shared/ui/MetricCard";
import { useObservationsReport } from "./useReportData";
import { exportCsv } from "./csvExport";
import type { ReportFilters as Filters } from "./types";
import type { Observation } from "@shared/schema";
import { Eye, AlertTriangle, Bug, NotebookPen } from "lucide-react";

interface Props {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
}

const typeLabel: Record<string, string> = {
  note: "Nota",
  incident: "Incidente",
  pest: "Plaga",
  disease: "Enfermedad",
};

const typeTone: Record<string, "default" | "warn" | "critical"> = {
  note: "default",
  incident: "critical",
  pest: "warn",
  disease: "critical",
};

export function ObservacionesExport({ filters, onFiltersChange }: Props) {
  const { observations, isLoading } = useObservationsReport(filters);

  function handleExport() {
    exportCsv<Observation>(observations, [
      { header: "ID", accessor: (o) => o.id },
      { header: "Fecha", accessor: (o) => o.createdAt },
      { header: "Ubicación", accessor: (o) => o.scopeName },
      { header: "Tipo ubicación", accessor: (o) => o.scopeType },
      { header: "Autor", accessor: (o) => o.author },
      { header: "Tipo", accessor: (o) => o.type },
      { header: "Texto", accessor: (o) => o.text },
      { header: "Fotos", accessor: (o) => o.hasPhotos },
    ], "observaciones.csv");
  }

  const incidents = observations.filter((o) => o.type === "incident").length;
  const pests = observations.filter((o) => o.type === "pest" || o.type === "disease").length;

  return (
    <div className="space-y-4">
      <ReportFilters
        filters={filters}
        onChange={onFiltersChange}
        show={{ dateRange: true, scope: true }}
      />

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Total observaciones" value={observations.length} icon={Eye} tone={observations.length > 0 ? "primary" : "default"} />
        <MetricCard label="Incidentes" value={incidents} icon={AlertTriangle} tone={incidents > 0 ? "warn" : "default"} />
        <MetricCard label="Plagas / enfermedades" value={pests} icon={Bug} tone={pests > 0 ? "critical" : "default"} />
      </div>

      <ReportSectionHeader
        title="Detalle de observaciones"
        description="Bitácora completa filtrada por período y ubicación"
        icon={NotebookPen}
        count={observations.length}
        actions={<ExportBar actions={[{ label: "Observaciones", onExport: handleExport, testId: "button-export-observaciones", count: observations.length }]} />}
      />

      <ReportTable<Observation>
        rowKey={(o) => o.id}
        rows={observations}
        isLoading={isLoading}
        columns={[
          { header: "Fecha", accessor: (o) => <span className="tabular text-muted-foreground">{o.createdAt.slice(0, 10)}</span> },
          { header: "Ubicación", accessor: (o) => <span className="font-medium">{o.scopeName}</span> },
          { header: "Autor", accessor: (o) => o.author },
          { header: "Tipo", accessor: (o) => {
            const t = typeTone[o.type] ?? "default";
            const cls =
              t === "critical" ? "bg-status-critical-soft text-status-critical"
              : t === "warn" ? "bg-status-warn-soft text-status-warn"
              : "bg-muted text-muted-foreground";
            return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{typeLabel[o.type] ?? o.type}</span>;
          } },
          { header: "Texto", accessor: (o) => <span className="line-clamp-2 max-w-xs text-muted-foreground">{o.text}</span> },
        ]}
        emptyMessage="Sin observaciones en el período seleccionado."
      />
    </div>
  );
}
