export const OPERATING_MODE = "paper" as const;
export const LIVE_TRADING_ENABLED = false as const;

export const SUPPORTED_INSTRUMENTS = ["EURUSD", "GBPUSD", "USDJPY"] as const;
export type SupportedInstrument = (typeof SUPPORTED_INSTRUMENTS)[number];

export const STRATEGY_TYPES = ["moving_average", "momentum", "mean_reversion"] as const;
export type StrategyType = (typeof STRATEGY_TYPES)[number];

export type TradingDecision = "buy" | "sell" | "wait";
export type PositionSide = Exclude<TradingDecision, "wait">;

export type StrategyParameters = {
  fastPeriod: number;
  slowPeriod: number;
  decisionThreshold: number;
  stopLossPips: number;
  takeProfitPips: number;
};

export const DEFAULT_STRATEGY_PARAMETERS: StrategyParameters = {
  fastPeriod: 9,
  slowPeriod: 21,
  decisionThreshold: 0.0003,
  stopLossPips: 18,
  takeProfitPips: 30,
};

export const DEFAULT_RISK_CONTROLS = {
  maxRiskPerTradePercent: 1,
  maxDailyLoss: 250,
  maxTradesPerDay: 5,
  maxOpenPositions: 2,
  requireStopLoss: true,
  requireTakeProfit: true,
} as const;

export type RiskSnapshot = {
  maxRiskPerTradePercent: number;
  maxDailyLoss: number;
  maxTradesPerDay: number;
  maxOpenPositions: number;
  requireStopLoss: boolean;
  requireTakeProfit: boolean;
};

export type PriceCandle = {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type RiskCheck = {
  approved: boolean;
  reason?: "paper_mode_required" | "daily_loss_limit" | "daily_trade_limit" | "open_position_limit" | "risk_limit" | "protective_orders_required";
};

export type PaperOrderIntent = {
  symbol: SupportedInstrument;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
};

export type BacktestMetrics = {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  netPnl: number;
  averageWin: number;
  averageLoss: number;
};

export function toMoney(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
