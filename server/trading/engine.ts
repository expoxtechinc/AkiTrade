import type {
  BacktestMetrics,
  PaperOrderIntent,
  PositionSide,
  PriceCandle,
  RiskCheck,
  RiskSnapshot,
  StrategyParameters,
  SupportedInstrument,
  TradingDecision,
} from "../../shared/trading";

export type RiskEvaluationInput = {
  operatingMode: "paper" | "live";
  liveTradingEnabled: boolean;
  accountEquity: number;
  dailyRealizedPnl: number;
  tradesOpenedToday: number;
  openPositions: number;
  proposedRiskAmount: number;
  hasStopLoss: boolean;
  hasTakeProfit: boolean;
  controls: RiskSnapshot;
};

export type PaperBacktestTrade = {
  entryTimestamp: Date;
  exitTimestamp: Date;
  side: PositionSide;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
};

export type PaperBacktestResult = {
  metrics: BacktestMetrics;
  trades: PaperBacktestTrade[];
  endingBalance: number;
};

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pipSize(symbol: string) {
  return symbol.endsWith("JPY") ? 0.01 : 0.0001;
}

function rounded(value: number, places = 5) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** A transparent rule engine for paper execution; insufficient data and low-conviction results always WAIT. */
export function decideFromMovingAverage(
  candles: PriceCandle[],
  parameters: StrategyParameters,
): { decision: TradingDecision; rationale: string } {
  if (candles.length < parameters.slowPeriod) {
    return { decision: "wait", rationale: "Waiting for sufficient completed price candles." };
  }

  const closes = candles.map((candle) => candle.close);
  const fast = average(closes.slice(-parameters.fastPeriod));
  const slow = average(closes.slice(-parameters.slowPeriod));
  const threshold = closes.at(-1)! * parameters.decisionThreshold;
  const gap = fast - slow;

  if (gap > threshold) {
    return { decision: "buy", rationale: "Fast average is above the slow average beyond the configured threshold." };
  }
  if (gap < -threshold) {
    return { decision: "sell", rationale: "Fast average is below the slow average beyond the configured threshold." };
  }
  return { decision: "wait", rationale: "Average gap is below the configured decision threshold." };
}

/** The safety gate is independent of the decision engine and must approve every paper order. */
export function assessPaperRisk(input: RiskEvaluationInput): RiskCheck {
  if (input.operatingMode !== "paper" || input.liveTradingEnabled) {
    return { approved: false, reason: "paper_mode_required" };
  }
  if (input.dailyRealizedPnl <= -Math.abs(input.controls.maxDailyLoss)) {
    return { approved: false, reason: "daily_loss_limit" };
  }
  if (input.tradesOpenedToday >= input.controls.maxTradesPerDay) {
    return { approved: false, reason: "daily_trade_limit" };
  }
  if (input.openPositions >= input.controls.maxOpenPositions) {
    return { approved: false, reason: "open_position_limit" };
  }
  if (
    (input.controls.requireStopLoss && !input.hasStopLoss) ||
    (input.controls.requireTakeProfit && !input.hasTakeProfit)
  ) {
    return { approved: false, reason: "protective_orders_required" };
  }
  const riskPercent = (input.proposedRiskAmount / Math.max(input.accountEquity, 0.01)) * 100;
  if (!Number.isFinite(riskPercent) || riskPercent > input.controls.maxRiskPerTradePercent) {
    return { approved: false, reason: "risk_limit" };
  }
  return { approved: true };
}

/** Calculates a paper order whose defined loss at stop equals the requested risk amount. */
export function buildPaperOrder(
  symbol: SupportedInstrument,
  side: PositionSide,
  entryPrice: number,
  accountEquity: number,
  controls: RiskSnapshot,
  parameters: StrategyParameters,
): PaperOrderIntent {
  const size = pipSize(symbol);
  const riskAmount = rounded(accountEquity * (controls.maxRiskPerTradePercent / 100), 2);
  const stopDistance = parameters.stopLossPips * size;
  const takeProfitDistance = parameters.takeProfitPips * size;
  const stopLoss = side === "buy" ? entryPrice - stopDistance : entryPrice + stopDistance;
  const takeProfit = side === "buy" ? entryPrice + takeProfitDistance : entryPrice - takeProfitDistance;
  const quantity = rounded(riskAmount / Math.max(stopDistance, Number.EPSILON), 2);

  return {
    symbol,
    side,
    quantity,
    entryPrice: rounded(entryPrice),
    stopLoss: rounded(stopLoss),
    takeProfit: rounded(takeProfit),
    riskAmount,
  };
}

export function calculatePaperPnl(side: PositionSide, entryPrice: number, exitPrice: number, quantity: number) {
  const movement = side === "buy" ? exitPrice - entryPrice : entryPrice - exitPrice;
  return rounded(movement * quantity, 2);
}

/** Runs a deterministic paper-only backtest over caller-provided candles; it never connects to a broker. */
export function runPaperBacktest(
  candles: PriceCandle[],
  symbol: SupportedInstrument,
  parameters: StrategyParameters,
  startingBalance: number,
): PaperBacktestResult {
  let balance = startingBalance;
  let peakBalance = startingBalance;
  let maxDrawdown = 0;
  const trades: PaperBacktestTrade[] = [];

  for (let index = parameters.slowPeriod; index < candles.length - 1; index += 1) {
    const window = candles.slice(0, index + 1);
    const next = candles[index + 1];
    const { decision } = decideFromMovingAverage(window, parameters);
    if (decision === "wait") continue;

    const entry = candles[index].close;
    const exit = next.close;
    const risk = { maxRiskPerTradePercent: 1, maxDailyLoss: Number.MAX_SAFE_INTEGER, maxTradesPerDay: 1_000_000, maxOpenPositions: 1, requireStopLoss: true, requireTakeProfit: true };
    const order = buildPaperOrder(symbol, decision, entry, balance, risk, parameters);
    const pnl = calculatePaperPnl(decision, entry, exit, order.quantity);
    balance = rounded(balance + pnl, 2);
    peakBalance = Math.max(peakBalance, balance);
    maxDrawdown = Math.max(maxDrawdown, peakBalance - balance);
    trades.push({ entryTimestamp: candles[index].timestamp, exitTimestamp: next.timestamp, side: decision, entryPrice: entry, exitPrice: exit, pnl });
  }

  const winners = trades.filter((trade) => trade.pnl > 0);
  const losers = trades.filter((trade) => trade.pnl < 0);
  const grossProfit = winners.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(losers.reduce((sum, trade) => sum + trade.pnl, 0));

  return {
    trades,
    endingBalance: balance,
    metrics: {
      totalTrades: trades.length,
      winRate: trades.length ? rounded((winners.length / trades.length) * 100, 2) : 0,
      profitFactor: grossLoss ? rounded(grossProfit / grossLoss, 2) : 0,
      maxDrawdown: rounded(maxDrawdown, 2),
      netPnl: rounded(balance - startingBalance, 2),
      averageWin: winners.length ? rounded(grossProfit / winners.length, 2) : 0,
      averageLoss: losers.length ? rounded(losers.reduce((sum, trade) => sum + trade.pnl, 0) / losers.length, 2) : 0,
    },
  };
}
