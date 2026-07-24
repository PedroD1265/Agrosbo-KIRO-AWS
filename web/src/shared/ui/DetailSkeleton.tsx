import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** Number of metric tiles to render in the strip. Default 4. */
  metrics?: number;
  /** Show a tabs row placeholder. Default true. */
  tabs?: boolean;
}

/**
 * Skeleton de pantallas de detalle (BlockDetail, GreenhouseDetail, etc.).
 * Mantiene la jerarquía visual: back link → header → métricas → tabs → contenido.
 */
export function DetailSkeleton({ className, metrics = 4, tabs = true }: Props) {
  return (
    <div className={cn("space-y-5 animate-fade-in", className)}>
      <Skeleton className="h-7 w-32" />
      <div className="space-y-3 border-b border-border/60 pb-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-1/2 max-w-sm" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: metrics }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {tabs && (
        <div className="flex gap-2 border-b border-border/40 pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-md" />
          ))}
        </div>
      )}
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
