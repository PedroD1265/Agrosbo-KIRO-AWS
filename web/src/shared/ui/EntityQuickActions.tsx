import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Droplets, ListChecks, NotebookPen, PackageCheck } from 'lucide-react';
import type { ScopeType } from '@shared/schema';

interface Props {
  scopeType: ScopeType;
  scopeId: string;
}

/**
 * Operational quick-actions for a Block / Greenhouse detail header.
 * Routes to existing module pages — no data layer changes.
 * Dual-safe: works under MemStorage and DbStorage.
 *
 * NOTE: deep-link query params are forward-compatible — pages may pick
 * them up later to pre-fill scope, but if they don't, navigation is
 * still correct and harmless.
 */
export function EntityQuickActions({ scopeType, scopeId }: Props) {
  const ref = `${scopeType}:${scopeId}`;
  const items: {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    testId: string;
  }[] = [
    { to: `/tasks?scope=${ref}`, label: 'Nueva tarea', icon: ListChecks, testId: 'qa-task' },
    { to: `/irrigation?scope=${ref}`, label: 'Riego', icon: Droplets, testId: 'qa-irr' },
    { to: `/observations?scope=${ref}`, label: 'Observación', icon: NotebookPen, testId: 'qa-obs' },
    { to: `/harvest?scope=${ref}`, label: 'Cosecha', icon: PackageCheck, testId: 'qa-har' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="entity-quick-actions">
      {items.map((it) => (
        <Button
          key={it.to}
          asChild
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium"
          data-testid={it.testId}
        >
          <Link to={it.to}>
            <it.icon className="h-3.5 w-3.5" />
            {it.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
