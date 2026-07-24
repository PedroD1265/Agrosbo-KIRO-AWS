import { cn } from "@/lib/utils";

export interface TimelineItem {
  id: string;
  title: string;
  meta?: string;
  description?: string;
  tone?: "default" | "ok" | "warn" | "critical";
  badge?: React.ReactNode;
}

const dotTones = {
  default: "bg-muted-foreground/70",
  ok: "bg-status-ok",
  warn: "bg-status-warn",
  critical: "bg-status-critical",
};

const haloTones = {
  default: "ring-muted-foreground/15",
  ok: "ring-status-ok/20",
  warn: "ring-status-warn/20",
  critical: "ring-status-critical/20",
};

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  if (items.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">Sin actividad reciente.</p>;
  }
  return (
    <ol className={cn("relative space-y-5 border-l border-border/70 pl-6", className)}>
      {items.map((it) => {
        const tone = it.tone ?? "default";
        return (
          <li key={it.id} className="relative">
            <span
              className={cn(
                "absolute -left-[28px] top-1.5 h-2.5 w-2.5 rounded-full ring-[5px] ring-offset-0",
                dotTones[tone],
                haloTones[tone],
              )}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug text-foreground">{it.title}</p>
                {it.description && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{it.description}</p>
                )}
                {it.meta && <p className="mt-1.5 text-[11px] uppercase tracking-wide text-muted-foreground/80 tabular">{it.meta}</p>}
              </div>
              {it.badge}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
