# AkiTrade Broker Integration and Automation Architecture

## Product Boundary

AkiTrade may become a **user-controlled execution assistant**. It must not claim that an automated model is “perfect,” guarantee higher profits, promise improved win rates, or imply that it can safely trade every platform. All trading is risky and remains the account holder’s responsibility. A future live mode must be disabled by default, separately activated by the authenticated user, constrained by hard server-side limits, and immediately revocable through a kill switch.

> No broker password is accepted, stored, logged, or sent by the mobile application. The app stores only an authorization reference and public account metadata; any broker credential or token belongs in a secured server-side secret store or a user-controlled terminal-side bridge.

## Verified Integration Paths

| Platform family | Verified authorized path | Implication for AkiTrade |
| --- | --- | --- |
| Exness via MT5 | The documented MT5 Python integration communicates directly with an installed MT5 terminal through interprocess communication. The API includes account, market data, order-check, order-send, position, and history functions. [1] | AkiTrade needs a separately operated, terminal-side MT5 bridge. A Railway web service cannot substitute for the required MT5 terminal. |
| Exness via MT4 | MT4 Expert Advisors can trade only while terminal AutoTrading is enabled; they can be disabled when the account changes and can call only explicitly allowlisted web URLs. [2] | A user-installed EA bridge can request signed instructions from AkiTrade and retain the user’s terminal/broker session locally. |
| cTrader-affiliated brokers | cTrader Open API supports real-time data, trading operations, account history, and both demo and live accounts; it supports OAuth-style application authorization and recommends demo testing first. [3] | AkiTrade can implement a server-side OAuth adapter without mobile password collection. cTrader is the first viable direct-API candidate. |
| OANDA v20 | OANDA documents revocable personal access tokens used as Bearer credentials and says they should be stored securely. Its order models support linked take-profit and stop-loss details. [4] [5] | AkiTrade can support a server-side token vault and require every order to include application-level risk checks plus broker-side protective order details. |

The Exness educational example demonstrates an MT5 Python login with an account number and password, but this is unsuitable for a multi-user mobile product because it would require handling the user’s broker credential. [6] This product will instead support a bridge that the user controls alongside their MT terminal, or a documented OAuth/token API where the broker provides one. Research performed for this release did not identify a documented third-party Exness OAuth/API authorization flow suitable for direct mobile account linking.

## Required User-Controlled Activation Flow

1. The user links an account using the broker’s supported authorization mechanism or installs a signed MT4/MT5 bridge in their own terminal environment.
2. The connection begins in `paper` or `read_only` mode. AkiTrade runs account, symbol, and risk compatibility checks before enabling any execution capability.
3. The user completes a separate live-mode enrollment screen that discloses the exact account, maximum risk, daily loss limit, instruments, strategy version, and kill-switch behavior.
4. The user explicitly confirms the activation. The backend records a timestamped audit event and generates a short-lived live-execution authorization.
5. Each proposed order passes deterministic server-side gates: account state, market data freshness, position capacity, daily loss, risk percentage, configured stop-loss/take-profit, price tolerance, idempotency key, and user’s active authorization.
6. The adapter sends only a normalized order. The broker/terminal response is reconciled with the order intent, persisted, and reported to the user. Any mismatch freezes the strategy and creates a high-priority alert.

## 24/7 Operating Model

| Approach | Trade-offs | Cost | Setup complexity |
| --- | --- | --- |
| AkiTrade control plane plus user-run MT4/MT5 bridge | Keeps the terminal and credential boundary under the user’s control; requires a user-managed terminal or VPS to remain available | Existing terminal/VPS cost | Moderate |
| AkiTrade control plane plus direct broker API adapters | Clean authorization for brokers that offer OAuth or revocable API tokens; platform coverage is narrower and broker-specific | Infrastructure plus broker/API terms | Moderate to high |
| Managed terminal bridge service | Centralized monitoring and easier user experience; requires stronger operations, security reviews, broker permissions, and jurisdictional assessment | Higher continuous hosting and support cost | High |

The first two approaches are viable. The recommended staged sequence is: implement read-only account linking; complete paper execution against a broker demo account; introduce per-broker live activation only after a user expressly authorizes the account; then add a user-controlled terminal bridge for MT4/MT5. The product must remain strategy-neutral and avoid performance claims at every stage.

## Non-Negotiable Control Plane Requirements

The control plane must use encrypted secrets, per-user encryption keys where available, token rotation, explicit revocation, least-privilege scopes, signed bridge messages, replay protection, idempotent order identifiers, immutable audit logs, heartbeat monitoring, stale-market-data blocks, automatic pause on reconnection, rate limits, and an account-level kill switch. Continuous operation must never infer that the user wants to trade when a protective control is missing or stale.

## References

[1] [MQL5 — Python Integration](https://www.mql5.com/en/docs/python_metatrader5)

[2] [MetaTrader 4 — Expert Advisor Setup](https://www.metatrader4.com/en/trading-platform/help/autotrading/experts/experts_setup)

[3] [cTrader Open API — Getting Started](https://help.ctrader.com/open-api/)

[4] [OANDA v20 — Authentication](https://developer.oanda.com/rest-live-v20/authentication/)

[5] [OANDA v20 — Order Definitions](https://developer.oanda.com/rest-live-v20/order-df/)

[6] [Exness — Algorithmic Trading with Python and MT5](https://www.exness.com/blog/behind-the-markets/an-introduction-to-algorithmic-trading-with-python-and-mt5/)
