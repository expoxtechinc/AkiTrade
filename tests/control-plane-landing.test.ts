import { describe, expect, it } from "vitest";

import {
  getAkiTradeControlPlaneLandingPage,
  getAkiTradePrivacyPolicyPage,
  getAkiTradeTermsPage,
} from "../server/_core/landing";

describe("AkiTrade control-plane landing page", () => {
  it("renders a startup response that directs users to the mobile app and health endpoint", () => {
    const page = getAkiTradeControlPlaneLandingPage();

    expect(page).toContain("Exness Auto Trader is online.");
    expect(page).toContain("/api/health");
    expect(page).toContain("/api/status");
    expect(page).toContain("MT5 BRIDGE CONNECTION");
    expect(page).toContain("UNIFIED ADAPTERS");
  });

  it("renders public Privacy Policy and Terms of Service pages with the paper-first boundary", () => {
    const privacyPolicy = getAkiTradePrivacyPolicyPage();
    const terms = getAkiTradeTermsPage();

    expect(privacyPolicy).toContain("Privacy Policy");
    expect(privacyPolicy).toContain("Google sign-in");
    expect(privacyPolicy).toContain("broker password");
    expect(terms).toContain("Terms of Service");
    expect(terms).toContain("paper-first workspace");
    expect(terms).toContain("does not provide live trade execution");
  });
});
