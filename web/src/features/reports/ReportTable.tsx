import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/shared/ui/EmptyState";
import { FileSearch } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  rowKey: (row: T) => string;
  dense?: boolean;
}

export function ReportTable<T>({ columns, rows, isLoading, emptyMessage, rowKey, dense }: Props<T>) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden p-3">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="p-2">
        <EmptyState
          icon={FileSearch}
          title="Sin resultados"
          description={emptyMessage ?? "No hay datos para los filtros seleccionados."}
          compact
        />
      </Card>
    );
  }

  const alignClass = (a?: "left" | "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
              {columns.map((col) => (
                <TableHead
                  key={col.header}
                  className={cn(
                    "h-10 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                    alignClass(col.align),
                    col.className,
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow
                key={rowKey(row)}
                className={cn(
                  "border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors",
                  idx % 2 === 1 && "bg-muted/10",
                )}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.header}
                    className={cn(
                      dense ? "py-2" : "py-3",
                      "px-4 text-sm",
                      alignClass(col.align),
                      col.className,
                    )}
                  >
                    {col.accessor(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
