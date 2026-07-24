import { cn } from '@/lib/utils';
import { type Urgency, urgencyLabel } from './priorityUtils';

const styles: Record<Urgency, string> = {
  overdue: 'bg-status-critical-soft text-status-critical ring-1 ring-status-critical/30',
  today: 'bg-status-warn-soft text-status-warn ring-1 ring-status-warn/30',
  soon: 'bg-primary-soft text-primary ring-1 ring-primary/20',
  later: 'bg-muted text-muted-foreground ring-1 ring-border',
};

interface Props {
  urgency: Urgency;
  label?: string;
  className?: string;
  pulse?: boolean;
}

export function UrgencyBadge({ urgency, label, className, pulse }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        styles[urgency],
        className,
      )}
    >
      {pulse && urgency === 'overdue' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-critical opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-status-critical" />
        </span>
      )}
      {label ?? urgencyLabel(urgency)}
    </span>
  );
}
