import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  /** Approximate height for the map area. */
  height?: number | string;
  label?: string;
}

/**
 * Skeleton consistente para pantallas con mapa o paneles espaciales.
 */
export function MapSkeleton({ className, height = 460, label = 'Cargando capa espacial…' }: Props) {
  return (
    <div
      className={cn(
        'relative flex h-full w-full items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/30',
        className,
      )}
      style={{ height }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,hsl(var(--muted))_0%,transparent_50%),radial-gradient(circle_at_70%_70%,hsl(var(--muted))_0%,transparent_50%)] opacity-60" />
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 opacity-30">
        {Array.from({ length: 48 }).map((_, i) => (
          <div key={i} className="border-r border-b border-border/40" />
        ))}
      </div>
      <div className="relative flex flex-col items-center gap-2 animate-fade-in">
        <Skeleton className="h-9 w-9 rounded-full" />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
