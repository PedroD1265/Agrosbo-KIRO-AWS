import { idb, type QueuedMutation, type QueueDomain } from '@/lib/db/idb';

export function makeClientId(prefix: string) {
  const r = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}${r}`;
}

export interface EnqueueInput {
  clientId: string;
  domain: QueueDomain;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  body: unknown;
  invalidateKeys: string[][];
}

export async function enqueue(input: EnqueueInput): Promise<QueuedMutation> {
  const now = Date.now();
  const item: QueuedMutation = {
    ...input,
    status: 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
  await idb.mutations.put(item);
  return item;
}

export async function listPending() {
  return idb.mutations.where('status').anyOf('pending', 'failed').sortBy('createdAt');
}

export async function listAll() {
  return idb.mutations.orderBy('createdAt').toArray();
}

export async function setStatus(
  clientId: string,
  status: QueuedMutation['status'],
  patch: Partial<QueuedMutation> = {},
) {
  await idb.mutations.update(clientId, { status, updatedAt: Date.now(), ...patch });
}

export async function remove(clientId: string) {
  await idb.mutations.delete(clientId);
}

export async function counts() {
  const all = await idb.mutations.toArray();
  let pending = 0;
  let syncing = 0;
  let failed = 0;
  for (const m of all) {
    if (m.status === 'pending') pending++;
    else if (m.status === 'syncing') syncing++;
    else if (m.status === 'failed') failed++;
  }
  return { pending, syncing, failed, total: all.length };
}

export async function clearFailed() {
  const failed = await idb.mutations.where('status').equals('failed').primaryKeys();
  await idb.mutations.bulkDelete(failed);
}

export async function retryFailed() {
  await idb.mutations
    .where('status')
    .equals('failed')
    .modify({ status: 'pending', attempts: 0, lastError: undefined, updatedAt: Date.now() });
}
