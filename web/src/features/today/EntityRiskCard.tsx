import { Link } from 'react-router-dom';
import {
  ChevronRight,
  AlertTriangle,
  Sprout,
  LayoutGrid,
  Droplets,
  ListChecks,
  NotebookPen,
} from 'lucide-react';
import type { Block, Greenhouse } from '@shared/schema';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { StageBadge } from '@/shared/ui/StageBadge';
import { cn } from '@/lib/utils';

type Entity = ({ kind: 'block' } & Block) | ({ kind: 'greenhouse' } & Greenhouse);

interface Props {
  entity: Entity;
  lastIrrigation?: string;
  nextAction?: string;
}

export function EntityRiskCard({ entity, lastIrrigation, nextAction }: Props) {
  const isBlock = entity.kind === 'block';
  const to = isBlock ? `/blocks/${entity.id}` : `/greenhouses/${entity.id}`;
  const Icon = isBlock ? LayoutGrid : Sprout;
  const subtitle = isBlock
    ? `${entity.crop} · ${entity.farm} · ${entity.areaHa} ha`
    : `${entity.crop} · ${entity.areaM2} m²`;
  const ref = `${entity.kind}:${entity.id}`;

  return (
    <div
      data-testid={`card-risk-${entity.id}`}
      className={cn(
        'group block overflow-hidden rounded-xl border bg-card transition-all hover:shadow-elevated',
        entity.status === 'critical' ? 'border-status-critical/40' : 'border-status-warn/30',
      )}
    >
      <Link to={to} className="flex items-center gap-3 px-4 py-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            entity.status === 'critical'
              ? 'bg-status-critical-soft text-status-critical'
              : 'bg-status-warn-soft text-status-warn',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{entity.name}</p>
            <StageBadge stage={entity.stage} />
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <StatusBadge status={entity.status} />
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>

      {(entity.alerts > 0 || lastIrrigation || nextAction) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
          {entity.alerts > 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-status-critical">
              <AlertTriangle className="h-3 w-3" />
              {entity.alerts} {entity.alerts === 1 ? 'alerta' : 'alertas'}
            </span>
          )}
          {lastIrrigation && (
            <span>
              Último riego: <span className="text-foreground">{lastIrrigation}</span>
            </span>
          )}
          {nextAction && (
            <span>
              Próximo: <span className="text-foreground">{nextAction}</span>
            </span>
          )}
        </div>
      )}

      {/* Quick actions contextuales — deep-link al módulo con el scope ya enfocado */}
      <div className="flex items-center gap-1 border-t border-border/60 bg-card px-2 py-1.5">
        <Link
          to={`/irrigation?scope=${ref}`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          data-testid={`risk-qa-irr-${entity.id}`}
        >
          <Droplets className="h-3.5 w-3.5" /> Riego
        </Link>
        <span className="h-4 w-px bg-border" />
        <Link
          to={`/tasks?scope=${ref}`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          data-testid={`risk-qa-task-${entity.id}`}
        >
          <ListChecks className="h-3.5 w-3.5" /> Tarea
        </Link>
        <span className="h-4 w-px bg-border" />
        <Link
          to={`/observations?scope=${ref}`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          data-testid={`risk-qa-obs-${entity.id}`}
        >
          <NotebookPen className="h-3.5 w-3.5" /> Nota
        </Link>
      </div>
    </div>
  );
}
