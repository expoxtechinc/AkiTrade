import type { AiRecommendation, RiskCheck, RiskSnapshot } from "../../shared/trading";
import { assessPaperRisk } from "./engine";

export type UniversalRiskInput = {
  controls: RiskSnapshot;
  accountEquity: number;
  proposedRiskAmount: number;
  dailyRealizedPnl: number;
  tradesOpenedToday: number;
  openPositions: number;
  hasStopLoss: boolean;
  hasTakeProfit: boolean;
  emergencyStopActive: boolean;
};

/**
 * The universal safety gate is intentionally provider-neutral. Broker adapters may not bypass it.
 * Version one applies the established paper constraints to every recommendation and intent.
 */
export function assessUniversalRisk(input: UniversalRiskInput): RiskCheck {
  if (input.emergencyStopActive) return { approved: false, reason: "emergency_stop" };
  return assessPaperRisk({
    operatingMode: "paper",
    liveTradingEnabled: false,
    controls: input.controls,
    accountEquity: input.accountEquity,
    proposedRiskAmount: input.proposedRiskAmount,
    dailyRealizedPnl: input.dailyRealizedPnl,
    tradesOpenedToday: input.tradesOpenedToday,
    openPositions: input.openPositions,
    hasStopLoss: input.hasStopLoss,
    hasTakeProfit: input.hasTakeProfit,
  });
}

export function riskGateAiRecommendation(recommendation: AiRecommendation, riskInput: UniversalRiskInput) {
  const riskCheck = assessUniversalRisk(riskInput);
  return {
    recommendation,
    riskCheck,
    orderDispatchAllowed: false as const,
    status: riskCheck.approved ? "recommendation_available_for_user_review" as const : "recommendation_blocked_by_risk" as const,
  };
}
