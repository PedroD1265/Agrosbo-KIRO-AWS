import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ListChecks } from "lucide-react";
import { EmptyState } from "@/shared/ui/EmptyState";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { MobileFieldRow } from "@/shared/ui/MobileFieldRow";
import { RowActionsMenu } from "@/shared/ui/RowActionsMenu";
import { queueUpdateTaskStatus } from "@/hooks/data/mutations";
import type { Task } from "@shared/schema";
import {
  PRIORITY_LABEL, STATUS_LABEL,
  isOverdue, nextStatus, statusActionLabel,
} from "./taskUtils";

interface Props {
  items: Task[];
  onDelete: (id: string) => void;
  onEdit: (t: Task) => void;
}

export function TaskMobileList({ items, onDelete, onEdit }: Props) {
  if (items.length === 0)
    return <EmptyState icon={ListChecks} title="Sin tareas en esta vista" compact />;
  return (
    <div className="space-y-2.5">
      {items.map((t) => {
        const next = nextStatus(t.status);
        const overdue = isOverdue(t);
        const accent = overdue ? "critical" : t.priority === "high" ? "warn" : t.status === "in_progress" ? "primary" : "none";
        return (
          <MobileFieldRow
            key={t.id}
            accent={accent as any}
            title={t.title}
            subtitle={`${t.scopeName} · ${t.assignee}`}
            meta={overdue ? `Vencida · ${t.dueDate}` : `Vence ${t.dueDate}`}
            rightTop={
              <div className="flex items-center gap-1">
                <StatusBadge
                  status={t.priority === "high" ? "critical" : t.priority === "med" ? "warn" : "idle"}
                  label={PRIORITY_LABEL[t.priority]}
                />
                <RowActionsMenu testId={`task-${t.id}`} onEdit={() => onEdit(t)} onDelete={() => onDelete(t.id)} />
              </div>
            }
            className={overdue ? "bg-status-critical-soft/30" : ""}
          >
            <div className="flex items-center justify-between gap-2">
              <StatusBadge
                status={t.status === "done" ? "ok" : t.status === "in_progress" ? "warn" : "idle"}
                label={STATUS_LABEL[t.status]}
              />
              {next && (
                <Button
                  size="sm"
                  className="h-9 px-4"
                  variant={overdue ? "default" : "outline"}
                  data-testid={`button-task-advance-${t.id}`}
                  onClick={() => {
                    queueUpdateTaskStatus(t.id, next).catch((err) =>
                      toast.error("No se pudo actualizar", { description: (err as Error).message }),
                    );
                  }}
                >
                  {statusActionLabel(t.status)}
                </Button>
              )}
            </div>
          </MobileFieldRow>
        );
      })}
    </div>
  );
}
