import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  rows?: number;
  className?: string;
}

/**
 * Skeleton de lista para reemplazar "Cargando…" en pantallas de listado.
 * Se ve más profesional y reduce sensación de pantalla vacía.
 */
export function ListSkeleton({ rows = 4, className }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando contenido"
      className={`space-y-2.5 ${className ?? ''}`}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5"
        >
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
