import {
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Managed OAuth user record. Broker credentials are never represented in this schema. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** One paper workspace per authenticated user. Live mode is explicitly disabled by default. */
export const tradingProfiles = mysqlTable(
  "tradingProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    displayName: varchar("displayName", { length: 128 }).default("Paper workspace").notNull(),
    operatingMode: mysqlEnum("operatingMode", ["paper", "live"]).default("paper").notNull(),
    liveTradingEnabled: boolean("liveTradingEnabled").default(false).notNull(),
    automationStatus: mysqlEnum("automationStatus", ["stopped", "running", "paused"])
      .default("stopped")
      .notNull(),
    accountLabel: varchar("accountLabel", { length: 128 }).default("Demo / Paper").notNull(),
    baseCurrency: varchar("baseCurrency", { length: 8 }).default("USD").notNull(),
    startingBalance: decimal("startingBalance", { precision: 16, scale: 2 }).default("10000.00").notNull(),
    bridgeStatus: mysqlEnum("bridgeStatus", ["not_configured", "healthy", "degraded", "offline"])
      .default("not_configured")
      .notNull(),
    lastBridgeHeartbeatAt: timestamp("lastBridgeHeartbeatAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("tradingProfiles_userId_unique").on(table.userId)],
);

/** Server-enforced limits for paper orders. */
export const riskControls = mysqlTable(
  "riskControls",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    maxRiskPerTradePercent: decimal("maxRiskPerTradePercent", { precision: 5, scale: 2 })
      .default("1.00")
      .notNull(),
    maxDailyLoss: decimal("maxDailyLoss", { precision: 16, scale: 2 }).default("250.00").notNull(),
    maxTradesPerDay: int("maxTradesPerDay").default(5).notNull(),
    maxOpenPositions: int("maxOpenPositions").default(2).notNull(),
    requireStopLoss: boolean("requireStopLoss").default(true).notNull(),
    requireTakeProfit: boolean("requireTakeProfit").default(true).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("riskControls_userId_unique").on(table.userId)],
);

/** Supported symbols are opt-in per workspace. */
export const tradingInstruments = mysqlTable(
  "tradingInstruments",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    symbol: varchar("symbol", { length: 32 }).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("tradingInstruments_user_symbol_unique").on(table.userId, table.symbol)],
);

/** Deterministic, inspectable strategy configuration; no credentials or executable code blobs are stored. */
export const tradingStrategies = mysqlTable(
  "tradingStrategies",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    strategyType: mysqlEnum("strategyType", ["moving_average", "momentum", "mean_reversion"])
      .default("moving_average")
      .notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    parameters: json("parameters").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("tradingStrategies_userId_idx").on(table.userId)],
);

/** Every decision is retained, including WAIT outcomes and risk-gate rejections. */
export const decisionEvents = mysqlTable(
  "decisionEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    strategyId: int("strategyId"),
    symbol: varchar("symbol", { length: 32 }).notNull(),
    decision: mysqlEnum("decision", ["buy", "sell", "wait"]).notNull(),
    markPrice: decimal("markPrice", { precision: 16, scale: 5 }).notNull(),
    rationale: text("rationale").notNull(),
    riskStatus: mysqlEnum("riskStatus", ["approved", "blocked", "not_applicable"]).notNull(),
    riskReason: varchar("riskReason", { length: 255 }),
    orderCreated: boolean("orderCreated").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("decisionEvents_user_created_idx").on(table.userId, table.createdAt)],
);

/** Active and completed simulated positions. All fills in version one are paper fills. */
export const paperPositions = mysqlTable(
  "paperPositions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    strategyId: int("strategyId"),
    decisionEventId: int("decisionEventId"),
    symbol: varchar("symbol", { length: 32 }).notNull(),
    side: mysqlEnum("side", ["buy", "sell"]).notNull(),
    status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
    entryPrice: decimal("entryPrice", { precision: 16, scale: 5 }).notNull(),
    markPrice: decimal("markPrice", { precision: 16, scale: 5 }).notNull(),
    stopLoss: decimal("stopLoss", { precision: 16, scale: 5 }).notNull(),
    takeProfit: decimal("takeProfit", { precision: 16, scale: 5 }).notNull(),
    riskAmount: decimal("riskAmount", { precision: 16, scale: 2 }).notNull(),
    realizedPnl: decimal("realizedPnl", { precision: 16, scale: 2 }).default("0.00").notNull(),
    closedPrice: decimal("closedPrice", { precision: 16, scale: 5 }),
    closeReason: varchar("closeReason", { length: 64 }),
    openedAt: timestamp("openedAt").defaultNow().notNull(),
    closedAt: timestamp("closedAt"),
  },
  (table) => [
    index("paperPositions_user_status_idx").on(table.userId, table.status),
    index("paperPositions_user_opened_idx").on(table.userId, table.openedAt),
  ],
);

/** Persisted output of a server-side paper backtest. */
export const backtestRuns = mysqlTable(
  "backtestRuns",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    strategyId: int("strategyId"),
    symbol: varchar("symbol", { length: 32 }).notNull(),
    periodStart: timestamp("periodStart").notNull(),
    periodEnd: timestamp("periodEnd").notNull(),
    startingBalance: decimal("startingBalance", { precision: 16, scale: 2 }).notNull(),
    endingBalance: decimal("endingBalance", { precision: 16, scale: 2 }).notNull(),
    status: mysqlEnum("status", ["completed", "failed"])
      .default("completed")
      .notNull(),
    metrics: json("metrics").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("backtestRuns_user_created_idx").on(table.userId, table.createdAt)],
);

