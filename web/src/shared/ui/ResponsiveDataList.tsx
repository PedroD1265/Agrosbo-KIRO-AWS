import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  hideOnMobile?: boolean;
}

interface Props<T> {
  items: T[];
  columns: Column<T>[];
  getKey: (item: T) => string;
  renderMobile: (item: T) => ReactNode;
  empty?: ReactNode;
  className?: string;
}

/**
 * ResponsiveDataList — table on desktop (>= md), card list on mobile.
 * Used by list pages that need both scannable columns and touch-friendly
 * cards without duplicating the source data.
 */
export function ResponsiveDataList<T>({
  items,
  columns,
  getKey,
  renderMobile,
  empty,
  className,
}: Props<T>) {
  if (items.length === 0 && empty) {
    return <div className={className}>{empty}</div>;
  }
  return (
    <div className={className}>
      {/* Mobile — card list */}
      <ul className="flex flex-col gap-2 md:hidden" data-testid="responsive-list-mobile">
        {items.map((it) => (
          <li key={getKey(it)}>{renderMobile(it)}</li>
        ))}
      </ul>

      {/* Desktop — table */}
      <div
        className="hidden overflow-x-auto rounded-lg border border-border/70 md:block"
        data-testid="responsive-list-table"
      >
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'px-3 py-2 font-medium',
                    c.hideOnMobile && 'hidden lg:table-cell',
                    c.headerClassName,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {items.map((it) => (
              <tr key={getKey(it)} className="hover:bg-muted/30">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-3 py-2 align-middle',
                      c.hideOnMobile && 'hidden lg:table-cell',
                      c.className,
                    )}
                  >
                    {c.render(it)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
