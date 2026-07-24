/**
 * API response types.
 *
 * These mirror the server-side interfaces that the API returns as JSON.
 * They live here so the frontend never imports directly from `api/src/*`.
 */
import type { Campaign, ScopeType } from "@shared/schema";

// --- Campaign Summary (from api/src/campaignSummary.ts) ---
export interface CampaignSummary {
  campaign: Campaign;
  tasks: { total: number; pending: number; in_progress: number; done: number; overdue: number };
  irrigation: { total: number; done: number; scheduled: number; skipped: number; totalDurationMin: number; totalVolumeL: number };
  observations: { total: number; byType: Record<string, number> };
  harvest: {
    lots: number;
    totalQuantity: number;
    unitMix: Record<string, number>;
    revenue: number;
    cost: number;
    margin: number;
    currency: string | null;
  };
  costs: { fromMovements: number; currency: string | null };
}

// --- Irrigation Advisor (from api/src/irrigationAdvisor.ts) ---
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

// --- Expenses (from api/src/expenses.ts) ---
export interface CostBreakdown {
  totalBOB: number;
  byCategory: Record<string, number>;
  count: number;
  laborTotal: number;
}
