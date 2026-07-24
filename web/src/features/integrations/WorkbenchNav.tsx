import { cn } from "@/lib/utils";
import { SECTIONS, type Section } from "./integrationUtils";

interface Props {
  active: Section;
  onChange: (s: Section) => void;
  counts: { adapters: number; csv: number };
}

export function WorkbenchNav({ active, onChange, counts }: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden lg:flex lg:flex-col lg:gap-1 lg:sticky lg:top-4 lg:self-start">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.id;
          const count = s.id === "adapters" ? counts.adapters : s.id === "csv" ? counts.csv : null;
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              data-testid={`nav-section-${s.id}`}
              className={cn(
                "group flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
                isActive
                  ? "border-primary/40 bg-primary-soft text-foreground shadow-card"
                  : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-background",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("text-sm font-semibold", isActive ? "text-foreground" : "")}>{s.label}</p>
                  {count !== null && (
                    <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold tabular text-muted-foreground">
                      {count}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{s.description}</p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Mobile chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 lg:hidden">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              data-testid={`nav-chip-${s.id}`}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
