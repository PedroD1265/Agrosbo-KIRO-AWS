/**
 * Lightweight relative-time helpers for Today surfaces.
 * Pure client utilities — no data layer impact, dual-safe.
 */
export function relativeFromNow(iso: string, now = new Date()): string {
  const t = new Date(iso).getTime();
  const diff = t - now.getTime();
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  const hr = Math.round(abs / 3600000);
  const day = Math.round(abs / 86400000);
  const past = diff < 0;
  let core: string;
  if (min < 1) core = "ahora";
  else if (min < 60) core = `${min} min`;
  else if (hr < 24) core = `${hr} h`;
  else core = `${day} d`;
  if (core === "ahora") return "ahora";
  return past ? `hace ${core}` : `en ${core}`;
}

export function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
}
