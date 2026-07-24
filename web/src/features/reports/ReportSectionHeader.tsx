import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  count?: number;
  className?: string;
  tone?: "default" | "primary" | "warn" | "critical";
}

const toneStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary",
  warn: "bg-status-warn-soft text-status-warn",
  critical: "bg-status-critical-soft text-status-critical",
};

export function ReportSectionHeader({
  title,
  description,
  icon: Icon,
  actions,
  count,
  className,
  tone = "default",
}: Props) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", toneStyles[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold leading-tight text-foreground">{title}</h3>
            {typeof count === "number" && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular text-muted-foreground">
                {count}
              </span>
            )}
          </div>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </div>
  );
}
