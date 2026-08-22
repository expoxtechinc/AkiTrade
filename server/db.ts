import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

import {
  auditEvents,
  backtestRuns,
  brokerConnections,
  decisionEvents,
  devicePushTokens,
  executionIntents,
  InsertUser,
  notificationEvents,
  notificationPreferences,
  paperPositions,
  riskControls,
  liveTradingConsents,
  tradingInstruments,
  tradingProfiles,
  tradingStrategies,
  users,
} from "../drizzle/schema";
import {
  type BacktestMetrics,
  DEFAULT_RISK_CONTROLS,
  DEFAULT_STRATEGY_PARAMETERS,
  LIVE_TRADING_ENABLED,
  OPERATING_MODE,
  SUPPORTED_INSTRUMENTS,
  type RiskSnapshot,
  type StrategyParameters,
  type StrategyType,
} from "../shared/trading";
import { ENV } from "./_core/env";
import { calculatePaperPnl } from "./trading/engine";
import { createEmergencyCloseOutcomes } from "./trading/emergency";
import {
  assessFutureExecution,
  getBrokerAuthorizationInstruction,
  type BrokerEnvironment,
  type BrokerProvider,
} from "./trading/broker-contract";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

/** Creates an authenticated user’s paper-only workspace once. No broker credential is ever accepted here. */
export async function ensurePaperWorkspace(userId: number) {
  const db = await requireDb();
  const existing = await db.select().from(tradingProfiles).where(eq(tradingProfiles.userId, userId)).limit(1);

  if (existing.length === 0) {
    await db.insert(tradingProfiles).values({
      userId,
      operatingMode: OPERATING_MODE,
      liveTradingEnabled: LIVE_TRADING_ENABLED,
      automationStatus: "stopped",
      accountLabel: "Demo / Paper",
      bridgeStatus: "not_configured",
    });
    await db.insert(riskControls).values({
      userId,
      maxRiskPerTradePercent: String(DEFAULT_RISK_CONTROLS.maxRiskPerTradePercent),
      maxDailyLoss: String(DEFAULT_RISK_CONTROLS.maxDailyLoss),
      maxTradesPerDay: DEFAULT_RISK_CONTROLS.maxTradesPerDay,
      maxOpenPositions: DEFAULT_RISK_CONTROLS.maxOpenPositions,
      requireStopLoss: DEFAULT_RISK_CONTROLS.requireStopLoss,
      requireTakeProfit: DEFAULT_RISK_CONTROLS.requireTakeProfit,
    });
    await db.insert(notificationPreferences).values({ userId });
    await db.insert(tradingInstruments).values(
      SUPPORTED_INSTRUMENTS.map((symbol) => ({ userId, symbol, enabled: true })),
    );
    await db.insert(tradingStrategies).values({
      userId,
      name: "Baseline moving average",
      strategyType: "moving_average",
      isActive: true,
      parameters: DEFAULT_STRATEGY_PARAMETERS,
    });
    await recordAuditEvent(userId, "workspace_created", "trading_profile", null, {
      operatingMode: OPERATING_MODE,
      liveTradingEnabled: LIVE_TRADING_ENABLED,
    });
  }

  return getWorkspace(userId);
}

export async function getWorkspace(userId: number) {
  const db = await requireDb();
  const [profile] = await db.select().from(tradingProfiles).where(eq(tradingProfiles.userId, userId)).limit(1);
  const [risk] = await db.select().from(riskControls).where(eq(riskControls.userId, userId)).limit(1);
  const instruments = await db
    .select()
    .from(tradingInstruments)
    .where(eq(tradingInstruments.userId, userId));
  const strategies = await db
    .select()
    .from(tradingStrategies)
    .where(eq(tradingStrategies.userId, userId));
  const [notifications] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (!profile || !risk || !notifications) throw new Error("Paper workspace is incomplete");
  return { profile, risk, instruments, strategies, notifications };
}

export async function listBrokerConnections(userId: number) {
  await ensurePaperWorkspace(userId);
  const db = await requireDb();
  const connections = await db
    .select()
    .from(brokerConnections)
    .where(eq(brokerConnections.userId, userId))
    .orderBy(desc(brokerConnections.updatedAt));
  const consents = await db
    .select()
    .from(liveTradingConsents)
    .where(eq(liveTradingConsents.userId, userId));
  return connections.map((connection) => ({
    ...connection,
    consent: consents.find((consent) => consent.brokerConnectionId === connection.id) ?? null,
  }));
}

