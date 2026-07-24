import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: 'default' | 'primary' | 'muted';
}

const toneCfg = {
  default: 'bg-card border-border',
  primary: 'bg-card border-primary/15',
  muted: 'bg-muted/30 border-border',
};

/**
 * Settings section card — header con icon + título + descripción opcional + acción opcional.
 * Da consistencia y jerarquía a toda la pantalla de Settings.
 */
export function SettingsSection({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
  tone = 'default',
}: Props) {
  return (
    <section
      className={cn('overflow-hidden rounded-2xl border shadow-card', toneCfg[tone], className)}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
