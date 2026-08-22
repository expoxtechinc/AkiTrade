import { describe, expect, it } from "vitest";

import { getAkiTradeControlPlaneLandingPage } from "../server/_core/landing";

describe("AkiTrade control-plane landing page", () => {
  it("renders a startup response that directs users to the mobile app and health endpoint", () => {
    const page = getAkiTradeControlPlaneLandingPage();

    expect(page).toContain("Exness Auto Trader is online.");
    expect(page).toContain("/api/health");
    expect(page).toContain("/api/status");
    expect(page).toContain("MT5 BRIDGE CONNECTION");
    expect(page).toContain("UNIFIED ADAPTERS");
  });
});
