import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-center animate-fade-in",
        compact ? "px-5 py-8" : "px-6 py-14",
        className,
      )}
    >
      {Icon && (
        <div className={cn(
          "mb-4 flex items-center justify-center rounded-full bg-primary-soft text-primary",
          compact ? "h-10 w-10" : "h-12 w-12",
        )}>
          <Icon className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
        </div>
      )}
      <p className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>{title}</p>
      {description && (
        <p className={cn("mt-1.5 max-w-md leading-relaxed text-muted-foreground", compact ? "text-xs" : "text-sm")}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

