import { cn } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

const config: Record<
  ConfidenceLevel,
  { label: string; icon: typeof ShieldCheck; className: string }
> = {
  high: {
    label: 'Confianza alta',
    icon: ShieldCheck,
    className: 'bg-confidence-high-soft text-confidence-high',
  },
  medium: {
    label: 'Confianza media',
    icon: ShieldQuestion,
    className: 'bg-confidence-medium-soft text-confidence-medium',
  },
  low: {
    label: 'Confianza baja',
    icon: ShieldAlert,
    className: 'bg-confidence-low-soft text-confidence-low',
  },
};

interface Props {
  level: ConfidenceLevel;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

/**
 * Confidence badge for assistant answers, scenario outputs and visual
 * assessments. Never used to imply a definitive diagnosis.
 */
export function ConfidenceBadge({ level, label, className, showIcon = true }: Props) {
  const { icon: Icon, className: styleCn, label: defaultLabel } = config[level];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        styleCn,
        className,
      )}
      data-confidence={level}
    >
      {showIcon && <Icon className="h-3 w-3" aria-hidden />}
      {label ?? defaultLabel}
    </span>
  );
}
