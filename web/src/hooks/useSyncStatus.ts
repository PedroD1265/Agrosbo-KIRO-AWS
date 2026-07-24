import { useQueueStatus } from "@/lib/sync/useQueueStatus";

/**
 * Backwards-compatible facade. The real source of truth is the offline
 * mutation queue (IndexedDB). All consumers now read live counters from it.
 */
export function useSyncStatus() {
  const { online, pending, syncing, failed, triggerSync } = useQueueStatus();
  return { online, pending, syncing, failed, triggerSync };
}
