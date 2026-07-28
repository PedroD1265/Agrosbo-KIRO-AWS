import { cn } from '@/lib/utils';

interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
}

/**
 * SectionHeader — subordinate to PageHeader. Use inside sections/cards
 * that group related content on a page.
 */
export function SectionHeader({ title, description, actions, className, as = 'h2' }: Props) {
  const Heading = as;
  return (
    <div
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 pb-2 sm:flex sm:flex-wrap sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <Heading className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {title}
        </Heading>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