/** Notification preferences are per user and never contain broker secrets. */
export const notificationPreferences = mysqlTable(
  "notificationPreferences",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    notifyTradeOpened: boolean("notifyTradeOpened").default(true).notNull(),
    notifyTradeClosed: boolean("notifyTradeClosed").default(true).notNull(),
    notifyDailyLossLimit: boolean("notifyDailyLossLimit").default(true).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("notificationPreferences_userId_unique").on(table.userId)],
);

/** Notification events provide an in-app audit trail. */
export const notificationEvents = mysqlTable(
  "notificationEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    eventType: mysqlEnum("eventType", ["trade_opened", "trade_closed", "daily_loss_limit"])
      .notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body").notNull(),
    relatedPositionId: int("relatedPositionId"),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("notificationEvents_user_created_idx").on(table.userId, table.createdAt)],
);

/** Device notification tokens are scoped to the authenticated user and may be revoked at any time. */
export const devicePushTokens = mysqlTable(
  "devicePushTokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    platform: mysqlEnum("platform", ["android", "ios"]).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("devicePushTokens_token_unique").on(table.token),
    index("devicePushTokens_userId_idx").on(table.userId),
  ],
);

/** A broker account link stores only public account identity and a server-managed authorization reference. */
export const brokerConnections = mysqlTable(
  "brokerConnections",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    provider: mysqlEnum("provider", ["ctrader", "oanda", "mt4_bridge", "mt5_bridge"]).notNull(),
    connectionMode: mysqlEnum("connectionMode", ["oauth", "server_token", "terminal_bridge"]).notNull(),
    environment: mysqlEnum("environment", ["demo", "live"]).default("demo").notNull(),
    status: mysqlEnum("status", ["pending", "read_only", "ready", "revoked", "error"]).default("pending").notNull(),
    accountReference: varchar("accountReference", { length: 160 }).notNull(),
    authorizationRef: varchar("authorizationRef", { length: 191 }),
    displayName: varchar("displayName", { length: 128 }).notNull(),
    lastVerifiedAt: timestamp("lastVerifiedAt"),
    lastHeartbeatAt: timestamp("lastHeartbeatAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("brokerConnections_user_provider_account_unique").on(table.userId, table.provider, table.accountReference),
    index("brokerConnections_user_status_idx").on(table.userId, table.status),
  ],
);

/** Explicit, timestamped user consent is required before any future live execution capability can be activated. */
export const liveTradingConsents = mysqlTable(
  "liveTradingConsents",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    brokerConnectionId: int("brokerConnectionId").notNull(),
    status: mysqlEnum("status", ["pending", "acknowledged", "revoked"]).default("pending").notNull(),
    acknowledgementVersion: varchar("acknowledgementVersion", { length: 32 }).notNull(),
    maxRiskPerTradePercent: decimal("maxRiskPerTradePercent", { precision: 5, scale: 2 }).notNull(),
    maxDailyLoss: decimal("maxDailyLoss", { precision: 16, scale: 2 }).notNull(),
    acknowledgedAt: timestamp("acknowledgedAt"),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("liveTradingConsents_connection_unique").on(table.brokerConnectionId),
    index("liveTradingConsents_user_status_idx").on(table.userId, table.status),
  ],
);

/** Normalized execution intents are auditable and idempotent; no order is sent by this release. */
export const executionIntents = mysqlTable(
  "executionIntents",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    brokerConnectionId: int("brokerConnectionId").notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 96 }).notNull(),
    environment: mysqlEnum("environment", ["demo", "live"]).notNull(),
    symbol: varchar("symbol", { length: 32 }).notNull(),
    side: mysqlEnum("side", ["buy", "sell"]).notNull(),
    quantity: decimal("quantity", { precision: 16, scale: 4 }).notNull(),
    stopLoss: decimal("stopLoss", { precision: 16, scale: 5 }).notNull(),
    takeProfit: decimal("takeProfit", { precision: 16, scale: 5 }).notNull(),
    status: mysqlEnum("status", ["validated", "rejected", "blocked", "sent", "confirmed", "failed"])
      .default("validated")
      .notNull(),
    rejectionReason: varchar("rejectionReason", { length: 255 }),
    providerOrderReference: varchar("providerOrderReference", { length: 160 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("executionIntents_idempotency_unique").on(table.idempotencyKey),
    index("executionIntents_connection_created_idx").on(table.brokerConnectionId, table.createdAt),
  ],
);

/** Security and operational audit events. Never persist credentials, secrets, or raw authorization tokens. */
export const auditEvents = mysqlTable(
  "auditEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    action: varchar("action", { length: 96 }).notNull(),
    entityType: varchar("entityType", { length: 64 }).notNull(),
    entityId: varchar("entityId", { length: 64 }),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("auditEvents_user_created_idx").on(table.userId, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type TradingProfile = typeof tradingProfiles.$inferSelect;
export type RiskControls = typeof riskControls.$inferSelect;
export type TradingInstrument = typeof tradingInstruments.$inferSelect;
export type TradingStrategy = typeof tradingStrategies.$inferSelect;
export type DecisionEvent = typeof decisionEvents.$inferSelect;
export type PaperPosition = typeof paperPositions.$inferSelect;
export type BacktestRun = typeof backtestRuns.$inferSelect;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NotificationEvent = typeof notificationEvents.$inferSelect;
export type DevicePushToken = typeof devicePushTokens.$inferSelect;
export type BrokerConnection = typeof brokerConnections.$inferSelect;
export type LiveTradingConsent = typeof liveTradingConsents.$inferSelect;
export type ExecutionIntent = typeof executionIntents.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
