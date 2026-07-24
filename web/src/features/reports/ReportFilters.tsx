import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBlocks, useGreenhouses } from "@/hooks/data";
import { defaultFilters, type ReportFilters } from "./types";
import { Calendar, RotateCcw, SlidersHorizontal } from "lucide-react";

interface Props {
  filters: ReportFilters;
  onChange: (f: ReportFilters) => void;
  show?: {
    dateRange?: boolean;
    scope?: boolean;
    status?: boolean;
    assignee?: boolean;
  };
  assignees?: string[];
  statusOptions?: { value: string; label: string }[];
}

function presetRange(days: number): { dateFrom: string; dateTo: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
}

export function ReportFilters({ filters, onChange, show = {}, assignees = [], statusOptions = [] }: Props) {
  const { data: blocks = [] } = useBlocks();
  const { data: greenhouses = [] } = useGreenhouses();

  const { dateRange = true, scope = true, status = false, assignee = false } = show;

  function patch(partial: Partial<ReportFilters>) {
    onChange({ ...filters, ...partial });
  }

  const scopeOptions =
    filters.scopeType === "block"
      ? blocks
      : filters.scopeType === "greenhouse"
        ? greenhouses
        : [...blocks, ...greenhouses];

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros del reporte
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange(defaultFilters())}
          data-testid="filter-reset"
        >
          <RotateCcw className="h-3 w-3" />
          Reiniciar
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 p-4">
        {dateRange && (
          <>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Desde</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => patch({ dateFrom: e.target.value })}
                className="h-9 w-36 text-sm"
                data-testid="filter-date-from"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Hasta</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => patch({ dateTo: e.target.value })}
                className="h-9 w-36 text-sm"
                data-testid="filter-date-to"
              />
            </div>
            <div className="flex items-end gap-1 pb-0.5">
              <Calendar className="mb-1.5 h-3.5 w-3.5 text-muted-foreground" />
              {[
                { label: "7d", days: 7 },
                { label: "30d", days: 30 },
                { label: "90d", days: 90 },
              ].map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => patch(presetRange(p.days))}
                  data-testid={`filter-preset-${p.label}`}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </>
        )}

        {scope && (
          <>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Tipo</Label>
              <Select
                value={filters.scopeType}
                onValueChange={(v) => patch({ scopeType: v as ReportFilters["scopeType"], scopeId: "all" })}
              >
                <SelectTrigger className="h-9 w-36 text-sm" data-testid="filter-scope-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="block">Bloques</SelectItem>
                  <SelectItem value="greenhouse">Invernaderos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filters.scopeType !== "all" && (
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Ubicación</Label>
                <Select value={filters.scopeId} onValueChange={(v) => patch({ scopeId: v })}>
                  <SelectTrigger className="h-9 w-44 text-sm" data-testid="filter-scope-id">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {scopeOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        {status && statusOptions.length > 0 && (
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Estado</Label>
            <Select value={filters.status} onValueChange={(v) => patch({ status: v })}>
              <SelectTrigger className="h-9 w-36 text-sm" data-testid="filter-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {statusOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {assignee && assignees.length > 0 && (
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Responsable</Label>
            <Select value={filters.assignee} onValueChange={(v) => patch({ assignee: v })}>
              <SelectTrigger className="h-9 w-40 text-sm" data-testid="filter-assignee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {assignees.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
