import type { Block, Greenhouse, IrrigationEvent, Campaign, ScopeType, WeatherForecast } from "@agrosbo/shared/schema.js";
import { findCrop, estimateStage } from "@agrosbo/shared/cropCatalog.js";

export type IrrigationRecommendation = "irrigate_now" | "irrigate_soon" | "wait" | "monitor" | "unknown";

export interface IrrigationAdvice {
  scopeType: ScopeType;
  scopeId: string;
  scopeName: string;
  recommendation: IrrigationRecommendation;
  severity: "critical" | "warn" | "info" | "ok";
  reason: string;
  confidence: "high" | "medium" | "low";
  sourceData: {
    lastIrrigation: string | null;
    hoursSinceIrrigation: number | null;
    nextScheduled: string | null;
    todayPrecipMm: number | null;
    todayPrecipProb: number | null;
    tomorrowPrecipMm: number | null;
    stageHint: string | null;
    isGreenhouse: boolean;
    weatherStale: boolean;
  };
}

interface AdviceInput {
  scope: Block | Greenhouse;
  scopeType: ScopeType;
  irrigationEvents: IrrigationEvent[];
  campaign?: Campaign;
  forecast?: WeatherForecast | null;
  now?: Date;
}

export function buildIrrigationAdvice(i: AdviceInput): IrrigationAdvice {
  const now = i.now ?? new Date();
  const isGreenhouse = i.scopeType === "greenhouse";
  const events = i.irrigationEvents
    .filter((e) => e.scopeType === i.scopeType && e.scopeId === i.scope.id)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const lastDone = [...events].reverse().find((e) => e.status === "done");
  const nextSched = events.find((e) => e.status !== "done" && e.status !== "skipped"
    && new Date(e.scheduledAt).getTime() >= now.getTime());

  const hoursSince = lastDone
    ? (now.getTime() - new Date(lastDone.scheduledAt).getTime()) / 3_600_000
    : null;
  const today = i.forecast?.daily?.[0];
  const tomorrow = i.forecast?.daily?.[1];

  let stageHint: string | null = null;
  let stageNeedsWater = false;
  if (i.campaign) {
    const crop = findCrop(i.campaign.crop);
    if (crop) {
      const est = estimateStage(crop, i.campaign.startDate, now);
      if (est.current) {
        stageHint = est.current.label;
        if (est.current.irrigationNotes?.toLowerCase().includes("crítica")
          || est.current.irrigationNotes?.toLowerCase().includes("sensible")) {
          stageNeedsWater = true;
        }
      }
    }
  }

  const sourceData = {
    lastIrrigation: lastDone?.scheduledAt ?? null,
    hoursSinceIrrigation: hoursSince,
    nextScheduled: nextSched?.scheduledAt ?? null,
    todayPrecipMm: today?.precipMm ?? null,
    todayPrecipProb: today?.precipProb ?? null,
    tomorrowPrecipMm: tomorrow?.precipMm ?? null,
    stageHint,
    isGreenhouse,
    weatherStale: i.forecast?.stale ?? false,
  };

  if (isGreenhouse) {
    if (hoursSince === null) {
      return { scopeType: i.scopeType, scopeId: i.scope.id, scopeName: i.scope.name,
        recommendation: "monitor", severity: "info",
        reason: "Sin riegos previos registrados. Confirma estado del cultivo.",
        confidence: "low", sourceData };
    }
    if (hoursSince >= 36) {
      return { scopeType: i.scopeType, scopeId: i.scope.id, scopeName: i.scope.name,
        recommendation: "irrigate_now", severity: "critical",
        reason: `Invernadero sin riego hace ${Math.floor(hoursSince)}h.`,
        confidence: "high", sourceData };
    }
    if (hoursSince >= 24) {
      return { scopeType: i.scopeType, scopeId: i.scope.id, scopeName: i.scope.name,
        recommendation: "irrigate_soon", severity: "warn",
        reason: `Invernadero requiere riego pronto (${Math.floor(hoursSince)}h sin agua).`,
        confidence: "high", sourceData };
    }
    return { scopeType: i.scopeType, scopeId: i.scope.id, scopeName: i.scope.name,
      recommendation: "wait", severity: "ok",
      reason: `Riego reciente (${Math.floor(hoursSince)}h).`,
      confidence: "medium", sourceData };
  }

  if (!i.forecast) {
    if (hoursSince === null) {
      return { scopeType: i.scopeType, scopeId: i.scope.id, scopeName: i.scope.name,
        recommendation: "unknown", severity: "info",
        reason: "Sin datos climáticos ni historial de riego.",
        confidence: "low", sourceData };
    }
    return { scopeType: i.scopeType, scopeId: i.scope.id, scopeName: i.scope.name,
      recommendation: hoursSince >= 48 ? "irrigate_soon" : "monitor",
      severity: hoursSince >= 48 ? "warn" : "info",
      reason: `Sin pronóstico. Último riego hace ${Math.floor(hoursSince)}h.`,
      confidence: "low", sourceData };
  }

  const heavyRainSoon = (today?.precipMm ?? 0) >= 8 || (tomorrow?.precipMm ?? 0) >= 12;
  const lightRainLikely = (today?.precipProb ?? 0) >= 60 && (today?.precipMm ?? 0) >= 3;

  if (heavyRainSoon) {
    return { scopeType: i.scopeType, scopeId: i.scope.id, scopeName: i.scope.name,
      recommendation: "wait", severity: "info",
      reason: `Lluvia fuerte esperada (${(today?.precipMm ?? 0).toFixed(1)}mm hoy / ${(tomorrow?.precipMm ?? 0).toFixed(1)}mm mañana). Diferir riego.`,
      confidence: "high", sourceData };
  }

  if (lightRainLikely && (hoursSince ?? 0) < 36) {
    return { scopeType: i.scopeType, scopeId: i.scope.id, scopeName: i.scope.name,
      recommendation: "monitor", severity: "info",
      reason: `Lluvia probable (${today?.precipProb}%). Monitorear humedad del suelo.`,
      confidence: "medium", sourceData };
  }

  if (hoursSince === null) {
    return { scopeType: i.scopeType, scopeId: i.scope.id, scopeName: i.scope.name,
      recommendation: "monitor", severity: "info",
      reason: "Sin riegos previos registrados.",
      confidence: "low", sourceData };
  }

  const threshold = stageNeedsWater ? 36 : 60;
  if (hoursSince >= threshold + 12) {
    return { scopeType: i.scopeType, scopeId: i.scope.id, scopeName: i.scope.name,
      recommendation: "irrigate_now",
      severity: "critical",
      reason: stageNeedsWater
        ? `Etapa sensible (${stageHint}) y ${Math.floor(hoursSince)}h sin riego.`
        : `${Math.floor(hoursSince)}h sin riego y sin lluvia próxima.`,
      confidence: "high", sourceData };
  }
  if (hoursSince >= threshold) {
    return { scopeType: i.scopeType, scopeId: i.scope.id, scopeName: i.scope.name,
      recommendation: "irrigate_soon", severity: "warn",
      reason: `Considerar regar pronto (${Math.floor(hoursSince)}h sin agua${stageHint ? `, etapa: ${stageHint}` : ""}).`,
      confidence: "high", sourceData };
  }

  return { scopeType: i.scopeType, scopeId: i.scope.id, scopeName: i.scope.name,
    recommendation: "wait", severity: "ok",
    reason: `Riego reciente (${Math.floor(hoursSince)}h). Sin urgencia.`,
    confidence: "medium", sourceData };
}
