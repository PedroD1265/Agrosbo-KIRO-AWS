import { cn } from '@/lib/utils';
import type { CropStage } from '@shared/schema';

const labels: Record<CropStage, string> = {
  seed: 'Almácigo',
  veg: 'Vegetativo',
  flower: 'Floración',
  harvest: 'Cosecha',
};

const styles: Record<CropStage, { wrap: string; dot: string }> = {
  seed: { wrap: 'bg-stage-seed/12 text-stage-seed', dot: 'bg-stage-seed' },
  veg: { wrap: 'bg-stage-veg/12 text-stage-veg', dot: 'bg-stage-veg' },
  flower: { wrap: 'bg-stage-flower/12 text-stage-flower', dot: 'bg-stage-flower' },
  harvest: { wrap: 'bg-stage-harvest/12 text-stage-harvest', dot: 'bg-stage-harvest' },
};

export function StageBadge({ stage, className }: { stage: CropStage; className?: string }) {
  const s = styles[stage];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        s.wrap,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {labels[stage]}
    </span>
  );
}
