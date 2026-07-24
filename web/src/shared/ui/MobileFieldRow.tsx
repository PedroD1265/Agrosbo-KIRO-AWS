import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  meta?: string;
  rightTop?: React.ReactNode;
  rightBottom?: React.ReactNode;
  accent?: 'critical' | 'warn' | 'ok' | 'primary' | 'none';
  onClick?: () => void;
  href?: string;
  className?: string;
  children?: React.ReactNode;
}

const accentBar: Record<NonNullable<Props['accent']>, string> = {
  critical: 'before:bg-status-critical',
  warn: 'before:bg-status-warn',
  ok: 'before:bg-status-ok',
  primary: 'before:bg-primary',
  none: 'before:hidden',
};

/**
 * Fila táctil para listas mobile-first.
 * - Min 72px alto (cómodo para pulgar)
 * - Borde lateral de color para escaneo de prioridad
 * - Soporta acciones inline a la derecha
 */
export function MobileFieldRow({
  title,
  subtitle,
  meta,
  rightTop,
  rightBottom,
  accent = 'none',
  onClick,
  className,
  children,
}: Props) {
  const Wrap: any = onClick ? 'button' : 'div';
  return (
    <Wrap
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative w-full overflow-hidden rounded-xl border border-border/60 bg-card text-left shadow-card transition-all',
        'before:absolute before:left-0 before:top-0 before:h-full before:w-[3px]',
        accentBar[accent],
        onClick && 'active:scale-[0.99] active:bg-muted/40',
        className,
      )}
    >
      <div className="flex min-h-[72px] items-start gap-3 px-4 py-3 pl-[15px]">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[15px] font-semibold leading-snug text-foreground">
              {title}
            </p>
            {rightTop}
          </div>
          {subtitle && (
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{subtitle}</p>
          )}
          {meta && <p className="mt-0.5 text-[11px] tabular text-muted-foreground/80">{meta}</p>}
          {children && <div className="mt-2.5">{children}</div>}
        </div>
        {rightBottom ? (
          <div className="flex shrink-0 items-center">{rightBottom}</div>
        ) : onClick ? (
          <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground" />
        ) : null}
      </div>
    </Wrap>
  );
}
