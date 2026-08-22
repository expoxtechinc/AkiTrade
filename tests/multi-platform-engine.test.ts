import { describe, expect, it } from "vitest";

import { brokerAdapterRegistry, assessFutureExecution } from "../server/trading/broker-contract";
import { validateAiRecommendation } from "../server/trading/ai-analysis";
import { assessUniversalRisk, riskGateAiRecommendation } from "../server/trading/universal-risk";
import { DEFAULT_RISK_CONTROLS } from "../shared/trading";

describe("multi-platform trading controls", () => {
  it("registers every requested official adapter boundary without enabling order dispatch", async () => {
    for (const provider of ["mt4_bridge", "mt5_bridge", "exness_mt4", "exness_mt5", "ctrader", "interactive_brokers", "alpaca", "binance"] as const) {
      expect(brokerAdapterRegistry[provider].capabilities.account).toBe(true);
      await expect(brokerAdapterRegistry[provider].validateOrder({
        platform: provider,
        connectionId: 1,
        idempotencyKey: `${provider}-test`,
        environment: "paper",
        symbol: "EURUSD",
        side: "buy",
        quantity: 1,
        stopLoss: 1,
        takeProfit: 2,
        source: "user",
      })).resolves.toMatchObject({ accepted: false });
    }
  });

  it("blocks an AI-originated order before a broker adapter could receive it", () => {
    expect(assessFutureExecution({ environment: "demo", liveTradingEnabled: false, connectionStatus: "ready", userConsentStatus: null, hasStopLoss: true, hasTakeProfit: true, source: "ai_recommendation" })).toMatchObject({ allowed: false, reason: "ai_recommendation_requires_approval" });
  });

  it("passes every AI recommendation through the universal risk gate and honors emergency stop", () => {
    const recommendation = validateAiRecommendation({ decision: "wait", confidence: 0.2, rationale: "Insufficient signal quality.", riskFactors: ["limited market context"] });
    const riskInput = { controls: { ...DEFAULT_RISK_CONTROLS }, accountEquity: 10000, proposedRiskAmount: 100, dailyRealizedPnl: 0, tradesOpenedToday: 0, openPositions: 0, hasStopLoss: true, hasTakeProfit: true, emergencyStopActive: true };
    expect(assessUniversalRisk(riskInput)).toEqual({ approved: false, reason: "emergency_stop" });
    expect(riskGateAiRecommendation(recommendation, riskInput)).toMatchObject({ orderDispatchAllowed: false, status: "recommendation_blocked_by_risk" });
  });
});
