import { z } from "zod";

import { COOKIE_NAME } from "../shared/const";
import { SUPPORTED_INSTRUMENTS, STRATEGY_TYPES } from "../shared/trading";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { buildDemoPaperCandles } from "./trading/demo-market";
import { mt5Bridge } from "./trading/mt5-bridge";
import { runPaperDecisionCycle } from "./trading/paper-service";
import { runPaperBacktest } from "./trading/engine";
import { BROKER_PROVIDERS } from "./trading/broker-contract";

const riskControlsInput = z.object({
  maxRiskPerTradePercent: z.number().finite().min(0.01).max(10),
  maxDailyLoss: z.number().finite().positive().max(1_000_000),
  maxTradesPerDay: z.number().int().min(1).max(100),
  maxOpenPositions: z.number().int().min(1).max(20),
  requireStopLoss: z.literal(true),
  requireTakeProfit: z.literal(true),
});

const strategyParametersInput = z.object({
  fastPeriod: z.number().int().min(2).max(100),
  slowPeriod: z.number().int().min(3).max(300),
  decisionThreshold: z.number().finite().positive().max(0.1),
  stopLossPips: z.number().finite().positive().max(500),
  takeProfitPips: z.number().finite().positive().max(1_000),
}).refine((input) => input.fastPeriod < input.slowPeriod, {
  message: "The fast period must be lower than the slow period",
  path: ["fastPeriod"],
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  trading: router({
    overview: protectedProcedure.query(({ ctx }) => db.getPaperDashboard(ctx.user.id)),
    workspace: protectedProcedure.query(({ ctx }) => db.ensurePaperWorkspace(ctx.user.id)),
    setAutomation: protectedProcedure
      .input(z.object({ status: z.enum(["stopped", "running", "paused"]) }))
      .mutation(async ({ ctx, input }) => {
        await db.setPaperAutomationStatus(ctx.user.id, input.status);
        return { operatingMode: "paper" as const, automationStatus: input.status };
      }),
    runDemoPaperCycle: protectedProcedure
      .input(z.object({ symbol: z.enum(SUPPORTED_INSTRUMENTS) }))
      .mutation(async ({ ctx, input }) => {
        const workspace = await db.ensurePaperWorkspace(ctx.user.id);
        if (workspace.profile.automationStatus !== "running") {
          throw new Error("Start paper automation before running a demo decision cycle");
        }
        return runPaperDecisionCycle(ctx.user.id, input.symbol, buildDemoPaperCandles(input.symbol));
      }),
    closeAllPaperPositions: protectedProcedure.mutation(({ ctx }) => db.closeAllPaperPositions(ctx.user.id)),
    mt5BridgeHealth: protectedProcedure.query(() => mt5Bridge.getHealth()),
    performance: protectedProcedure.query(({ ctx }) => db.getPerformanceSummary(ctx.user.id)),
    runBacktest: protectedProcedure
      .input(z.object({ symbol: z.enum(SUPPORTED_INSTRUMENTS) }))
      .mutation(async ({ ctx, input }) => {
        const workspace = await db.ensurePaperWorkspace(ctx.user.id);
        const strategy = workspace.strategies.find((item) => item.isActive) ?? workspace.strategies[0];
        if (!strategy) throw new Error("Activate a strategy before running a paper backtest");
        const candles = buildDemoPaperCandles(input.symbol, 220);
        const result = runPaperBacktest(
          candles,
          input.symbol,
          strategy.parameters as { fastPeriod: number; slowPeriod: number; decisionThreshold: number; stopLossPips: number; takeProfitPips: number },
          Number(workspace.profile.startingBalance),
        );
        const backtestId = await db.createBacktestRun(ctx.user.id, {
          strategyId: strategy.id,
          symbol: input.symbol,
          startingBalance: Number(workspace.profile.startingBalance),
          endingBalance: result.endingBalance,
          metrics: result.metrics,
          periodStart: candles[0].timestamp,
          periodEnd: candles.at(-1)!.timestamp,
        });
        return { ...result, backtestId, disclaimer: "Paper backtest using deterministic synthetic data; not a forecast of market performance." };
      }),
    setRiskControls: protectedProcedure
      .input(riskControlsInput)
      .mutation(({ ctx, input }) => db.updateRiskControls(ctx.user.id, input)),
    setInstrument: protectedProcedure
      .input(z.object({ symbol: z.enum(SUPPORTED_INSTRUMENTS), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateInstrument(ctx.user.id, input.symbol, input.enabled);
        return { success: true };
      }),
    updateStrategy: protectedProcedure
      .input(z.object({
        strategyId: z.number().int().positive(),
        name: z.string().trim().min(3).max(128),
        strategyType: z.enum(STRATEGY_TYPES),
        parameters: strategyParametersInput,
        isActive: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateStrategy(ctx.user.id, input);
        return { success: true };
      }),
    setNotificationPreferences: protectedProcedure
      .input(z.object({
        notifyTradeOpened: z.boolean(),
        notifyTradeClosed: z.boolean(),
        notifyDailyLossLimit: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateNotificationPreferences(ctx.user.id, input);
        return { success: true };
      }),
    registerPushToken: protectedProcedure
      .input(z.object({
        token: z.string().trim().min(8).max(255),
        platform: z.enum(["android", "ios"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.registerDevicePushToken(ctx.user.id, input.token, input.platform);
        return { success: true };
      }),
    brokerConnections: protectedProcedure.query(({ ctx }) => db.listBrokerConnections(ctx.user.id)),
    requestBrokerConnection: protectedProcedure
      .input(z.object({
        provider: z.enum(BROKER_PROVIDERS),
        environment: z.enum(["demo", "live"]),
        accountReference: z.string().trim().min(3).max(160),
        displayName: z.string().trim().min(3).max(128),
      }))
      .mutation(({ ctx, input }) => db.requestBrokerConnection(ctx.user.id, input)),
    acknowledgeLiveTradingConsent: protectedProcedure
      .input(z.object({ brokerConnectionId: z.number().int().positive(), confirmed: z.literal(true) }))
      .mutation(({ ctx, input }) => db.acknowledgeLiveTradingConsent(ctx.user.id, input.brokerConnectionId)),
    createExecutionIntent: protectedProcedure
      .input(z.object({
        brokerConnectionId: z.number().int().positive(),
        idempotencyKey: z.string().uuid(),
        symbol: z.string().trim().min(3).max(32),
        side: z.enum(["buy", "sell"]),
        quantity: z.number().finite().positive(),
        stopLoss: z.number().finite().positive(),
        takeProfit: z.number().finite().positive(),
      }))
      .mutation(({ ctx, input }) => db.createExecutionIntent(ctx.user.id, input)),
  }),
});

export type AppRouter = typeof appRouter;
