import { AlertTriangle, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSyncStatus } from '@/hooks/useSyncStatus';

interface Props {
  className?: string;
  online?: boolean;
  pending?: number;
}

export function SyncIndicator({ className, online: onlineProp, pending: pendingProp }: Props) {
  const { online, pending, syncing, failed, triggerSync } = useSyncStatus();
  const isOnline = onlineProp ?? online;
  const pendingCount = (pendingProp ?? pending) + syncing;

  if (!isOnline) {
    return (
      <span
        data-testid="sync-status-offline"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-status-critical-soft px-2.5 py-1 text-xs font-medium text-status-critical',
          className,
        )}
        title={pendingCount > 0 ? `${pendingCount} en cola local` : 'Sin conexión'}
      >
        <CloudOff className="h-3.5 w-3.5" /> Offline
        {pendingCount > 0 ? ` · ${pendingCount}` : ''}
      </span>
    );
  }

  if (failed > 0) {
    return (
      <button
        type="button"
        onClick={() => triggerSync()}
        data-testid="sync-status-failed"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-status-critical-soft px-2.5 py-1 text-xs font-medium text-status-critical hover:opacity-90',
          className,
        )}
        title="Reintentar sincronización"
      >
        <AlertTriangle className="h-3.5 w-3.5" /> {failed} con error · Reintentar
      </button>
    );
  }

  if (pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={() => triggerSync()}
        data-testid="sync-status-pending"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-status-sync-soft px-2.5 py-1 text-xs font-medium text-status-sync hover:opacity-90',
          className,
        )}
        title="Sincronizar ahora"
      >
        <RefreshCw className={cn('h-3.5 w-3.5', syncing > 0 && 'animate-spin')} />
        {pendingCount} por sincronizar
      </button>
    );
  }

  return (
    <span
      data-testid="sync-status-ok"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-status-ok-soft px-2.5 py-1 text-xs font-medium text-status-ok',
        className,
      )}
    >
      <Cloud className="h-3.5 w-3.5" /> Sincronizado
    </span>
  );
}
