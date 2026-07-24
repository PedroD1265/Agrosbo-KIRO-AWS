import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListChecks } from 'lucide-react';
import { EmptyState } from '@/shared/ui/EmptyState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { SortableHeader } from '@/shared/ui/SortableHeader';
import { RowActionsMenu } from '@/shared/ui/RowActionsMenu';
import { queueUpdateTaskStatus } from '@/hooks/data/mutations';
import type { Task } from '@shared/schema';
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  type TaskSortKey,
  isOverdue,
  nextStatus,
  relativeDue,
  statusActionLabel,
} from './taskUtils';

interface Props {
  items: Task[];
  onDelete: (id: string) => void;
  onEdit: (t: Task) => void;
  onSelect: (t: Task) => void;
  selectedId?: string | null;
  sortKey: TaskSortKey;
  sortDir: 'asc' | 'desc';
  onSort: (k: TaskSortKey) => void;
}

export function TaskTable({
  items,
  onDelete,
  onEdit,
  onSelect,
  selectedId,
  sortKey,
  sortDir,
  onSort,
}: Props) {
  if (items.length === 0)
    return (
      <EmptyState
        icon={ListChecks}
        title="Sin tareas en esta vista"
        description="Cambia de pestaña o crea una nueva tarea."
        compact
      />
    );
  return (
    <Card className="shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <SortableHeader<TaskSortKey>
                label="Tarea"
                sortKey="title"
                active={sortKey}
                direction={sortDir}
                onSort={onSort}
              />
              <SortableHeader<TaskSortKey>
                label="Destino"
                sortKey="scope"
                active={sortKey}
                direction={sortDir}
                onSort={onSort}
              />
              <SortableHeader<TaskSortKey>
                label="Responsable"
                sortKey="assignee"
                active={sortKey}
                direction={sortDir}
                onSort={onSort}
              />
              <SortableHeader<TaskSortKey>
                label="Vence"
                sortKey="due"
                active={sortKey}
                direction={sortDir}
                onSort={onSort}
              />
              <SortableHeader<TaskSortKey>
                label="Prioridad"
                sortKey="priority"
                active={sortKey}
                direction={sortDir}
                onSort={onSort}
              />
              <SortableHeader<TaskSortKey>
                label="Estado"
                sortKey="status"
                active={sortKey}
                direction={sortDir}
                onSort={onSort}
              />
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => {
              const next = nextStatus(t.status);
              const overdue = isOverdue(t);
              const r = relativeDue(t.dueDate);
              const toneCls =
                r.tone === 'critical'
                  ? 'text-status-critical font-semibold'
                  : r.tone === 'warn'
                    ? 'text-status-warn font-semibold'
                    : r.tone === 'muted'
                      ? 'text-muted-foreground'
                      : 'text-foreground';
              return (
                <tr
                  key={t.id}
                  onClick={() => onSelect(t)}
                  aria-selected={selectedId === t.id}
                  className={`group cursor-pointer border-b border-border/50 last:border-0 transition-colors hover:bg-muted/30 aria-selected:bg-primary/5 aria-selected:ring-1 aria-selected:ring-inset aria-selected:ring-primary/30 ${overdue ? 'bg-status-critical-soft/30' : ''}`}
                  data-testid={`row-task-${t.id}`}
                >
                  <td
                    className={`px-4 py-3 ${overdue ? 'border-l-2 border-status-critical' : selectedId === t.id ? 'border-l-2 border-primary' : ''}`}
                  >
                    <p className="font-medium leading-tight">{t.title}</p>
                    {t.notes && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{t.notes}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.scopeName}</td>
                  <td className="px-4 py-3">{t.assignee}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col leading-tight">
                      <span className={`text-sm tabular ${toneCls}`}>{r.label}</span>
                      <span className="text-[11px] text-muted-foreground tabular">{t.dueDate}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={
                        t.priority === 'high' ? 'critical' : t.priority === 'med' ? 'warn' : 'idle'
                      }
                      label={PRIORITY_LABEL[t.priority]}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={
                        t.status === 'done' ? 'ok' : t.status === 'in_progress' ? 'warn' : 'idle'
                      }
                      label={STATUS_LABEL[t.status]}
                    />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                      {next && (
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-task-advance-${t.id}`}
                          onClick={() => {
                            queueUpdateTaskStatus(t.id, next).catch((err) =>
                              toast.error('No se pudo actualizar', {
                                description: (err as Error).message,
                              }),
                            );
                          }}
                        >
                          {statusActionLabel(t.status)}
                        </Button>
                      )}
                      <RowActionsMenu
                        testId={`task-${t.id}`}
                        onEdit={() => onEdit(t)}
                        onDelete={() => onDelete(t.id)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
