export const LIVE_TRADING_ENABLED = false as const;
/** Backward-compatible server operating mode; all execution remains paper-first. */
export const OPERATING_MODE = "paper" as const;

export const SUPPORTED_INSTRUMENTS = ["EURUSD", "GBPUSD", "USDJPY"] as const;
export type SupportedInstrument = (typeof SUPPORTED_INSTRUMENTS)[number];

export const STRATEGY_TYPES = ["moving_average", "momentum", "mean_reversion"] as const;
export type StrategyType = (typeof STRATEGY_TYPES)[number];

export const TRADING_PLATFORMS = [
  "mt4_bridge",
  "mt5_bridge",
  "exness_mt4",
  "exness_mt5",
  "ctrader",
  "interactive_brokers",
  "alpaca",
  "binance",
  "oanda",
  "generic_official_api",
] as const;
export type TradingPlatform = (typeof TRADING_PLATFORMS)[number];

export type BrokerEnvironment = "demo" | "paper" | "live";
export type TradingDecision = "buy" | "sell" | "wait";
export type PositionSide = Exclude<TradingDecision, "wait">;
export type NormalizedOrderStatus = "pending" | "accepted" | "partially_filled" | "filled" | "cancelled" | "rejected" | "failed";

export type PlatformCapabilities = {
  account: boolean;
  marketData: boolean;
  positions: boolean;
  orders: boolean;
  orderStatus: boolean;
  tradeHistory: boolean;
  demo: boolean;
  live: boolean;
};

export type NormalizedAccount = {
  platform: TradingPlatform;
  accountReference: string;
  currency: string;
  balance: number;
  equity: number;
  marginUsed: number;
  availableMargin: number;
  environment: BrokerEnvironment;
};

export type NormalizedMarketQuote = {
  platform: TradingPlatform;
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  timestamp: Date;
};

export type NormalizedPosition = {
  platform: TradingPlatform;
  positionReference: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: Date;
};

export type UnifiedOrderIntent = {
  platform: TradingPlatform;
  connectionId: number;
  idempotencyKey: string;
  environment: BrokerEnvironment;
  symbol: string;
  side: PositionSide;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  source: "user" | "strategy" | "ai_recommendation";
};

export type NormalizedTradeHistoryEntry = {
  platform: TradingPlatform;
  tradeReference: string;
  orderReference: string | null;
  symbol: string;
  side: PositionSide;
  quantity: number;
  realizedPnl: number;
  openedAt: Date;
  closedAt: Date | null;
};

export type AiRecommendation = {
  decision: TradingDecision;
  confidence: number;
  rationale: string;
  riskFactors: string[];
  requiresRiskApproval: true;
  mayDispatchOrder: false;
};

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
  reason?: "paper_mode_required" | "daily_loss_limit" | "daily_trade_limit" | "open_position_limit" | "risk_limit" | "protective_orders_required" | "emergency_stop" | "ai_recommendation_requires_approval";
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
