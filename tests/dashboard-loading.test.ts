import { describe, expect, it } from "vitest";

import { getDashboardLoadingCopy, getDashboardRefreshCopy } from "../lib/dashboard-loading";

describe("dashboard loading copy", () => {
  it("communicates initial paper-workspace and API-status loading without implying live execution", () => {
    const copy = getDashboardLoadingCopy("loading");

    expect(copy.eyebrow).toBe("SECURE WORKSPACE");
    expect(copy.detail).toContain("risk controls");
    expect(copy.detail).toContain("API status");
  });

  it("communicates a refresh state for trading data and control-plane status", () => {
    const copy = getDashboardLoadingCopy("refreshing");

    expect(copy.eyebrow).toBe("SYNCING");
    expect(copy.detail).toContain("paper-trading data");
    expect(copy.detail).toContain("control-plane status");
  });

  it("provides clear manual refresh feedback for idle, syncing, and recoverable-error states", () => {
    expect(getDashboardRefreshCopy("idle").actionLabel).toBe("Refresh data");
    expect(getDashboardRefreshCopy("refreshing").actionLabel).toBe("Refreshing…");
    expect(getDashboardRefreshCopy("error").actionLabel).toBe("Try refresh again");
    expect(getDashboardRefreshCopy("error").status).toContain("previous snapshot");
  });
});
