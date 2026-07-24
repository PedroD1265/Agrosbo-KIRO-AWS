import { Link } from "react-router-dom";
import { Droplets, Clock, Timer } from "lucide-react";
import type { IrrigationEvent } from "@shared/schema";
import { UrgencyBadge } from "./UrgencyBadge";
import { getIrrigationUrgency } from "./priorityUtils";
import { relativeFromNow } from "./timeUtils";
import { cn } from "@/lib/utils";

interface Props {
  event: IrrigationEvent;
  to?: string;
}

export function IrrigationRow({ event, to = "/irrigation" }: Props) {
  const urgency = getIrrigationUrgency(event.scheduledAt);
  const d = new Date(event.scheduledAt);
  const time = d.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
  const date = d.toLocaleDateString("es-BO", { day: "2-digit", month: "short" });

  return (
    <Link
      to={to}
      data-testid={`row-irrigation-${event.id}`}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3.5 py-3 transition-all",
        "hover:border-primary/40 hover:shadow-card",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          urgency === "overdue"
            ? "bg-status-critical-soft text-status-critical"
            : "bg-status-pending-sync-soft text-status-pending-sync",
        )}
      >
        <Droplets className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{event.scopeName}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{date} · {time}</span>
          <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" />{event.durationMin} min</span>
          {event.responsible && <span className="truncate">· {event.responsible}</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <UrgencyBadge urgency={urgency} pulse />
        <span className={cn(
          "text-[10px] tabular",
          urgency === "overdue" ? "font-semibold text-status-critical" : "text-muted-foreground",
        )}>
          {relativeFromNow(event.scheduledAt)}
        </span>
      </div>
    </Link>
  );
}
