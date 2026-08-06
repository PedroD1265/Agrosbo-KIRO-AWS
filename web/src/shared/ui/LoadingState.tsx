import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface Props {
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function LoadingState({ label = 'Cargando…', className, size = 'md' }: Props) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center gap-2 py-6 text-muted-foreground',
        size === 'sm' && 'py-3 text-xs',
        size === 'md' && 'text-sm',
        className,
      )}
      data-testid="loading-state"
    >
      <Loader2
        className={cn('animate-spin', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')}
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}
