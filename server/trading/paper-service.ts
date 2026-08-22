import type { PaperPosition } from "../../drizzle/schema";
import {
  DEFAULT_STRATEGY_PARAMETERS,
  type PriceCandle,
  type RiskSnapshot,
  type StrategyParameters,
  type SupportedInstrument,
  toMoney,
} from "../../shared/trading";
import * as db from "../db";
import { assessPaperRisk, buildPaperOrder, decideFromMovingAverage } from "./engine";

export type PaperCycleResult = {
  symbol: SupportedInstrument;
  decision: "buy" | "sell" | "wait";
  rationale: string;
  riskStatus: "approved" | "blocked" | "not_applicable";
  riskReason?: string;
  paperPositionId?: number;
};

function normalizeParameters(value: unknown): StrategyParameters {
  const candidate = value as Partial<StrategyParameters> | null;
  if (!candidate) return DEFAULT_STRATEGY_PARAMETERS;
  const allNumbers = [candidate.fastPeriod, candidate.slowPeriod, candidate.decisionThreshold, candidate.stopLossPips, candidate.takeProfitPips]
    .every((item) => typeof item === "number" && Number.isFinite(item));
  return allNumbers ? candidate as StrategyParameters : DEFAULT_STRATEGY_PARAMETERS;
}

function normalizeRisk(value: {
  maxRiskPerTradePercent: string;
  maxDailyLoss: string;
  maxTradesPerDay: number;
  maxOpenPositions: number;
  requireStopLoss: boolean;
  requireTakeProfit: boolean;
}): RiskSnapshot {
  return {
    maxRiskPerTradePercent: toMoney(value.maxRiskPerTradePercent),
    maxDailyLoss: toMoney(value.maxDailyLoss),
    maxTradesPerDay: value.maxTradesPerDay,
    maxOpenPositions: value.maxOpenPositions,
    requireStopLoss: value.requireStopLoss,
    requireTakeProfit: value.requireTakeProfit,
  };
}

function accountEquity(startingBalance: string, allPositions: PaperPosition[]) {
  const realized = allPositions.reduce((sum, position) => sum + toMoney(position.realizedPnl), 0);
  const unrealized = allPositions
    .filter((position) => position.status === "open")
    .reduce((sum, position) => {
      const movement = position.side === "buy"
        ? toMoney(position.markPrice) - toMoney(position.entryPrice)
        : toMoney(position.entryPrice) - toMoney(position.markPrice);
      return sum + (movement * toMoney(position.quantity));
    }, 0);
  return Math.max(0, toMoney(startingBalance) + realized + unrealized);
}

/**
 * The only order creation path for version one. It persists a BUY/SELL/WAIT event,
 * independently applies every risk control, and only then creates a paper position.
 */
export async function runPaperDecisionCycle(
  userId: number,
  symbol: SupportedInstrument,
  candles: PriceCandle[],
): Promise<PaperCycleResult> {
  const workspace = await db.ensurePaperWorkspace(userId);
  const instrument = workspace.instruments.find((item) => item.symbol === symbol && item.enabled);
  if (!instrument) throw new Error("This instrument is disabled in your paper workspace");
  const strategy = workspace.strategies.find((item) => item.isActive);
  if (!strategy) throw new Error("Activate a strategy before starting paper automation");

  const parameters = normalizeParameters(strategy.parameters);
  const currentPrice = candles.at(-1)?.close;
  if (!currentPrice || !Number.isFinite(currentPrice)) throw new Error("A valid paper-market price is required");
  const { decision, rationale } = decideFromMovingAverage(candles, parameters);

  if (decision === "wait") {
    await db.recordDecisionEvent(userId, {
      strategyId: strategy.id,
      symbol,
      decision,
      markPrice: currentPrice,
      rationale,
      riskStatus: "not_applicable",
    });
    return { symbol, decision, rationale, riskStatus: "not_applicable" };
  }

  const dashboard = await db.getPaperDashboard(userId);
  const risk = normalizeRisk(workspace.risk);
  const order = buildPaperOrder(symbol, decision, currentPrice, accountEquity(workspace.profile.startingBalance, dashboard.positions), risk, parameters);
  const today = await db.getTodayRiskState(userId);
  const result = assessPaperRisk({
    operatingMode: workspace.profile.operatingMode,
    liveTradingEnabled: workspace.profile.liveTradingEnabled,
    accountEquity: accountEquity(workspace.profile.startingBalance, dashboard.positions),
    dailyRealizedPnl: today.dailyRealizedPnl,
    tradesOpenedToday: today.tradesOpenedToday,
    openPositions: today.openPositions,
    proposedRiskAmount: order.riskAmount,
    hasStopLoss: Number.isFinite(order.stopLoss),
    hasTakeProfit: Number.isFinite(order.takeProfit),
    controls: risk,
  });

  const decisionEventId = await db.recordDecisionEvent(userId, {
    strategyId: strategy.id,
    symbol,
    decision,
    markPrice: currentPrice,
    rationale,
    riskStatus: result.approved ? "approved" : "blocked",
    riskReason: result.reason,
    orderCreated: result.approved,
  });

  if (!result.approved) {
    if (result.reason === "daily_loss_limit") {
      await db.createNotificationEvent(userId, "daily_loss_limit", "Daily paper-loss limit reached", "Paper automation will not create new positions until the next trading day.");
    }
    return { symbol, decision, rationale, riskStatus: "blocked", riskReason: result.reason };
  }

  const paperPositionId = await db.createPaperPosition(userId, {
    strategyId: strategy.id,
    decisionEventId,
    ...order,
  });
  await db.createNotificationEvent(userId, "trade_opened", "Paper position opened", `${symbol} ${decision.toUpperCase()} position opened with stop-loss and take-profit.`, paperPositionId);
  return { symbol, decision, rationale, riskStatus: "approved", paperPositionId };
}