export async function requestBrokerConnection(
  userId: number,
  input: { provider: BrokerProvider; environment: BrokerEnvironment; accountReference: string; displayName: string },
) {
  const db = await requireDb();
  await ensurePaperWorkspace(userId);
  const authorization = getBrokerAuthorizationInstruction(input.provider, input.environment);
  await db.insert(brokerConnections).values({
    userId,
    provider: input.provider,
    connectionMode: authorization.connectionMode,
    environment: input.environment,
    status: authorization.status,
    accountReference: input.accountReference,
    displayName: input.displayName,
  }).onDuplicateKeyUpdate({
    set: {
      connectionMode: authorization.connectionMode,
      environment: input.environment,
      status: authorization.status,
      displayName: input.displayName,
    },
  });
  const [connection] = await db.select().from(brokerConnections).where(and(
    eq(brokerConnections.userId, userId),
    eq(brokerConnections.provider, input.provider),
    eq(brokerConnections.accountReference, input.accountReference),
  )).limit(1);
  if (!connection) throw new Error("Broker connection could not be created");
  await recordAuditEvent(userId, "broker_connection_requested", "broker_connection", String(connection.id), {
    provider: input.provider,
    environment: input.environment,
    connectionMode: authorization.connectionMode,
  });
  return { connection, authorization };
}

export async function acknowledgeLiveTradingConsent(userId: number, brokerConnectionId: number) {
  const db = await requireDb();
  const [connection] = await db.select().from(brokerConnections).where(and(
    eq(brokerConnections.id, brokerConnectionId),
    eq(brokerConnections.userId, userId),
  )).limit(1);
  if (!connection) throw new Error("Broker connection was not found");
  if (connection.environment !== "live") throw new Error("Live consent is available only for a live-designated connection");
  const [risk] = await db.select().from(riskControls).where(eq(riskControls.userId, userId)).limit(1);
  if (!risk) throw new Error("Risk controls must be configured before acknowledgement");
  await db.insert(liveTradingConsents).values({
    userId,
    brokerConnectionId,
    status: "acknowledged",
    acknowledgementVersion: "1.0",
    maxRiskPerTradePercent: risk.maxRiskPerTradePercent,
    maxDailyLoss: risk.maxDailyLoss,
    acknowledgedAt: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      status: "acknowledged",
      acknowledgementVersion: "1.0",
      maxRiskPerTradePercent: risk.maxRiskPerTradePercent,
      maxDailyLoss: risk.maxDailyLoss,
      acknowledgedAt: new Date(),
      revokedAt: null,
    },
  });
  await recordAuditEvent(userId, "live_execution_consent_acknowledged", "broker_connection", String(connection.id), {
    provider: connection.provider,
    liveExecutionRemainsDisabled: !LIVE_TRADING_ENABLED,
  });
  return { liveExecutionEnabled: LIVE_TRADING_ENABLED, connectionStatus: connection.status };
}

export async function createExecutionIntent(
  userId: number,
  input: {
    brokerConnectionId: number;
    idempotencyKey: string;
    symbol: string;
    side: "buy" | "sell";
    quantity: number;
    stopLoss: number;
    takeProfit: number;
  },
) {
  const db = await requireDb();
  const [connection] = await db.select().from(brokerConnections).where(and(
    eq(brokerConnections.id, input.brokerConnectionId),
    eq(brokerConnections.userId, userId),
  )).limit(1);
  if (!connection) throw new Error("Broker connection was not found");
  const [consent] = await db.select().from(liveTradingConsents).where(eq(liveTradingConsents.brokerConnectionId, connection.id)).limit(1);
  const result = assessFutureExecution({
    environment: connection.environment,
    liveTradingEnabled: LIVE_TRADING_ENABLED,
    connectionStatus: connection.status,
    userConsentStatus: consent?.status ?? null,
    hasStopLoss: Number.isFinite(input.stopLoss),
    hasTakeProfit: Number.isFinite(input.takeProfit),
  });
  await db.insert(executionIntents).values({
    userId,
    brokerConnectionId: connection.id,
    idempotencyKey: input.idempotencyKey,
    environment: connection.environment,
    symbol: input.symbol,
    side: input.side,
    quantity: String(input.quantity),
    stopLoss: String(input.stopLoss),
    takeProfit: String(input.takeProfit),
    status: result.status,
    rejectionReason: result.allowed ? null : result.reason,
  });
  await recordAuditEvent(userId, "execution_intent_recorded", "execution_intent", input.idempotencyKey, {
    provider: connection.provider,
    environment: connection.environment,
    status: result.status,
    reason: result.allowed ? null : result.reason,
  });
  return { ...result, dispatched: false };
}

