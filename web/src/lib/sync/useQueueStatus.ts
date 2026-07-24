import { useEffect, useState } from "react";
import { counts as queueCounts } from "@/lib/sync/queue";
import { subscribeQueue, triggerSync } from "@/lib/sync/engine";

export interface QueueStatusSnapshot {
  online: boolean;
  pending: number;
  syncing: number;
  failed: number;
}

const initial: QueueStatusSnapshot = {
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  pending: 0,
  syncing: 0,
  failed: 0,
};

export function useQueueStatus() {
  const [snap, setSnap] = useState<QueueStatusSnapshot>(initial);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const c = await queueCounts();
      if (cancelled) return;
      setSnap({
        online: typeof navigator !== "undefined" ? navigator.onLine : true,
        ...c,
      });
    };

    refresh();
    const off = subscribeQueue(refresh);
    const onOnline = () => refresh();
    const onOffline = () => refresh();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const interval = window.setInterval(refresh, 4000);
    return () => {
      cancelled = true;
      off();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(interval);
    };
  }, []);

  return { ...snap, triggerSync };
}
