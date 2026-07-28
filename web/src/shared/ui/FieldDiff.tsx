import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

export interface FieldDiffItem {
  field: string;
  label: string;
  current: React.ReactNode;
  proposed: React.ReactNode;
  changed?: boolean;
}

interface Props {
  items: FieldDiffItem[];
  className?: string;
}

/**
 * FieldDiff — presentational component used by the Assistant confirmation
 * panel (B3) and by scenario/vision drafts. Renders current vs proposed
 * values side-by-side with clear text labels (never color-only).
 */
export function FieldDiff({ items, className }: Props) {
  if (items.length === 0) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>Sin cambios propuestos.</p>
    );
  }
  return (
    <ul className={cn('divide-y divide-border/70 rounded-lg border border-border/70', className)}>
      {items.map((item) => {
        const changed = item.changed ?? item.current !== item.proposed;
        return (
          <li
            key={item.field}
            className="grid grid-cols-1 gap-1 px-3 py-2 sm:grid-cols-[minmax(0,140px)_minmax(0,1fr)] sm:items-center sm:gap-3"
            data-testid={`field-diff-${item.field}`}
            data-changed={changed}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
              {changed && (
                <span className="ml-1 rounded bg-accent-soft px-1 py-0 text-[10px] font-semibold text-accent-foreground">
                  cambio
                </span>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className={cn(
                  'rounded bg-muted/60 px-1.5 py-0.5 text-xs text-muted-foreground line-through',
                  !changed && 'line-through-0 no-underline',
                )}
              >
                {item.current || <em className="italic">vacío</em>}
              </span>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {item.proposed || <em className="italic">vacío</em>}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
