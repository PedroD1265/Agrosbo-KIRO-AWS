import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "ok" | "warn" | "critical" | "primary";
  className?: string;
}

const toneConfig = {
  default: {
    value: "text-foreground",
    iconWrap: "bg-muted text-muted-foreground",
    accent: "before:bg-border",
  },
  ok: {
    value: "text-status-ok",
    iconWrap: "bg-status-ok-soft text-status-ok",
    accent: "before:bg-status-ok",
  },
  warn: {
    value: "text-status-warn",
    iconWrap: "bg-status-warn-soft text-status-warn",
    accent: "before:bg-status-warn",
  },
  critical: {
    value: "text-status-critical",
    iconWrap: "bg-status-critical-soft text-status-critical",
    accent: "before:bg-status-critical",
  },
  primary: {
    value: "text-primary",
    iconWrap: "bg-primary-soft text-primary",
    accent: "before:bg-primary",
  },
};

export function MetricCard({ label, value, hint, icon: Icon, tone = "default", className }: Props) {
  const cfg = toneConfig[tone];
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/60 shadow-card transition-all hover:shadow-elevated",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-[3px]",
        cfg.accent,
        className,
      )}
    >
      <CardContent className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={cn("mt-1.5 text-2xl font-semibold leading-none tabular md:text-3xl", cfg.value)}>{value}</p>
            {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
          </div>
          {Icon && (
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", cfg.iconWrap)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
