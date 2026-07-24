import { cn } from "@/lib/utils";
import { OfflineHint } from "./OfflineHint";

interface Props {
  /** Si true, hace el footer "sticky" en mobile dentro de un drawer scrollable */
  sticky?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Hint custom (string o nodo). Si se pasa `offlineAware`, se ignora. */
  hint?: React.ReactNode;
  /**
   * Si true, muestra automáticamente un OfflineHint estilizado
   * cuando el navegador está offline. Reemplaza el `hint` plano.
   */
  offlineAware?: boolean;
}

/**
 * Footer reutilizable para formularios en drawers móviles.
 * Provee: sticky bottom, separación visual, safe area en iOS y hint opcional.
 * Aditivo: no rompe formularios existentes.
 */
export function FormFooter({
  sticky = true,
  children,
  className,
  hint,
  offlineAware = false,
}: Props) {
  return (
    <div
      className={cn(
        "-mx-6 mt-2 border-t border-border/60 bg-card px-6 pt-3",
        "pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        sticky && "sticky bottom-0 z-10",
        className,
      )}
    >
      {offlineAware ? (
        <div className="mb-2"><OfflineHint /></div>
      ) : hint ? (
        <p className="mb-2 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
      {children}
    </div>
  );
}
