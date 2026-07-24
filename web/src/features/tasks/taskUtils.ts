import type { Task, TaskStatus } from '@shared/schema';

export type TaskSortKey = 'title' | 'scope' | 'assignee' | 'due' | 'priority' | 'status';

export const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: 'Baja',
  med: 'Media',
  high: 'Alta',
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Completada',
};

export const PRIORITY_RANK: Record<Task['priority'], number> = { high: 0, med: 1, low: 2 };
export const STATUS_RANK: Record<TaskStatus, number> = { pending: 0, in_progress: 1, done: 2 };

export function nextStatus(s: TaskStatus): TaskStatus | null {
  if (s === 'pending') return 'in_progress';
  if (s === 'in_progress') return 'done';
  return null;
}

export function statusActionLabel(s: TaskStatus) {
  if (s === 'pending') return 'Iniciar';
  if (s === 'in_progress') return 'Completar';
  return 'Hecha';
}

export function isOverdue(t: Task) {
  if (t.status === 'done') return false;
  const due = new Date(t.dueDate);
  if (isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export function relativeDue(dueDate: string): {
  label: string;
  tone: 'critical' | 'warn' | 'default' | 'muted';
} {
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return { label: dueDate, tone: 'muted' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diff = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `Hace ${Math.abs(diff)}d`, tone: 'critical' };
  if (diff === 0) return { label: 'Hoy', tone: 'warn' };
  if (diff === 1) return { label: 'Mañana', tone: 'warn' };
  if (diff <= 7) return { label: `En ${diff}d`, tone: 'default' };
  return {
    label: due.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }),
    tone: 'muted',
  };
}
