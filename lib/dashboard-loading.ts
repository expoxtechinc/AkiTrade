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

export type DashboardRefreshPhase = "idle" | "refreshing" | "error";

export function getDashboardRefreshCopy(phase: DashboardRefreshPhase) {
  if (phase === "refreshing") {
    return {
      actionLabel: "Refreshing…",
      status: "Syncing the latest paper data and API status…",
    };
  }

  if (phase === "error") {
    return {
      actionLabel: "Try refresh again",
      status: "The latest workspace data could not be refreshed. Your previous snapshot is still shown.",
    };
  }

  return {
    actionLabel: "Refresh data",
    status: "Update your paper workspace and API status now.",
  };
}
