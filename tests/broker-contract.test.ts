import { describe, expect, it } from "vitest";

import {
  assessFutureExecution,
  getBrokerAuthorizationInstruction,
} from "../server/trading/broker-contract";

describe("broker integration contract", () => {
  it("prepares MT5 access through a terminal bridge without requesting a password", () => {
    const instruction = getBrokerAuthorizationInstruction("mt5_bridge", "live");

    expect(instruction.connectionMode).toBe("terminal_bridge");
    expect(instruction.instruction.toLowerCase()).toContain("terminal");
    expect(instruction.instruction.toLowerCase()).not.toContain("enter your password");
  });

  it("blocks live execution while the feature flag is disabled even after consent", () => {
    const result = assessFutureExecution({
      environment: "live",
      liveTradingEnabled: false,
      connectionStatus: "ready",
      userConsentStatus: "acknowledged",
      hasStopLoss: true,
      hasTakeProfit: true,
    });

    expect(result).toEqual({
      allowed: false,
      status: "blocked",
      reason: "live_execution_feature_disabled",
    });
  });

  it("requires a ready broker connection and both protective orders before an intent could be validated", () => {
    const result = assessFutureExecution({
      environment: "demo",
      liveTradingEnabled: false,
      connectionStatus: "ready",
      userConsentStatus: null,
      hasStopLoss: true,
      hasTakeProfit: false,
    });

    expect(result).toEqual({
      allowed: false,
      status: "rejected",
      reason: "protective_orders_required",
    });
  });
});
