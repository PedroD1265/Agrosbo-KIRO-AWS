import { StatusBadge } from "@/shared/ui/StatusBadge";
import { ReportTable } from "./ReportTable";
import { ExportBar } from "./ExportBar";
import { ReportSectionHeader } from "./ReportSectionHeader";
import { useBlockReport } from "./useReportData";
import { exportCsv } from "./csvExport";
import { LayoutGrid } from "lucide-react";

type Row = ReturnType<typeof useBlockReport>["rows"][number];

export function ReportePorBloque() {
  const { rows, isLoading } = useBlockReport();

  function handleExport() {
    exportCsv(rows, [
      { header: "Bloque", accessor: (r) => r.block.name },
      { header: "Finca", accessor: (r) => r.block.farm },
      { header: "Cultivo", accessor: (r) => r.block.crop },
      { header: "Variedad", accessor: (r) => r.block.variety ?? "" },
      { header: "Etapa", accessor: (r) => r.block.stage },
      { header: "Campaña activa", accessor: (r) => r.activeCampaign ? `${r.activeCampaign.crop} (${r.activeCampaign.variety})` : "" },
      { header: "Tareas abiertas", accessor: (r) => r.openTasks },
      { header: "Último riego", accessor: (r) => r.lastIrrigationDate },
      { header: "Observaciones", accessor: (r) => r.observations },
      { header: "Lotes cosecha", accessor: (r) => r.harvestLots },
      { header: "Estado", accessor: (r) => r.block.status },
    ], "reporte-bloques.csv");
  }

  return (
    <div className="space-y-4">
      <ReportSectionHeader
        title="Estado consolidado por bloque"
        description="Campaña, tareas, riego y producción por parcela"
        icon={LayoutGrid}
        tone="primary"
        count={rows.length}
        actions={<ExportBar actions={[{ label: "Bloques", onExport: handleExport, testId: "button-export-bloques", count: rows.length }]} />}
      />
      <ReportTable<Row>
        rowKey={(r) => r.block.id}
        isLoading={isLoading}
        rows={rows}
        columns={[
          { header: "Bloque", accessor: (r) => <span className="font-medium">{r.block.name}</span> },
          { header: "Campaña activa", accessor: (r) => r.activeCampaign ? `${r.activeCampaign.crop} — ${r.activeCampaign.variety}` : <span className="text-muted-foreground">—</span> },
          { header: "Tareas abiertas", accessor: (r) => <span className={`tabular ${r.openTasks > 0 ? "font-semibold text-status-warn" : "text-muted-foreground"}`}>{r.openTasks}</span>, align: "right" },
          { header: "Último riego", accessor: (r) => <span className="tabular text-muted-foreground">{r.lastIrrigationDate}</span> },
          { header: "Observaciones", accessor: (r) => <span className="tabular">{r.observations}</span>, align: "right" },
          { header: "Lotes cosecha", accessor: (r) => <span className="tabular">{r.harvestLots}</span>, align: "right" },
          { header: "Estado", accessor: (r) => <StatusBadge status={r.block.status} /> },
        ]}
        emptyMessage="No hay bloques registrados."
      />
    </div>
  );
}
