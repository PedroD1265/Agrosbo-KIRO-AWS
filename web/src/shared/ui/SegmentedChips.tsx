import { cn } from "@/lib/utils";

interface ChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  tone?: "default" | "warn" | "critical" | "ok" | "primary";
}

interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: ChipOption<T>[];
  className?: string;
  ariaLabel?: string;
}

const toneActive: Record<NonNullable<ChipOption<string>["tone"]>, string> = {
  default: "bg-foreground text-background",
  primary: "bg-primary text-primary-foreground",
  warn: "bg-status-warn text-white",
  critical: "bg-status-critical text-white",
  ok: "bg-status-ok text-white",
};

const toneIdle: Record<NonNullable<ChipOption<string>["tone"]>, string> = {
  default: "bg-muted/60 text-foreground",
  primary: "bg-primary-soft text-primary",
  warn: "bg-status-warn-soft text-status-warn",
  critical: "bg-status-critical-soft text-status-critical",
  ok: "bg-status-ok-soft text-status-ok",
};

/**
 * Chips horizontalmente desplazables, optimizados para mobile field UX.
 * Hit area mínima 36px, snap-x para scroll natural en pulgar.
 */
export function SegmentedChips<T extends string>({ value, onChange, options, className, ariaLabel }: Props<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "-mx-1 flex snap-x snap-mandatory items-center gap-1.5 overflow-x-auto px-1 pb-1",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        const tone = opt.tone ?? "default";
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "snap-start shrink-0 inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-all",
              "active:scale-[0.97]",
              active ? toneActive[tone] + " shadow-sm" : toneIdle[tone] + " hover:bg-muted",
            )}
            data-testid={`chip-${opt.value}`}
          >
            <span className="leading-none">{opt.label}</span>
            {typeof opt.count === "number" && (
              <span
                className={cn(
                  "tabular text-[11px] font-semibold leading-none",
                  active ? "opacity-90" : "opacity-70",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
