import { StatusBadge } from "@/shared/ui/StatusBadge";
import { ReportTable } from "./ReportTable";
import { ExportBar } from "./ExportBar";
import { ReportSectionHeader } from "./ReportSectionHeader";
import { useGreenhouseReport } from "./useReportData";
import { exportCsv } from "./csvExport";
import { Warehouse } from "lucide-react";

type Row = ReturnType<typeof useGreenhouseReport>["rows"][number];

export function ReportePorInvernadero() {
  const { rows, isLoading } = useGreenhouseReport();

  function handleExport() {
    exportCsv(rows, [
      { header: "Invernadero", accessor: (r) => r.greenhouse.name },
      { header: "Área (m²)", accessor: (r) => r.greenhouse.areaM2 },
      { header: "Cultivo", accessor: (r) => r.greenhouse.crop },
      { header: "Variedad", accessor: (r) => r.greenhouse.variety ?? "" },
      { header: "Etapa", accessor: (r) => r.greenhouse.stage },
      { header: "Campaña activa", accessor: (r) => r.activeCampaign ? `${r.activeCampaign.crop} (${r.activeCampaign.variety})` : "" },
      { header: "Tareas abiertas", accessor: (r) => r.openTasks },
      { header: "Último riego", accessor: (r) => r.lastIrrigationDate },
      { header: "Observaciones", accessor: (r) => r.observations },
      { header: "Lotes cosecha", accessor: (r) => r.harvestLots },
      { header: "Estado", accessor: (r) => r.greenhouse.status },
      { header: "Temp (°C)", accessor: (r) => r.greenhouse.tempC ?? "" },
      { header: "Humedad (%)", accessor: (r) => r.greenhouse.humidity ?? "" },
    ], "reporte-invernaderos.csv");
  }

  return (
    <div className="space-y-4">
      <ReportSectionHeader
        title="Estado consolidado por invernadero"
        description="Condiciones, campaña y operación por entorno protegido"
        icon={Warehouse}
        tone="primary"
        count={rows.length}
        actions={<ExportBar actions={[{ label: "Invernaderos", onExport: handleExport, testId: "button-export-invernaderos", count: rows.length }]} />}
      />
      <ReportTable<Row>
        rowKey={(r) => r.greenhouse.id}
        isLoading={isLoading}
        rows={rows}
        columns={[
          { header: "Invernadero", accessor: (r) => <span className="font-medium">{r.greenhouse.name}</span> },
          { header: "Campaña activa", accessor: (r) => r.activeCampaign ? `${r.activeCampaign.crop} — ${r.activeCampaign.variety}` : <span className="text-muted-foreground">—</span> },
          { header: "Tareas abiertas", accessor: (r) => <span className={`tabular ${r.openTasks > 0 ? "font-semibold text-status-warn" : "text-muted-foreground"}`}>{r.openTasks}</span>, align: "right" },
          { header: "Último riego", accessor: (r) => <span className="tabular text-muted-foreground">{r.lastIrrigationDate}</span> },
          { header: "Observaciones", accessor: (r) => <span className="tabular">{r.observations}</span>, align: "right" },
          { header: "Lotes cosecha", accessor: (r) => <span className="tabular">{r.harvestLots}</span>, align: "right" },
          { header: "Temp / Hum", accessor: (r) => <span className="tabular text-muted-foreground">{r.greenhouse.tempC != null ? `${r.greenhouse.tempC}°C / ${r.greenhouse.humidity ?? "—"}%` : "—"}</span> },
          { header: "Estado", accessor: (r) => <StatusBadge status={r.greenhouse.status} /> },
        ]}
        emptyMessage="No hay invernaderos registrados."
      />
    </div>
  );
}
