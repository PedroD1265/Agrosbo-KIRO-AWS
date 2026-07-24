import { ReportTable } from "./ReportTable";
import { ReportFilters } from "./ReportFilters";
import { ExportBar } from "./ExportBar";
import { ReportSectionHeader } from "./ReportSectionHeader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { MetricCard } from "@/shared/ui/MetricCard";
import { useInventoryHarvestReport } from "./useReportData";
import { exportCsv } from "./csvExport";
import type { ReportFilters as Filters } from "./types";
import type { InventoryItem, HarvestLot } from "@shared/schema";
import { Package, Sprout, AlertTriangle, BarChart3 } from "lucide-react";

interface Props {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
}

export function InventarioCosecha({ filters, onFiltersChange }: Props) {
  const d = useInventoryHarvestReport(filters);

  function handleExportInventory() {
    exportCsv<InventoryItem>(d.lowStock, [
      { header: "ID", accessor: (i) => i.id },
      { header: "Nombre", accessor: (i) => i.name },
      { header: "Categoría", accessor: (i) => i.category },
      { header: "Stock actual", accessor: (i) => i.stock },
      { header: "Mínimo", accessor: (i) => i.min },
      { header: "Unidad", accessor: (i) => i.unit },
      { header: "Último movimiento", accessor: (i) => i.lastMovement },
    ], "inventario-bajo.csv");
  }

  function handleExportHarvest() {
    exportCsv<HarvestLot>(d.lots, [
      { header: "Código", accessor: (h) => h.code },
      { header: "Origen", accessor: (h) => h.origin },
      { header: "Tipo origen", accessor: (h) => h.originType },
      { header: "Cultivo", accessor: (h) => h.crop },
      { header: "Variedad", accessor: (h) => h.variety },
      { header: "Fecha", accessor: (h) => h.date },
      { header: "Cantidad", accessor: (h) => h.quantity },
      { header: "Unidad", accessor: (h) => h.unit },
      { header: "Destino", accessor: (h) => h.destination ?? "" },
      { header: "Estado", accessor: (h) => h.status },
    ], "cosecha.csv");
  }

  return (
    <div className="space-y-4">
      <ReportFilters
        filters={filters}
        onChange={onFiltersChange}
        show={{ dateRange: true, scope: true }}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard label="Ítems stock bajo" value={d.lowStock.length} icon={AlertTriangle} tone={d.lowStock.length > 0 ? "critical" : "ok"} hint={d.lowStock.length === 0 ? "Niveles correctos" : "Reponer pronto"} />
        <MetricCard label="Lotes cosecha" value={d.lots.length} icon={Sprout} tone={d.lots.length > 0 ? "primary" : "default"} />
        <MetricCard label="Tipos cultivo/variedad" value={d.byCropList.length} icon={Package} />
      </div>

      <ReportSectionHeader
        title="Inventario con stock bajo"
        description="Insumos que cayeron por debajo del mínimo configurado"
        icon={AlertTriangle}
        tone={d.lowStock.length > 0 ? "critical" : "default"}
        count={d.lowStock.length}
        actions={<ExportBar actions={[{ label: "Inventario", onExport: handleExportInventory, testId: "button-export-inventario", count: d.lowStock.length }]} />}
      />

      <ReportTable<InventoryItem>
        rowKey={(i) => i.id}
        rows={d.lowStock}
        isLoading={d.isLoading}
        columns={[
          { header: "Ítem", accessor: (i) => <span className="font-medium">{i.name}</span> },
          { header: "Categoría", accessor: (i) => <span className="text-muted-foreground">{i.category}</span> },
          { header: "Stock", accessor: (i) => <span className="tabular font-semibold text-status-critical">{i.stock} <span className="font-normal text-muted-foreground">{i.unit}</span></span>, align: "right" },
          { header: "Mínimo", accessor: (i) => <span className="tabular text-muted-foreground">{i.min} {i.unit}</span>, align: "right" },
          { header: "Déficit", accessor: (i) => <StatusBadge status="critical" label={`-${(i.min - i.stock).toFixed(1)} ${i.unit}`} /> },
          { header: "Último mov.", accessor: (i) => <span className="tabular text-muted-foreground">{i.lastMovement}</span> },
        ]}
        emptyMessage="No hay ítems con stock bajo."
      />

      <ReportSectionHeader
        title="Lotes de cosecha recientes"
        description="Trazabilidad de lo producido en el período"
        icon={Sprout}
        tone="primary"
        count={d.lots.length}
        actions={<ExportBar actions={[{ label: "Cosecha", onExport: handleExportHarvest, testId: "button-export-cosecha", count: d.lots.length }]} />}
      />

      <ReportTable<HarvestLot>
        rowKey={(h) => h.id}
        rows={d.lots}
        isLoading={d.isLoading}
        columns={[
          { header: "Código", accessor: (h) => <span className="font-mono text-xs font-semibold">{h.code}</span> },
          { header: "Origen", accessor: (h) => <span className="text-muted-foreground">{h.origin}</span> },
          { header: "Cultivo / Variedad", accessor: (h) => `${h.crop} — ${h.variety}` },
          { header: "Fecha", accessor: (h) => <span className="tabular">{h.date}</span> },
          { header: "Cantidad", accessor: (h) => <span className="tabular font-medium">{h.quantity} <span className="font-normal text-muted-foreground">{h.unit}</span></span>, align: "right" },
          { header: "Destino", accessor: (h) => h.destination ?? <span className="text-muted-foreground">—</span> },
          { header: "Estado", accessor: (h) => <StatusBadge status={h.status} /> },
        ]}
        emptyMessage="Sin lotes de cosecha en el período."
      />

      {d.byCropList.length > 0 && (
        <>
          <ReportSectionHeader
            title="Cosecha agregada por cultivo/variedad"
            description="Volumen total producido agrupado por cultivo"
            icon={BarChart3}
            count={d.byCropList.length}
          />
          <ReportTable
            rowKey={(r) => `${r.crop}-${r.variety}-${r.unit}`}
            rows={d.byCropList}
            columns={[
              { header: "Cultivo", accessor: (r) => <span className="font-medium">{r.crop}</span> },
              { header: "Variedad", accessor: (r) => <span className="text-muted-foreground">{r.variety}</span> },
              { header: "Lotes", accessor: (r) => <span className="tabular">{r.count}</span>, align: "right" },
              { header: "Total", accessor: (r) => <span className="tabular font-semibold">{r.total.toFixed(2)} <span className="font-normal text-muted-foreground">{r.unit}</span></span>, align: "right" },
            ]}
            emptyMessage=""
          />
        </>
      )}
    </div>
  );
}
