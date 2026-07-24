import { CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSyncStatus } from "@/hooks/useSyncStatus";

interface Props {
  /** Mensaje custom; por defecto se elige según online/cola */
  children?: React.ReactNode;
  className?: string;
  /** Forzar visibilidad incluso online (útil cuando hay items en cola) */
  showWhenPending?: boolean;
}

/**
 * Hint visual unificado para formularios y drawers que comunica el estado
 * de sincronización al usuario sin reemplazar lógica real.
 * - Offline: banda informativa cálida ("se guardará localmente").
 * - Online con cola: banda neutra ("se sincronizará al tocar guardar").
 */
export function OfflineHint({ children, className, showWhenPending = false }: Props) {
  const { online, pending } = useSyncStatus();

  if (online && (!showWhenPending || pending === 0)) return null;

  const offline = !online;
  const Icon = offline ? CloudOff : RefreshCw;
  const defaultMsg = offline
    ? "Sin conexión: se guardará localmente y se sincronizará al recuperar internet."
    : `${pending} ${pending === 1 ? "cambio" : "cambios"} en cola se sincronizarán pronto.`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-[12px] leading-snug",
        offline
          ? "border-status-warn/30 bg-status-warn-soft/60 text-status-warn"
          : "border-status-pending-sync/30 bg-status-pending-sync-soft/60 text-status-pending-sync",
        className,
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{children ?? defaultMsg}</span>
    </div>
  );
}
