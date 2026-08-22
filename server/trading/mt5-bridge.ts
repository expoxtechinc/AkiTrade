/**
 * Contract for a separately hosted MT5 terminal bridge.
 * The mobile app and managed backend do not collect, store, or use Exness passwords.
 * Version one always exposes this adapter as unavailable for execution.
 */
export type Mt5BridgeHealth = {
  state: "not_configured" | "healthy" | "degraded" | "offline";
  lastHeartbeatAt: Date | null;
  capabilities: {
    readAccount: boolean;
    readPositions: boolean;
    executeLiveOrders: false;
  };
};

export type Mt5BridgeAdapter = {
  getHealth(): Promise<Mt5BridgeHealth>;
  requestLiveOrder(): Promise<never>;
};

export class DisabledMt5BridgeAdapter implements Mt5BridgeAdapter {
  async getHealth(): Promise<Mt5BridgeHealth> {
    return {
      state: "not_configured",
      lastHeartbeatAt: null,
      capabilities: { readAccount: false, readPositions: false, executeLiveOrders: false },
    };
  }

  async requestLiveOrder(): Promise<never> {
    throw new Error("Live trading is intentionally disabled in version one. Paper mode only.");
  }
}

export const mt5Bridge: Mt5BridgeAdapter = new DisabledMt5BridgeAdapter();
