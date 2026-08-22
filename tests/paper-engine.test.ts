import { describe, expect, it } from "vitest";

import { DEFAULT_STRATEGY_PARAMETERS } from "../shared/trading";
import {
  assessPaperRisk,
  buildPaperOrder,
  decideFromMovingAverage,
  runPaperBacktest,
} from "../server/trading/engine";
import { buildDemoPaperCandles } from "../server/trading/demo-market";
import { mt5Bridge } from "../server/trading/mt5-bridge";

const controls = {
  maxRiskPerTradePercent: 1,
  maxDailyLoss: 250,
  maxTradesPerDay: 5,
  maxOpenPositions: 2,
  requireStopLoss: true,
  requireTakeProfit: true,
};

describe("AkiTrade paper engine", () => {
  it("waits until it has sufficient completed candles", () => {
    const result = decideFromMovingAverage(buildDemoPaperCandles("EURUSD", 8), DEFAULT_STRATEGY_PARAMETERS);
    expect(result.decision).toBe("wait");
  });

  it("builds a BUY paper order with stop-loss and take-profit", () => {
    const order = buildPaperOrder("EURUSD", "buy", 1.1, 10_000, controls, DEFAULT_STRATEGY_PARAMETERS);
    expect(order.stopLoss).toBeLessThan(order.entryPrice);
    expect(order.takeProfit).toBeGreaterThan(order.entryPrice);
    expect(order.riskAmount).toBe(100);
  });

  it("rejects every operation outside paper-only mode", () => {
    const risk = assessPaperRisk({
      operatingMode: "live",
      liveTradingEnabled: true,
      accountEquity: 10_000,
      dailyRealizedPnl: 0,
      tradesOpenedToday: 0,
      openPositions: 0,
      proposedRiskAmount: 100,
      hasStopLoss: true,
      hasTakeProfit: true,
      controls,
    });
    expect(risk).toEqual({ approved: false, reason: "paper_mode_required" });
  });

  it("blocks a new paper order after the maximum daily loss", () => {
    const risk = assessPaperRisk({
      operatingMode: "paper",
      liveTradingEnabled: false,
      accountEquity: 10_000,
      dailyRealizedPnl: -250,
      tradesOpenedToday: 1,
      openPositions: 0,
      proposedRiskAmount: 100,
      hasStopLoss: true,
      hasTakeProfit: true,
      controls,
    });
    expect(risk).toEqual({ approved: false, reason: "daily_loss_limit" });
  });

  it("runs a deterministic paper backtest without any broker connection", () => {
    const result = runPaperBacktest(buildDemoPaperCandles("EURUSD"), "EURUSD", DEFAULT_STRATEGY_PARAMETERS, 10_000);
    expect(result.endingBalance).toBeTypeOf("number");
    expect(result.metrics.totalTrades).toBeGreaterThan(0);
    expect(Number.isFinite(result.metrics.netPnl)).toBe(true);
  });

  it("rejects all MT5 live-order requests in version one", async () => {
    await expect(mt5Bridge.requestLiveOrder()).rejects.toThrow("Live trading is intentionally disabled");
  });
});