export async function getPaperDashboard(userId: number) {
  await ensurePaperWorkspace(userId);
  const db = await requireDb();
  const workspace = await getWorkspace(userId);
  const openPositions = await db
    .select()
    .from(paperPositions)
    .where(eq(paperPositions.userId, userId))
    .orderBy(desc(paperPositions.openedAt));
  const positions = openPositions.filter((position) => position.status === "open");
  const recentClosedPositions = openPositions.filter((position) => position.status === "closed").slice(0, 50);
  const realizedPnl = openPositions.reduce((sum, position) => sum + Number(position.realizedPnl), 0);
  const unrealizedPnl = positions.reduce((sum, position) => {
    const movement = position.side === "buy"
      ? Number(position.markPrice) - Number(position.entryPrice)
      : Number(position.entryPrice) - Number(position.markPrice);
    return sum + (movement * Number(position.quantity));
  }, 0);
  const balance = Number(workspace.profile.startingBalance) + realizedPnl;
  const margin = positions.reduce((sum, position) => sum + Number(position.riskAmount), 0);
  const recentDecisions = await db
    .select()
    .from(decisionEvents)
    .where(eq(decisionEvents.userId, userId))
    .orderBy(desc(decisionEvents.createdAt))
    .limit(10);
  const recentNotifications = await db
    .select()
    .from(notificationEvents)
    .where(eq(notificationEvents.userId, userId))
    .orderBy(desc(notificationEvents.createdAt))
    .limit(20);

  return {
    ...workspace,
    positions,
    recentClosedPositions,
    recentDecisions,
    recentNotifications,
    accountSummary: {
      balance: Number(balance.toFixed(2)),
      equity: Number((balance + unrealizedPnl).toFixed(2)),
      margin: Number(margin.toFixed(2)),
      unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
      realizedPnl: Number(realizedPnl.toFixed(2)),
    },
  };
}

export async function updateRiskControls(userId: number, next: RiskSnapshot) {
  const db = await requireDb();
  await ensurePaperWorkspace(userId);
  await db.update(riskControls).set({
    maxRiskPerTradePercent: String(next.maxRiskPerTradePercent),
    maxDailyLoss: String(next.maxDailyLoss),
    maxTradesPerDay: next.maxTradesPerDay,
    maxOpenPositions: next.maxOpenPositions,
    requireStopLoss: next.requireStopLoss,
    requireTakeProfit: next.requireTakeProfit,
  }).where(eq(riskControls.userId, userId));
  await recordAuditEvent(userId, "risk_controls_updated", "risk_controls", null, {
    maxRiskPerTradePercent: next.maxRiskPerTradePercent,
    maxDailyLoss: next.maxDailyLoss,
    maxTradesPerDay: next.maxTradesPerDay,
    maxOpenPositions: next.maxOpenPositions,
  });
  const [updated] = await db.select().from(riskControls).where(eq(riskControls.userId, userId)).limit(1);
  if (!updated) throw new Error("Risk controls were not saved");
  return updated;
}

export async function updateStrategy(
  userId: number,
  input: { strategyId: number; name: string; strategyType: StrategyType; parameters: StrategyParameters; isActive: boolean },
) {
  const db = await requireDb();
  await ensurePaperWorkspace(userId);
  const [strategy] = await db
    .select()
    .from(tradingStrategies)
    .where(eq(tradingStrategies.id, input.strategyId))
    .limit(1);
  if (!strategy || strategy.userId !== userId) throw new Error("Strategy was not found");

  await db.update(tradingStrategies).set({
    name: input.name,
    strategyType: input.strategyType,
    parameters: input.parameters,
    isActive: input.isActive,
  }).where(eq(tradingStrategies.id, input.strategyId));
  await recordAuditEvent(userId, "strategy_updated", "strategy", String(input.strategyId), {
    strategyType: input.strategyType,
    isActive: input.isActive,
  });
}

export async function updateInstrument(userId: number, symbol: string, enabled: boolean) {
  const db = await requireDb();
  await ensurePaperWorkspace(userId);
  await db
    .update(tradingInstruments)
    .set({ enabled })
    .where(and(eq(tradingInstruments.userId, userId), eq(tradingInstruments.symbol, symbol)));
  await recordAuditEvent(userId, "instrument_updated", "instrument", symbol, { enabled });
}

