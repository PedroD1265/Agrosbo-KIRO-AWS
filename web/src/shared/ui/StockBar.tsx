import { cn } from '@/lib/utils';

interface Props {
  stock: number;
  min: number;
  className?: string;
}

/**
 * Tiny visual ratio of current stock vs minimum threshold.
 * Pure presentation: no data fetching, dual-safe.
 * - red zone: stock < min
 * - amber zone: stock < min * 1.5
 * - green zone: above
 */
export function StockBar({ stock, min, className }: Props) {
  const target = Math.max(min * 2, 1);
  const pct = Math.min(100, Math.round((stock / target) * 100));
  const tone = stock < min ? 'critical' : stock < min * 1.5 ? 'warn' : 'ok';
  const fill =
    tone === 'critical'
      ? 'bg-status-critical'
      : tone === 'warn'
        ? 'bg-status-warn'
        : 'bg-status-ok';
  return (
    <div className={cn('flex items-center gap-2', className)} title={`${stock} de mínimo ${min}`}>
      <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full transition-all', fill)}
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
    </div>
  );
}
