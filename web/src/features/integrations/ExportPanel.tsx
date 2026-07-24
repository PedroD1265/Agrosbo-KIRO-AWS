import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownToLine, Clock, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { EXPORT_DATASETS } from "./integrationUtils";

export function ExportPanel() {
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleExport(datasetId: string) {
    setDownloading(datasetId);
    try {
      const res = await fetch(`/api/integrations/export/${datasetId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.href = url;
      a.download = match?.[1] ?? `agro-${datasetId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("CSV descargado", { description: a.download });
    } catch (err) {
      toast.error("No se pudo exportar el CSV", { description: (err as Error).message });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Card className="border-border/60 shadow-card">
      <CardHeader className="border-b border-border/40 pb-4">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <ArrowDownToLine className="h-4 w-4" />
          </div>
          Exportar datos
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Descarga CSV en UTF-8 con todos los registros actuales. Compatible con Excel, Google Sheets y QGIS.
        </p>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {EXPORT_DATASETS.map((ds) => (
            <button
              key={ds.id}
              type="button"
              disabled={downloading === ds.id}
              onClick={() => handleExport(ds.id)}
              data-testid={`button-export-${ds.id}`}
              className={cn(
                "group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5 text-left transition-all",
                "hover:border-primary/40 hover:bg-primary-soft/30 hover:shadow-card",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight truncate">{ds.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{ds.hint}</p>
              </div>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                {downloading === ds.id ? (
                  <Clock className="h-3.5 w-3.5 animate-pulse" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
