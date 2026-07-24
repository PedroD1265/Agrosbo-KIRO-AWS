import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  /** Header title (operative, e.g. row identifier) */
  title: React.ReactNode;
  /** Smaller subtitle below the title */
  subtitle?: React.ReactNode;
  /** Optional badges or status chips on the right side of the header */
  headerExtra?: React.ReactNode;
  /** Pinned action bar at the bottom of the panel */
  footer?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /** When true, panel scrolls internally (default true) */
  scroll?: boolean;
}

/**
 * Workbench detail side panel (desktop list ↔ detail layout).
 * Sticky, scrollable, presentation-only — does not own data.
 */
export function DetailSidePanel({
  title,
  subtitle,
  headerExtra,
  footer,
  onClose,
  children,
  className,
  scroll = true,
}: Props) {
  return (
    <aside
      className={cn(
        "sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card animate-fade-in",
        className,
      )}
      aria-label="Panel de detalle"
    >
      <header className="flex items-start gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {headerExtra}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Cerrar panel"
          data-testid="button-detail-close"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>
      <div className={cn("flex-1 px-4 py-3.5", scroll && "overflow-y-auto")}>
        {children}
      </div>
      {footer && (
        <footer className="border-t border-border/60 bg-muted/20 px-4 py-2.5">
          {footer}
        </footer>
      )}
    </aside>
  );
}
