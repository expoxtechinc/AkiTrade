export type DashboardLoadingPhase = "loading" | "refreshing";

export function getDashboardLoadingCopy(phase: DashboardLoadingPhase) {
  return phase === "loading"
    ? {
        eyebrow: "SECURE WORKSPACE",
        title: "Preparing your paper dashboard",
        detail: "Loading account snapshot, risk controls, and API status.",
      }
    : {
        eyebrow: "SYNCING",
        title: "Refreshing live workspace status",
        detail: "Checking the latest paper-trading data and control-plane status.",
      };
}
