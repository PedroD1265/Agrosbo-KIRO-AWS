import { AlertTriangle, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = 'No se pudo cargar la información',
  message = 'Ocurrió un problema al recuperar los datos. Puedes intentarlo de nuevo.',
  onRetry,
  retryLabel = 'Reintentar',
  className,
}: Props) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-status-critical/30 bg-status-critical-soft/50 px-6 py-8 text-center',
        className,
      )}
      data-testid="error-state"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-status-critical/10 text-status-critical">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <div className="max-w-md">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} data-testid="error-state-retry">
          <RotateCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
