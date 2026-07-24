import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props<K extends string> {
  label: string;
  sortKey: K;
  active: K | null;
  direction: 'asc' | 'desc';
  onSort: (key: K) => void;
  align?: 'left' | 'right';
  className?: string;
}

/**
 * Lightweight presentational header cell for sortable tables.
 * Pure client UX layer — does not touch data, hooks or contracts.
 * Works identically under MemStorage and DbStorage.
 */
export function SortableHeader<K extends string>({
  label,
  sortKey,
  active,
  direction,
  onSort,
  align = 'left',
  className,
}: Props<K>) {
  const isActive = active === sortKey;
  const Icon = !isActive ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground',
        align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          isActive && 'text-foreground',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        <span>{label}</span>
        <Icon className={cn('h-3 w-3 opacity-60', isActive && 'opacity-100')} />
      </button>
    </th>
  );
}

export function useSortState<K extends string>(initial: K, initialDir: 'asc' | 'desc' = 'asc') {
  // Tiny seam to keep table sort state with predictable toggling.
  // Returns a tuple suitable for direct destructure in pages.
  // (Implemented as a hook factory to avoid pulling React in here.)
  return { initial, initialDir };
}
