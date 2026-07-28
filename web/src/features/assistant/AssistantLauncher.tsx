import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAssistant } from './AssistantContext';

interface Props {
  variant?: 'topbar' | 'bottom-nav' | 'floating';
  className?: string;
}

/**
 * Entry point to the Assistant Dock. Three visual variants for shell surfaces.
 * The button is always keyboard-accessible and carries an aria-label.
 */
export function AssistantLauncher({ variant = 'topbar', className }: Props) {
  const { openDock, open } = useAssistant();

  if (variant === 'bottom-nav') {
    return (
      <button
        type="button"
        onClick={openDock}
        aria-label="Abrir asistente"
        aria-expanded={open}
        aria-haspopup="dialog"
        data-testid="assistant-launcher-bottom-nav"
        className={cn(
          'relative flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium text-muted-foreground transition-colors active:text-foreground',
          className,
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card">
          <Bot className="h-4 w-4" strokeWidth={2.2} aria-hidden />
        </span>
        <span className="leading-none">Asistente</span>
      </button>
    );
  }

  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={openDock}
        aria-label="Abrir asistente"
        aria-expanded={open}
        aria-haspopup="dialog"
        data-testid="assistant-launcher-floating"
        className={cn(
          'fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated transition-transform hover:scale-105 active:scale-95 md:hidden',
          className,
        )}
      >
        <Bot className="h-6 w-6" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openDock}
      aria-label="Abrir asistente"
      aria-expanded={open}
      aria-haspopup="dialog"
      data-testid="assistant-launcher-topbar"
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-md bg-primary/10 px-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <Bot className="h-4 w-4" aria-hidden />
      <span className="hidden lg:inline">Asistente</span>
    </button>
  );
}
