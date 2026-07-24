import { Link } from "react-router-dom";
import { ChevronRight, Flag, User2, MapPin, Clock } from "lucide-react";
import type { Task } from "@shared/schema";
import { UrgencyBadge } from "./UrgencyBadge";
import { getDueUrgency } from "./priorityUtils";
import { relativeFromNow } from "./timeUtils";
import { cn } from "@/lib/utils";

const priorityColor: Record<Task["priority"], string> = {
  high: "text-status-critical",
  med: "text-status-warn",
  low: "text-muted-foreground",
};

interface Props {
  task: Task;
  to?: string;
}

export function PriorityTaskRow({ task, to = "/tasks" }: Props) {
  const urgency = getDueUrgency(task.dueDate);
  const due = new Date(task.dueDate);
  const dueLabel = due.toLocaleDateString("es-BO", { day: "2-digit", month: "short" });

  return (
    <Link
      to={to}
      data-testid={`row-task-${task.id}`}
      className={cn(
        "group flex items-stretch gap-0 overflow-hidden rounded-xl border border-border/60 bg-card transition-all",
        "hover:border-primary/40 hover:shadow-card",
        urgency === "overdue" && "border-status-critical/30",
      )}
    >
      <div
        className={cn(
          "w-1 shrink-0",
          urgency === "overdue" && "bg-status-critical",
          urgency === "today" && "bg-status-warn",
          urgency === "soon" && "bg-primary",
          urgency === "later" && "bg-border",
        )}
      />
      <div className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Flag className={cn("h-3.5 w-3.5 shrink-0", priorityColor[task.priority])} />
            <p className="truncate text-sm font-semibold">{task.title}</p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{task.scopeName}</span>
            <span className="inline-flex items-center gap-1"><User2 className="h-3 w-3" />{task.assignee}</span>
            <span className={cn(
              "inline-flex items-center gap-1 tabular",
              urgency === "overdue" && "font-semibold text-status-critical",
            )}>
              <Clock className="h-3 w-3" />
              {urgency === "overdue" ? relativeFromNow(task.dueDate) : dueLabel}
            </span>
          </div>
        </div>
        <UrgencyBadge urgency={urgency} pulse />
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
