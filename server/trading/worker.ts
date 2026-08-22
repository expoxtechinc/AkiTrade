/**
 * Isolated control-plane worker entry point.
 *
 * It is intentionally non-executing: it emits a periodic heartbeat but never
 * fetches credentials, generates orders, or calls a broker. A separately
 * reviewed and explicitly enabled live dispatcher belongs in a later release.
 */
const requestedInterval = Number.parseInt(process.env.AKITRADE_WORKER_HEARTBEAT_SECONDS ?? "60", 10);
const heartbeatSeconds = Number.isFinite(requestedInterval) ? Math.max(60, requestedInterval) : 60;
const executionEnabled = process.env.AKITRADE_AUTOMATION_WORKER_ENABLED === "true";

function heartbeat() {
  console.log(JSON.stringify({
    event: "akitrade_worker_heartbeat",
    timestamp: new Date().toISOString(),
    executionDispatch: "disabled",
    requestedAutomationFlag: executionEnabled,
    note: "No broker order can be dispatched by this release.",
  }));
}

heartbeat();
const timer = setInterval(heartbeat, heartbeatSeconds * 1_000);

function shutdown(signal: string) {
  clearInterval(timer);
  console.log(JSON.stringify({ event: "akitrade_worker_shutdown", signal, timestamp: new Date().toISOString() }));
  process.exit(0);
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
