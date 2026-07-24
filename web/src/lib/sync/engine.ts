import { toast } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { idb, type QueuedMutation } from '@/lib/db/idb';
import { listPending, setStatus, remove } from '@/lib/sync/queue';

const MAX_ATTEMPTS = 6;
const BASE_DELAY = 1500;

let running = false;
let scheduled: number | null = null;
let listenersAttached = false;

const subscribers = new Set<() => void>();

export function subscribeQueue(fn: () => void) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function notify() {
  subscribers.forEach((fn) => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

idb.on('ready', () => notify());

function backoff(attempts: number) {
  return Math.min(30_000, BASE_DELAY * 2 ** Math.max(0, attempts - 1));
}

function isClientError(status: number) {
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

/* --- temp → real id reconciliation -------------------------------------- */

let idMapCache: Map<string, string> | null = null;

async function loadIdMap(): Promise<Map<string, string>> {
  if (idMapCache) return idMapCache;
  const rows = await idb.idMap.toArray();
  idMapCache = new Map(rows.map((r) => [r.tempId, r.realId]));
  return idMapCache;
}

async function rememberId(tempId: string, realId: string) {
  if (tempId === realId) return;
  await idb.idMap.put({ tempId, realId, createdAt: Date.now() });
  if (!idMapCache) idMapCache = new Map();
  idMapCache.set(tempId, realId);
}

function substitute(value: string, map: Map<string, string>): string {
  let out = value;
  for (const [temp, real] of map) {
    if (out.includes(temp)) out = out.split(temp).join(real);
  }
  return out;
}

function rewriteMutation(mut: QueuedMutation, map: Map<string, string>): QueuedMutation {
  if (map.size === 0) return mut;
  const url = substitute(mut.url, map);
  let body = mut.body;
  if (body !== undefined && body !== null) {
    try {
      const json = JSON.stringify(body);
      const replaced = substitute(json, map);
      if (replaced !== json) body = JSON.parse(replaced);
    } catch {
      /* body not serializable - skip */
    }
  }
  return { ...mut, url, body };
}

function isCreateDomain(d: QueuedMutation['domain']) {
  return d.endsWith(':create');
}

/* --- network send ------------------------------------------------------- */

async function send(mut: QueuedMutation) {
  const res = await fetch(mut.url, {
    method: mut.method,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Id': mut.clientId,
      'X-Idempotency-Key': mut.clientId,
    },
    body: JSON.stringify(mut.body),
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let humanMessage = `${res.status} ${res.statusText}`;
    try {
      const parsed = JSON.parse(text) as { error?: string; issues?: { message: string }[] };
      if (parsed.issues && parsed.issues.length > 0) {
        const issueText = parsed.issues
          .slice(0, 2)
          .map((i) => i.message)
          .join('; ');
        humanMessage = parsed.error ? `${parsed.error}: ${issueText}` : issueText;
      } else if (parsed.error) {
        humanMessage = parsed.error;
      } else if (text) {
        humanMessage += ` · ${text}`;
      }
    } catch {
      if (text) humanMessage += ` · ${text}`;
    }
    const err = new Error(humanMessage);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined;
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

function invalidateAfter(mut: QueuedMutation) {
  for (const key of mut.invalidateKeys) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}

/* --- main loop ---------------------------------------------------------- */

export async function processQueueOnce(): Promise<void> {
  if (running) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  running = true;
  try {
    const pending = await listPending();
    const map = await loadIdMap();
    let nextAttemptForBackoff = Number.POSITIVE_INFINITY;
    for (const original of pending) {
      if (original.status === 'failed' && original.attempts >= MAX_ATTEMPTS) continue;
      const mut = rewriteMutation(original, map);
      await setStatus(mut.clientId, 'syncing', { attempts: mut.attempts + 1 });
      notify();
      try {
        const response = await send({ ...mut, attempts: mut.attempts + 1 });
        if (
          isCreateDomain(mut.domain) &&
          response &&
          typeof response === 'object' &&
          typeof (response as { id?: unknown }).id === 'string'
        ) {
          await rememberId(mut.clientId, (response as { id: string }).id);
        }
        await remove(mut.clientId);
        invalidateAfter(mut);
        notify();
      } catch (err) {
        const status = (err as Error & { status?: number }).status;
        const message = (err as Error).message;
        const attempts = original.attempts + 1;
        const isClientErr = !!(status && isClientError(status));
        const giveUp = isClientErr || attempts >= MAX_ATTEMPTS;
        await setStatus(mut.clientId, giveUp ? 'failed' : 'pending', {
          attempts: isClientErr ? MAX_ATTEMPTS : attempts,
          lastError: message,
        });
        if (giveUp && isClientErr) {
          if (status === 401) {
            window.dispatchEvent(new CustomEvent('agrosbo:session-expired'));
            toast.error('Sesión expirada', {
              description:
                'Tu sesión ha caducado. Inicia sesión de nuevo para sincronizar los cambios pendientes.',
              duration: 8000,
            });
          } else {
            toast.error('Error al guardar cambios', { description: message });
          }
        }
        notify();
        if (!giveUp) nextAttemptForBackoff = Math.min(nextAttemptForBackoff, attempts);
      }
    }
    if (nextAttemptForBackoff !== Number.POSITIVE_INFINITY) {
      scheduleNext(nextAttemptForBackoff);
    }
  } finally {
    running = false;
  }
}

function scheduleNext(attempts: number) {
  const delay = backoff(attempts);
  if (scheduled !== null) window.clearTimeout(scheduled);
  scheduled = window.setTimeout(() => {
    scheduled = null;
    void processQueueOnce();
  }, delay);
}

export function triggerSync() {
  if (scheduled !== null) {
    window.clearTimeout(scheduled);
    scheduled = null;
  }
  void processQueueOnce();
}

export function startSyncEngine() {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;
  window.addEventListener('online', () => {
    notify();
    void processQueueOnce();
  });
  window.addEventListener('offline', () => notify());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void processQueueOnce();
  });
  setTimeout(() => void processQueueOnce(), 500);
}
