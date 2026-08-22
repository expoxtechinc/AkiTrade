import { describe, expect, it } from "vitest";

import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import { createEmergencyCloseOutcomes } from "../server/trading/emergency";

const unauthenticatedContext: TrpcContext = {
  req: {} as TrpcContext["req"],
  res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  user: null,
};

describe("AkiTrade protected control boundary", () => {
  it("rejects access to the trading overview without an authenticated user", async () => {
    const caller = appRouter.createCaller(unauthenticatedContext);
    await expect(caller.trading.overview()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("calculates emergency closes for every selected paper position with a manual-close audit reason", () => {
    const outcomes = createEmergencyCloseOutcomes([
      { id: 1, side: "buy", entryPrice: "1.10000", markPrice: "1.10100", quantity: "1000" },
      { id: 2, side: "sell", entryPrice: "1.25000", markPrice: "1.25100", quantity: "1000" },
    ]);
    expect(outcomes).toEqual([
      { id: 1, realizedPnl: 1, closeReason: "manual_emergency_close" },
      { id: 2, realizedPnl: -1, closeReason: "manual_emergency_close" },
    ]);
  });
});