/** Automation can be enabled only for paper mode; any attempt to enable live operation is rejected. */
export async function setPaperAutomationStatus(userId: number, status: "stopped" | "running" | "paused") {
  const db = await requireDb();
  const { profile } = await ensurePaperWorkspace(userId);
  if (profile.operatingMode !== OPERATING_MODE || profile.liveTradingEnabled) {
    throw new Error("Live trading is unavailable in this release");
  }
  await db.update(tradingProfiles).set({
    operatingMode: OPERATING_MODE,
    liveTradingEnabled: LIVE_TRADING_ENABLED,
    automationStatus: status,
  }).where(eq(tradingProfiles.userId, userId));
  await recordAuditEvent(userId, `automation_${status}`, "trading_profile", String(profile.id), {
    operatingMode: OPERATING_MODE,
  });
}

export async function updateNotificationPreferences(
  userId: number,
  input: { notifyTradeOpened: boolean; notifyTradeClosed: boolean; notifyDailyLossLimit: boolean },
) {
  const db = await requireDb();
  await ensurePaperWorkspace(userId);
  await db.update(notificationPreferences).set(input).where(eq(notificationPreferences.userId, userId));
  await recordAuditEvent(userId, "notification_preferences_updated", "notification_preferences", null, input);
}

export async function recordAuditEvent(
  userId: number,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>,
) {
  const db = await requireDb();
  await db.insert(auditEvents).values({ userId, action, entityType, entityId, metadata: metadata ?? null });
}

export async function recordDecisionEvent(
  userId: number,
  input: {
    strategyId: number | null;
    symbol: string;
    decision: "buy" | "sell" | "wait";
    markPrice: number;
    rationale: string;
    riskStatus: "approved" | "blocked" | "not_applicable";
    riskReason?: string;
    orderCreated?: boolean;
  },
) {
  const db = await requireDb();
  const result = await db.insert(decisionEvents).values({
    userId,
    strategyId: input.strategyId,
    symbol: input.symbol,
    decision: input.decision,
    markPrice: String(input.markPrice),
    rationale: input.rationale,
    riskStatus: input.riskStatus,
    riskReason: input.riskReason ?? null,
    orderCreated: input.orderCreated ?? false,
  });
  return Number(result[0].insertId);
}

export async function createPaperPosition(
  userId: number,
  input: {
    strategyId: number | null;
    decisionEventId: number;
    symbol: string;
    side: "buy" | "sell";
    quantity: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    riskAmount: number;
  },
) {
  const db = await requireDb();
  const result = await db.insert(paperPositions).values({
    userId,
    strategyId: input.strategyId,
    decisionEventId: input.decisionEventId,
    symbol: input.symbol,
    side: input.side,
    quantity: String(input.quantity),
    entryPrice: String(input.entryPrice),
    markPrice: String(input.entryPrice),
    stopLoss: String(input.stopLoss),
    takeProfit: String(input.takeProfit),
    riskAmount: String(input.riskAmount),
  });
  const positionId = Number(result[0].insertId);
  await recordAuditEvent(userId, "paper_position_opened", "paper_position", String(positionId), {
    symbol: input.symbol,
    side: input.side,
  });
  return positionId;
}

/** Close every open paper position at its last simulated mark. This can never contact a broker. */
export async function closeAllPaperPositions(userId: number) {
  const db = await requireDb();
  await db.update(tradingProfiles).set({ automationStatus: "paused" }).where(eq(tradingProfiles.userId, userId));
  const open = await db.select().from(paperPositions).where(and(
    eq(paperPositions.userId, userId),
    eq(paperPositions.status, "open"),
  ));
  const closedAt = new Date();
  let realizedPnl = 0;
  for (const outcome of createEmergencyCloseOutcomes(open)) {
    realizedPnl += outcome.realizedPnl;
    await db.update(paperPositions).set({
      status: "closed",
      realizedPnl: String(outcome.realizedPnl),
      closedPrice: open.find((position) => position.id === outcome.id)?.markPrice ?? "0",
      closeReason: outcome.closeReason,
      closedAt,
    }).where(eq(paperPositions.id, outcome.id));
    await createNotificationEvent(
      userId,
      "trade_closed",
      "Paper position closed",
      `${open.find((position) => position.id === outcome.id)?.symbol ?? "Paper position"} was closed by the emergency control.`,
      outcome.id,
    );
  }
  await recordAuditEvent(userId, "paper_positions_emergency_closed", "paper_position", null, {
    count: open.length,
    realizedPnl: Number(realizedPnl.toFixed(2)),
    automationStatus: "paused",
  });
  return { closedCount: open.length, realizedPnl: Number(realizedPnl.toFixed(2)) };
}

