import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Sparkles, ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingStep {
  id: string;
  label: string;
  done: boolean;
  to: string;
  icon?: LucideIcon;
}

interface Props {
  storageKey?: string;
  title?: string;
  steps: OnboardingStep[];
  className?: string;
}

/**
 * Hint persistente de primer-uso: muestra próximos pasos según el estado real
 * de los datos (steps.done) y se puede descartar. Puramente UI; no toca data.
 */
export function OnboardingHints({
  storageKey = "agrosbo:onboarding:dismissed",
  title = "Configura tu operación",
  steps,
  className,
}: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      // ignore
    }
  }, [storageKey]);

  const remaining = steps.filter((s) => !s.done);
  if (dismissed || remaining.length === 0) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/15 bg-primary-soft/40 p-4 md:p-5 animate-fade-in",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">
              {remaining.length} {remaining.length === 1 ? "paso recomendado" : "pasos recomendados"} para arrancar
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded-md p-1 text-muted-foreground hover:bg-background/60 hover:text-foreground"
          aria-label="Descartar guía"
          data-testid="button-dismiss-onboarding"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ol className="grid gap-2 md:grid-cols-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.id}>
              <Link
                to={s.to}
                data-testid={`onboarding-step-${s.id}`}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-all",
                  s.done
                    ? "border-status-ok/30 opacity-70"
                    : "border-border/60 hover:border-primary/40 hover:shadow-card",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    s.done ? "bg-status-ok-soft text-status-ok" : "bg-primary text-primary-foreground",
                  )}
                >
                  {s.done ? "✓" : i + 1}
                </span>
                {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className={cn("flex-1 truncate text-sm", s.done && "line-through")}>{s.label}</span>
                {!s.done && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
