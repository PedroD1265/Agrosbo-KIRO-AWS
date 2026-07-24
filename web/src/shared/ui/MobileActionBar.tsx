import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
  hint?: React.ReactNode;
}

/**
 * Barra sticky de acción inferior para mobile.
 * Vive sobre el BottomNav (que tiene altura ~64px + safe area).
 * NO se renderiza sola en desktop (el caller decide mostrarla solo en mobile).
 */
export function MobileActionBar({ children, className, hint }: Props) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 md:hidden",
        "border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-md shadow-elevated",
        className,
      )}
    >
      {hint && <p className="mb-1.5 text-[11px] text-muted-foreground">{hint}</p>}
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
