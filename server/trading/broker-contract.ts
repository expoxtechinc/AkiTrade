export const BROKER_PROVIDERS = ["ctrader", "oanda", "mt4_bridge", "mt5_bridge"] as const;
export type BrokerProvider = (typeof BROKER_PROVIDERS)[number];

export type BrokerConnectionMode = "oauth" | "server_token" | "terminal_bridge";
export type BrokerEnvironment = "demo" | "live";

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
  connectionStatus: "pending" | "read_only" | "ready" | "revoked" | "error";
  userConsentStatus: "pending" | "acknowledged" | "revoked" | null;
  hasStopLoss: boolean;
  hasTakeProfit: boolean;
};

/** Returns a user-facing next step without receiving, persisting, or echoing a broker password. */
export function getBrokerAuthorizationInstruction(
  provider: BrokerProvider,
  environment: BrokerEnvironment,
): BrokerAuthorizationInstruction {
  if (provider === "ctrader") {
    return {
      provider,
      connectionMode: "oauth",
      environment,
      status: "pending",
      instruction: "Authorize the account through cTrader’s supported application authorization flow. AkiTrade will store only an opaque server-side authorization reference.",
    };
  }
  if (provider === "oanda") {
    return {
      provider,
      connectionMode: "server_token",
      environment,
      status: "pending",
      instruction: "Create a revocable broker API token in the broker portal and add it only to the secure server configuration through an approved per-user secret-vault flow; never paste it into the app.",
    };
  }
  return {
    provider,
    connectionMode: "terminal_bridge",
    environment,
    status: "pending",
    instruction: "Install the signed AkiTrade bridge alongside your own MT4 or MT5 terminal. The terminal retains the broker session; it exposes only signed, scoped bridge messages to AkiTrade.",
  };
}

/** This release can validate a normalized order but may never send a broker order. */
export function assessFutureExecution(request: NormalizedExecutionRequest) {
  if (request.environment === "live" && !request.liveTradingEnabled) {
    return { allowed: false, status: "blocked" as const, reason: "live_execution_feature_disabled" };
  }
  if (request.connectionStatus !== "ready") {
    return { allowed: false, status: "blocked" as const, reason: "broker_connection_not_ready" };
  }
  if (request.environment === "live" && request.userConsentStatus !== "acknowledged") {
    return { allowed: false, status: "blocked" as const, reason: "explicit_live_consent_required" };
  }
  if (!request.hasStopLoss || !request.hasTakeProfit) {
    return { allowed: false, status: "rejected" as const, reason: "protective_orders_required" };
  }
  return { allowed: true, status: "validated" as const };
}