export async function getTodayRiskState(userId: number) {
  const db = await requireDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const positions = await db.select().from(paperPositions).where(eq(paperPositions.userId, userId));
  const todaysClosed = positions.filter((position) => position.closedAt && position.closedAt >= startOfDay);
  return {
    dailyRealizedPnl: todaysClosed.reduce((sum, position) => sum + Number(position.realizedPnl), 0),
    tradesOpenedToday: positions.filter((position) => position.openedAt >= startOfDay).length,
    openPositions: positions.filter((position) => position.status === "open").length,
  };
}

export async function createBacktestRun(
  userId: number,
  input: {
    strategyId: number | null;
    symbol: string;
    startingBalance: number;
    endingBalance: number;
    metrics: BacktestMetrics;
    periodStart: Date;
    periodEnd: Date;
  },
) {
  const db = await requireDb();
  const result = await db.insert(backtestRuns).values({
    userId,
    strategyId: input.strategyId,
    symbol: input.symbol,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    startingBalance: String(input.startingBalance),
    endingBalance: String(input.endingBalance),
    metrics: input.metrics,
  });
  const backtestId = Number(result[0].insertId);
  await recordAuditEvent(userId, "paper_backtest_completed", "backtest", String(backtestId), {
    symbol: input.symbol,
    totalTrades: input.metrics.totalTrades,
  });
  return backtestId;
}

export async function getPerformanceSummary(userId: number) {
  const db = await requireDb();
  await ensurePaperWorkspace(userId);
  const allPositions = await db
    .select()
    .from(paperPositions)
    .where(eq(paperPositions.userId, userId))
    .orderBy(desc(paperPositions.openedAt));
  const closed = allPositions.filter((position) => position.status === "closed");
  const pnl = closed.map((position) => Number(position.realizedPnl));
  const winners = pnl.filter((value) => value > 0);
  const losers = pnl.filter((value) => value < 0);
  const grossProfit = winners.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losers.reduce((sum, value) => sum + value, 0));
  const backtests = await db
    .select()
    .from(backtestRuns)
    .where(eq(backtestRuns.userId, userId))
    .orderBy(desc(backtestRuns.createdAt))
    .limit(10);
  return {
    completedTrades: closed.length,
    netPnl: Number(pnl.reduce((sum, value) => sum + value, 0).toFixed(2)),
    winRate: closed.length ? Number(((winners.length / closed.length) * 100).toFixed(2)) : 0,
    profitFactor: grossLoss ? Number((grossProfit / grossLoss).toFixed(2)) : 0,
    averageWin: winners.length ? Number((grossProfit / winners.length).toFixed(2)) : 0,
    averageLoss: losers.length ? Number((losers.reduce((sum, value) => sum + value, 0) / losers.length).toFixed(2)) : 0,
    backtests,
  };
}

export async function createNotificationEvent(
  userId: number,
  eventType: "trade_opened" | "trade_closed" | "daily_loss_limit",
  title: string,
  body: string,
  relatedPositionId?: number,
) {
  const db = await requireDb();
  const [preferences] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  const allowed = eventType === "trade_opened"
    ? preferences?.notifyTradeOpened
    : eventType === "trade_closed"
      ? preferences?.notifyTradeClosed
      : preferences?.notifyDailyLossLimit;
  if (!allowed) return false;
  await db.insert(notificationEvents).values({ userId, eventType, title, body, relatedPositionId: relatedPositionId ?? null });
  await dispatchPushNotifications(userId, title, body, eventType);
  return true;
}

export async function registerDevicePushToken(userId: number, token: string, platform: "android" | "ios") {
  const db = await requireDb();
  await db.insert(devicePushTokens).values({ userId, token, platform, enabled: true }).onDuplicateKeyUpdate({
    set: { userId, platform, enabled: true },
  });
  await recordAuditEvent(userId, "device_push_token_registered", "device_push_token", null, { platform });
}

async function dispatchPushNotifications(
  userId: number,
  title: string,
  body: string,
  eventType: "trade_opened" | "trade_closed" | "daily_loss_limit",
) {
  const db = await requireDb();
  const tokens = await db
    .select({ token: devicePushTokens.token })
    .from(devicePushTokens)
    .where(and(eq(devicePushTokens.userId, userId), eq(devicePushTokens.enabled, true)));
  if (tokens.length === 0) return;

  await Promise.allSettled(tokens.map(async ({ token }) => {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          to: token,
          title,
          body,
          sound: null,
          data: { url: "/notifications", eventType },
        }),
      });
    } catch (error) {
      console.warn("[Notifications] Paper alert dispatch failed", error);
    }
  }));
}
