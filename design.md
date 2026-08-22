# AkiTrade — Mobile Interface and Security Design

## Product Intent

**Exness Auto Trader** is the display name for the Android application; the product identity remains **AkiTrade**. Version one is an authenticated **demo/paper-trading controller** for a server-side MT5-compatible automation layer. It is deliberately not a live-trading terminal, does not collect an Exness password, does not contain broker credentials, and does not claim or imply profitable outcomes. The product uses a calm operational-console aesthetic that helps a user confirm mode, risk state, and automation state at a glance.

> The app will remain in **Demo / Paper mode** in version one. The live-trading pathway is represented only as a server-side capability flag that defaults to false and is not exposed as an enabled client control.

## Mobile Layout Principles

The interface is designed for **portrait 9:16 use** and one-handed operation. The primary action sits within the lower reachable area, tab navigation is fixed to the bottom, and destructive actions use a confirmation sheet. Every screen must preserve a visible mode badge when automation could be armed. The minimum touch target is 44 pt, text supports dynamic sizing, colour is supplemented by labels and icons, and monetary values use tabular numerals where available.

## Screen List

| Screen | Primary content | Core functions |
| --- | --- | --- |
| Sign in | Security explanation, authenticated sign-in action, no-password assurance | Authenticate through the managed identity flow; surface privacy boundaries |
| Dashboard | Demo badge, automation status, balance, equity, margin, open trades, realized/unrealized P&L, current decision | Start or stop paper automation; open an emergency close-all confirmation; inspect account state |
| Positions | Open paper positions with symbol, side, size, entry, current price, stop-loss, take-profit, P&L | Review positions; close a selected paper position; navigate to detail |
| Trade detail | Lifecycle, risk check results, decision rationale, stop-loss/take-profit, simulated execution details | Close the position in paper mode; review audit context |
| History | Filterable completed paper trades and daily summaries | Inspect closed-trade detail and export-ready history later |
| Strategy | Instrument toggles, strategy selection, BUY/SELL/WAIT decision settings, simulation cadence | Save configuration to the authenticated profile; review strategy guardrails |
| Risk controls | Maximum risk per trade, maximum daily loss, maximum trades per day, maximum open positions, mandatory stop-loss/take-profit | Update server-validated paper trading constraints; view risk block status |
| Backtest | Strategy, instrument, synthetic/demo date interval and starting balance | Start a server-side deterministic backtest; view summary and trade list |
| Performance | P&L curve, win rate, drawdown, profit factor, average win/loss and trade count | Select timeframe; open a completed backtest or history period |
| Notifications | Trading-event notification preferences and delivery explanation | Enable/disable open, close, and daily loss-limit alerts |
| Connection | MT5 bridge health, environment label, last heartbeat and capability summary | View connection status; no credential entry or brokerage password field |
| Settings & security | Profile, sign-out, encryption/privacy description, version-one live-trading lockout | Sign out; review protections and live-trading constraints |

## Key User Flows

### Start paper automation

The user signs in, lands on the Dashboard, verifies the **Demo / Paper** badge and the risk-control summary, then taps **Start paper automation**. The client requests a server-side state change. The server validates the hard demo-mode lock, strategy configuration, and risk settings before accepting the start request. The dashboard changes to **Paper automation active** only when the response confirms activation.

### Respond to a trading decision

The backend adapter produces a normalized price snapshot. The selected rule strategy emits `BUY`, `SELL`, or `WAIT`. A risk gate independently evaluates daily loss, remaining daily trades, open-position capacity, maximum percent risk, and the required stop-loss/take-profit. Only a valid `BUY` or `SELL` decision that passes every risk check may create a **paper** position. A `WAIT` outcome and every rejected decision are recorded in the audit log for transparency.

### Emergency close all

The user taps **Close all trades** from the Dashboard or Positions screen. A bottom confirmation sheet states that the action closes all *paper* positions at the current simulated mark. Once confirmed, the server closes all positions atomically, stops new simulated entries until the next decision cycle, records the reason as `manual_emergency_close`, and triggers a notification event.

### Configure risk

The user opens Risk controls, changes one or more limits, and taps **Save controls**. The frontend validates the form for immediate feedback; the backend repeats validation and saves the authenticated user profile. Impossible settings, such as a non-positive risk percentage or a missing protective stop requirement, are rejected by the server.

### Backtest a strategy

The user selects a supported paper instrument, a strategy configuration, and a preset historical/synthetic range. The client submits the job to the backend. The backtest uses deterministic demo data supplied by the server, persists a result, and displays aggregate statistics plus the simulated trade sequence. It does not contact a broker, place an order, or make a performance forecast.

