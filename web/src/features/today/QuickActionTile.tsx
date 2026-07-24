import { Link } from 'react-router-dom';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  to: string;
  icon: LucideIcon;
  label: string;
  hint?: string;
  tone?: 'primary' | 'accent' | 'warn' | 'default';
  testId?: string;
}

const tones = {
  primary: 'bg-primary-soft text-primary',
  accent: 'bg-accent-soft text-accent-foreground',
  warn: 'bg-status-warn-soft text-status-warn',
  default: 'bg-muted text-foreground',
};

export function QuickActionTile({ to, icon: Icon, label, hint, tone = 'default', testId }: Props) {
  return (
    <Link
      to={to}
      data-testid={testId}
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 transition-all',
        'hover:border-primary/40 hover:shadow-card active:scale-[0.99]',
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          tones[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{label}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
