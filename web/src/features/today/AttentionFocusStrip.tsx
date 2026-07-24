import { Link } from 'react-router-dom';
import { AlertTriangle, ListChecks, Droplets, Activity, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Bucket {
  key: 'overdue' | 'today' | 'irrigation' | 'risk';
  label: string;
  value: number;
  hint: string;
  to: string;
  tone: 'critical' | 'warn' | 'primary' | 'muted';
  icon: React.ComponentType<{ className?: string }>;
}

interface Props {
  overdueCount: number;
  todayTasksCount: number;
  irrigationCount: number;
  riskCount: number;
}

const toneCfg = {
  critical: {
    ring: 'ring-status-critical/30',
    bg: 'bg-status-critical-soft',
    fg: 'text-status-critical',
    dot: 'bg-status-critical',
  },
  warn: {
    ring: 'ring-status-warn/30',
    bg: 'bg-status-warn-soft',
    fg: 'text-status-warn',
    dot: 'bg-status-warn',
  },
  primary: {
    ring: 'ring-primary/20',
    bg: 'bg-primary-soft',
    fg: 'text-primary',
    dot: 'bg-primary',
  },
  muted: {
    ring: 'ring-border',
    bg: 'bg-muted',
    fg: 'text-muted-foreground',
    dot: 'bg-muted-foreground/40',
  },
};

/**
 * Top-of-page focus strip — the operator's first read of the day.
 * 4 large, scannable buckets that deep-link into the relevant module.
 */
export function AttentionFocusStrip({
  overdueCount,
  todayTasksCount,
  irrigationCount,
  riskCount,
}: Props) {
  const buckets: Bucket[] = [
    {
      key: 'overdue',
      label: 'Vencidos',
      value: overdueCount,
      hint: overdueCount === 0 ? 'Sin retrasos' : 'Requieren acción',
      to: '/tasks',
      tone: overdueCount > 0 ? 'critical' : 'muted',
      icon: AlertTriangle,
    },
    {
      key: 'today',
      label: 'Tareas hoy',
      value: todayTasksCount,
      hint: todayTasksCount === 0 ? 'Sin pendientes' : 'Programadas',
      to: '/tasks',
      tone: todayTasksCount > 0 ? 'warn' : 'muted',
      icon: ListChecks,
    },
    {
      key: 'irrigation',
      label: 'Riegos próximos',
      value: irrigationCount,
      hint: irrigationCount === 0 ? 'Al día' : 'Próximas horas',
      to: '/irrigation',
      tone: irrigationCount > 0 ? 'primary' : 'muted',
      icon: Droplets,
    },
    {
      key: 'risk',
      label: 'Unidades en riesgo',
      value: riskCount,
      hint: riskCount === 0 ? 'Estable' : 'Revisar',
      to: '/blocks',
      tone: riskCount > 0 ? 'critical' : 'muted',
      icon: Activity,
    },
  ];

  return (
    <div
      className="grid grid-cols-2 gap-2.5 md:grid-cols-4"
      data-testid="attention-focus-strip"
      role="navigation"
      aria-label="Foco operativo del día"
    >
      {buckets.map((b) => {
        const cfg = toneCfg[b.tone];
        const isZero = b.value === 0;
        return (
          <Link
            key={b.key}
            to={b.to}
            data-testid={`focus-${b.key}`}
            className={cn(
              'group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-3.5 ring-1 transition-all',
              'hover:border-primary/40 hover:shadow-elevated active:scale-[0.99]',
              cfg.ring,
              isZero ? 'border-border/60' : 'border-border',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  cfg.bg,
                  cfg.fg,
                )}
              >
                <b.icon className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'text-3xl font-semibold leading-none tabular md:text-[34px]',
                    isZero ? 'text-foreground/70' : cfg.fg,
                  )}
                >
                  {b.value}
                </span>
                {!isZero && b.tone === 'critical' && (
                  <span className="relative flex h-2 w-2">
                    <span
                      className={cn(
                        'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                        cfg.dot,
                      )}
                    />
                    <span className={cn('relative inline-flex h-2 w-2 rounded-full', cfg.dot)} />
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {b.label}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{b.hint}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
