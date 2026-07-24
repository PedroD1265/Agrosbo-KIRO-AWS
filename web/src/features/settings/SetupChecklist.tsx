import { Link } from "react-router-dom";
import { Check, ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SetupItem {
  id: string;
  label: string;
  description: string;
  done: boolean;
  to: string;
  icon: LucideIcon;
}

interface Props {
  items: SetupItem[];
  className?: string;
}

/**
 * Persistent setup checklist for Settings — derived from real data
 * (no fake state). Always visible so the operator sees configuration health.
 */
export function SetupChecklist({ items, className }: Props) {
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = done === total;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-card",
        allDone ? "border-status-ok/30" : "border-primary/15",
        className,
      )}
      data-testid="setup-checklist"
    >
      <div
        className={cn(
          "flex items-center justify-between gap-4 px-5 py-4",
          allDone ? "bg-status-ok-soft/40" : "bg-primary-soft/40",
        )}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Estado de configuración
          </p>
          <p className="mt-1 text-base font-semibold leading-tight">
            {allDone
              ? "Todo listo para operar"
              : `${done} de ${total} pasos completos`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {allDone
              ? "Tu operación tiene los datos base necesarios para usar el workboard a fondo."
              : "Completa los datos base para que Today, riegos y reportes muestren información real."}
          </p>
        </div>
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular",
            allDone
              ? "bg-status-ok text-primary-foreground"
              : "bg-primary text-primary-foreground",
          )}
          aria-label={`${pct}% configurado`}
        >
          {allDone ? <Check className="h-5 w-5" /> : `${pct}%`}
        </div>
      </div>

      <div className="h-1 w-full bg-muted">
        <div
          className={cn(
            "h-full transition-all",
            allDone ? "bg-status-ok" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="divide-y divide-border/60">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <li key={it.id}>
              <Link
                to={it.to}
                data-testid={`setup-step-${it.id}`}
                className={cn(
                  "group flex items-center gap-3 px-5 py-3 transition-colors",
                  it.done ? "hover:bg-muted/40" : "hover:bg-primary-soft/30",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    it.done
                      ? "bg-status-ok-soft text-status-ok"
                      : "bg-card text-muted-foreground ring-1 ring-border",
                  )}
                >
                  {it.done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    it.done ? "text-muted-foreground" : "text-primary",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium leading-tight",
                      it.done && "text-muted-foreground line-through",
                    )}
                  >
                    {it.label}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {it.description}
                  </p>
                </div>
                {!it.done && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
