import type {
  BrokerEnvironment as SharedBrokerEnvironment,
  NormalizedAccount,
  NormalizedMarketQuote,
  NormalizedPosition,
  NormalizedTradeHistoryEntry,
  PlatformCapabilities,
  TradingPlatform,
  UnifiedOrderIntent,
} from "../../shared/trading";
import { TRADING_PLATFORMS } from "../../shared/trading";

export const BROKER_PROVIDERS = TRADING_PLATFORMS;
export type BrokerProvider = TradingPlatform;
export type BrokerConnectionMode = "oauth" | "server_token" | "terminal_bridge";
export type BrokerConnectionStatus = "pending" | "read_only" | "ready" | "revoked" | "error";
export type BrokerEnvironment = Exclude<SharedBrokerEnvironment, "paper">;

export type BrokerAuthorizationInstruction = {
  provider: BrokerProvider;
  connectionMode: BrokerConnectionMode;
  environment: BrokerEnvironment;
  status: "pending" | "read_only";
  instruction: string;
};

export type NormalizedExecutionRequest = {
  environment: BrokerEnvironment;
  liveTradingEnabled: boolean;
  connectionStatus: BrokerConnectionStatus;
  userConsentStatus: "pending" | "acknowledged" | "revoked" | null;
  hasStopLoss: boolean;
  hasTakeProfit: boolean;
  emergencyStopActive?: boolean;
  source?: UnifiedOrderIntent["source"];
};

export interface UnifiedBrokerAdapter {
  readonly provider: BrokerProvider;
  readonly connectionMode: BrokerConnectionMode;
  readonly capabilities: PlatformCapabilities;
  getAuthorizationInstruction(environment: BrokerEnvironment): BrokerAuthorizationInstruction;
  getAccount(connectionReference: string): Promise<NormalizedAccount | null>;
  getMarketQuote(symbol: string): Promise<NormalizedMarketQuote | null>;
  listPositions(connectionReference: string): Promise<NormalizedPosition[]>;
  listTradeHistory(connectionReference: string): Promise<NormalizedTradeHistoryEntry[]>;
  validateOrder(intent: UnifiedOrderIntent): Promise<{ accepted: boolean; reason?: string }>;
  disconnect(connectionReference: string): Promise<{ disconnected: true }>;
}

const commonCapabilities: PlatformCapabilities = {
  account: true,
  marketData: true,
  positions: true,
  orders: true,
  orderStatus: true,
  tradeHistory: true,
  demo: true,
  live: true,
};

function getConnectionMode(provider: BrokerProvider): BrokerConnectionMode {
  if (["mt4_bridge", "mt5_bridge", "exness_mt4", "exness_mt5", "interactive_brokers"].includes(provider)) return "terminal_bridge";
  if (provider === "ctrader") return "oauth";
  return "server_token";
}

function getInstruction(provider: BrokerProvider): string {
  if (provider === "ctrader") return "Complete the official cTrader application authorization flow. AkiTrade stores only an opaque server-side authorization reference.";
  if (["mt4_bridge", "mt5_bridge", "exness_mt4", "exness_mt5"].includes(provider)) return "Install the signed AkiTrade bridge alongside your own desktop MT4/MT5 terminal. The terminal retains the broker session and exposes only signed, scoped messages.";
  if (provider === "interactive_brokers") return "Authorize a user-controlled Interactive Brokers TWS or Gateway connection. AkiTrade stores only a server-side connection reference.";
  if (provider === "alpaca") return "Authorize a scoped Alpaca account through a server-side secret-vault flow. Never paste API keys into the mobile app.";
  if (provider === "binance") return "Authorize a restricted Binance API key through a server-side secret-vault flow with trading permissions disabled until explicitly enabled later.";
  if (provider === "oanda") return "Create a revocable official broker API token and add it only through an approved server-side secret-vault flow; never paste it into the app.";
  return "Connect using the provider’s official OAuth, API, or terminal-bridge authorization method. AkiTrade stores only a server-side reference.";
}

/** Returns a user-facing next step without receiving, persisting, or echoing a broker password. */
export function getBrokerAuthorizationInstruction(provider: BrokerProvider, environment: BrokerEnvironment): BrokerAuthorizationInstruction {
  return { provider, connectionMode: getConnectionMode(provider), environment, status: "pending", instruction: getInstruction(provider) };
}

class CapabilityGatedAdapter implements UnifiedBrokerAdapter {
  readonly connectionMode: BrokerConnectionMode;
  readonly capabilities = commonCapabilities;
  constructor(readonly provider: BrokerProvider) { this.connectionMode = getConnectionMode(provider); }
  getAuthorizationInstruction(environment: BrokerEnvironment) { return getBrokerAuthorizationInstruction(this.provider, environment); }
  async getAccount(): Promise<NormalizedAccount | null> { return null; }
  async getMarketQuote(): Promise<NormalizedMarketQuote | null> { return null; }
  async listPositions(): Promise<NormalizedPosition[]> { return []; }
  async listTradeHistory(): Promise<NormalizedTradeHistoryEntry[]> { return []; }
  async validateOrder(): Promise<{ accepted: boolean; reason?: string }> { return { accepted: false, reason: `${this.provider}_adapter_not_authorized_or_enabled` }; }
  async disconnect(): Promise<{ disconnected: true }> { return { disconnected: true }; }
}

export const brokerAdapterRegistry: Record<BrokerProvider, UnifiedBrokerAdapter> = BROKER_PROVIDERS.reduce(
  (registry, provider) => {
    registry[provider] = new CapabilityGatedAdapter(provider);
    return registry;
  },
  {} as Record<BrokerProvider, UnifiedBrokerAdapter>,
);

export function getBrokerAdapter(provider: BrokerProvider) { return brokerAdapterRegistry[provider]; }

/** Validates a normalized order intent. This release may never dispatch a broker order. */
export function assessFutureExecution(request: NormalizedExecutionRequest) {
  if (request.emergencyStopActive) return { allowed: false, status: "blocked" as const, reason: "emergency_stop" };
  if (request.source === "ai_recommendation") return { allowed: false, status: "blocked" as const, reason: "ai_recommendation_requires_approval" };
  if (request.environment === "live" && !request.liveTradingEnabled) return { allowed: false, status: "blocked" as const, reason: "live_execution_feature_disabled" };
  if (request.connectionStatus !== "ready") return { allowed: false, status: "blocked" as const, reason: "broker_connection_not_ready" };
  if (request.environment === "live" && request.userConsentStatus !== "acknowledged") return { allowed: false, status: "blocked" as const, reason: "explicit_live_consent_required" };
  if (!request.hasStopLoss || !request.hasTakeProfit) return { allowed: false, status: "rejected" as const, reason: "protective_orders_required" };
  return { allowed: true, status: "validated" as const };
}
