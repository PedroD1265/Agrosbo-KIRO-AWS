/**
 * Topological sort of sync operations by dependency_op_ids.
 * Returns operations in execution order. Throws if cycle detected.
 * DISPOSABLE.
 */
import { SyncOperation } from './types.js';

export function sortByDependencies(operations: SyncOperation[]): SyncOperation[] {
  const byOpId = new Map<string, SyncOperation>();
  for (const op of operations) {
    byOpId.set(op.client_op_id, op);
  }

  const sorted: SyncOperation[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(opId: string) {
    if (visited.has(opId)) return;
    if (visiting.has(opId)) {
      throw new Error(`Cycle detected in dependencies involving ${opId}`);
    }

    const op = byOpId.get(opId);
    if (!op) return; // dependency outside this batch — already resolved

    visiting.add(opId);

    for (const depId of op.dependency_op_ids) {
      visit(depId);
    }

    visiting.delete(opId);
    visited.add(opId);
    sorted.push(op);
  }

  for (const op of operations) {
    visit(op.client_op_id);
  }

  return sorted;
}