## Navigation Model

The persistent bottom bar uses four reachable destinations: **Overview**, **Trades**, **Strategy**, and **More**. Overview is the operational home. Trades contains a segmented control for Positions and History. Strategy leads to trading strategy, risk, and backtest. More contains Performance, Connection, Notifications, Settings, and Security. Secondary detail screens use a native top-left back affordance and keep primary actions near the bottom.

## Brand and Colour System

| Token | Colour | Intended meaning |
| --- | --- | --- |
| Ink Navy | `#081A2A` | Primary background and stable operational context |
| Trade Blue | `#1D6FE8` | Primary action and active navigation state |
| Ice Surface | `#F5F8FC` | Light elevated surface and readability contrast |
| Slate | `#6B7A90` | Secondary labels and metadata |
| Paper Teal | `#14B8A6` | Demo mode, neutral connection health, positive non-financial status |
| Guard Amber | `#F59E0B` | Risk warnings, daily-limit proximity, attention needed |
| Action Red | `#DC3545` | Loss figures, trading blocks, emergency close control |
| Signal Green | `#1F9D63` | Positive realized/unrealized paper P&L and successful actions |

The default theme is light, using Ice Surface and white cards, with an automatic dark theme using Ink Navy and elevated navy surfaces. Green and red communicate financial direction but never serve as the only signal: values are also marked with `+` / `−`, clear labels, and direction icons.

## Server and Data Boundaries

The mobile client holds only short-lived authenticated session material in the device secure store. Sensitive configuration and all integration secrets remain in the backend environment. The server owns automation activation, risk enforcement, decision logs, paper positions, backtests, performance calculations, notification-event generation, and the MT5 adapter interface. The adapter must accept only a pre-configured server connection and must never require an Exness password from the mobile client.

The first implementation will contain a **PaperBrokerAdapter** that processes normalized pricing and creates simulated fills. A separate `Mt5BridgeAdapter` interface will be implemented as a health-checked integration boundary. It will remain disabled until an approved, server-hosted bridge is configured. Any future live adapter requires a separate release, a server capability flag, explicit user confirmation, auditable broker authorization, and a fresh safety review.

## Non-Negotiable Risk and Security Controls

| Control | Version-one behaviour |
| --- | --- |
| Operating environment | `PAPER` is enforced server-side; `LIVE` requests are rejected |
| Password handling | No Exness password field, storage, transmission, or logging in the app |
| Authentication | Managed OAuth session; native token stored in platform secure storage |
| API secrets | Stored only in server environment configuration; never bundled in client code |
| Input integrity | Typed RPC boundary plus server-side schema validation |
| Trade protection | Every accepted paper order receives configured stop-loss and take-profit values |
| Risk cap | Per-trade risk, daily loss, daily trade count, and open-position maximum are independently checked server-side |
| Emergency control | Authenticated, confirmed close-all paper positions operation with audit reason |
| Auditability | Decision, rejection, configuration, lifecycle, and safety-lock events are retained per user |
| User messaging | Notifications disclose only pertinent position/risk events and never include credentials |

## Required Proof Points Before Release

The implementation must prove through automated tests that a live-order command is rejected, no authenticated API allows a position to bypass risk checks, unauthenticated calls fail, a daily-loss block prevents new simulated entries, close-all is deterministic, and client-facing types contain no secret or credential fields. The application will include a clear notice that paper results are simulations and do not guarantee future performance.

## Verified MT5 Integration Architecture

The official MT5 Python integration connects to an installed MetaTrader 5 terminal through interprocess communication and exposes account, market-data, order-check, order-send, position, and history functions. This requires a separately operated MT5 runtime and cannot be embedded in this managed Node mobile backend. [1] The production-ready evolution path is therefore a **separate, controlled bridge service** running beside a secured MT5 terminal. It receives only signed, scoped commands from the backend, applies its own broker-side checks, and reports normalized read-only status and audit events back to the application backend.

An MT5 Expert Advisor can alternatively call an approved HTTPS backend endpoint through the MQL5 `WebRequest` function, provided the URL is allowlisted in the terminal. However, the call is synchronous and unavailable in the Strategy Tester, so it is unsuitable as the mechanism for this version-one backtesting flow. [2] A deterministic server-side paper simulator will be used for version-one backtests instead. The mobile app will expose only connection health and a disabled bridge capability summary, never local terminal credentials.

## References

[1] [MetaTrader 5 — Python Integration Reference](https://www.mql5.com/en/docs/python_metatrader5)

[2] [MQL5 — WebRequest Reference](https://www.mql5.com/en/docs/network/webrequest)
