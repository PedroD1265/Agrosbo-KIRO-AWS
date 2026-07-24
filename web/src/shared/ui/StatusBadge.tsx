import { cn } from '@/lib/utils';
import type { OperationalStatus } from '@shared/schema';

const labels: Record<OperationalStatus, string> = {
  ok: 'OK',
  warn: 'Atención',
  critical: 'Crítico',
  idle: 'Inactivo',
  'pending-sync': 'Pend. sync',
};

const styles: Record<OperationalStatus, string> = {
  ok: 'bg-status-ok-soft text-status-ok',
  warn: 'bg-status-warn-soft text-status-warn',
  critical: 'bg-status-critical-soft text-status-critical',
  idle: 'bg-status-idle-soft text-status-idle',
  'pending-sync': 'bg-status-sync-soft text-status-sync',
};

interface Props {
  status: OperationalStatus;
  label?: string;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ status, label, className, dot = true }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        styles[status],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label ?? labels[status]}
    </span>
  );
}
