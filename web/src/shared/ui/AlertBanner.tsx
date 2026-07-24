import { cn } from "@/lib/utils";
import { AlertTriangle, Info, AlertCircle, CheckCircle2 } from "lucide-react";

interface Props {
  level?: "ok" | "info" | "warn" | "critical";
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const config = {
  ok: {
    icon: CheckCircle2,
    cls: "bg-status-ok-soft border-status-ok/30",
    iconCls: "text-status-ok",
    titleCls: "text-status-ok",
  },
  info: {
    icon: Info,
    cls: "bg-status-sync-soft border-status-sync/30",
    iconCls: "text-status-sync",
    titleCls: "text-status-sync",
  },
  warn: {
    icon: AlertTriangle,
    cls: "bg-status-warn-soft border-status-warn/40",
    iconCls: "text-status-warn",
    titleCls: "text-status-warn",
  },
  critical: {
    icon: AlertCircle,
    cls: "bg-status-critical-soft border-status-critical/40",
    iconCls: "text-status-critical",
    titleCls: "text-status-critical",
  },
};

export function AlertBanner({ level = "info", title, description, action, className }: Props) {
  const { icon: Icon, cls, iconCls, titleCls } = config[level];
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 shadow-card animate-fade-in",
        cls,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconCls)} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold leading-tight", titleCls)}>{title}</p>
        {description && <p className="mt-1 text-xs leading-relaxed text-foreground/80">{description}</p>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
