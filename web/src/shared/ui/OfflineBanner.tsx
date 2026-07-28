import { CloudOff, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  pending?: number;
  className?: string;
  variant?: 'inline' | 'banner';
}

/**
 * Prominent offline notice for pages that depend on network state.
 * Complements SyncIndicator (which is a compact status pill).
 */
export function OfflineBanner({ pending, className, variant = 'banner' }: Props) {
  if (variant === 'inline') {
    return (
      <span
        role="status"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-status-offline-soft px-2.5 py-1 text-xs font-medium text-status-offline',
          className,
        )}
        data-testid="offline-banner-inline"
      >
        <WifiOff className="h-3.5 w-3.5" aria-hidden />
        Sin conexión{typeof pending === 'number' && pending > 0 ? ` · ${pending} en cola` : ''}
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-status-offline/30 bg-status-offline-soft px-4 py-3 text-sm text-status-offline',
        className,
      )}
      data-testid="offline-banner"
    >
      <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">Trabajando sin conexión</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Los cambios se guardan localmente
          {typeof pending === 'number' && pending > 0 ? ` (${pending} pendientes) ` : ' '}y se
          sincronizarán automáticamente al recuperar la red.
        </p>
      </div>
    </div>
  );
}
