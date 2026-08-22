# Project TODO

- [x] Implement the mobile interface defined in `design.md` for portrait, one-handed Android use.
- [x] Replace template branding with the Exness Auto Trader display name while retaining the AkiTrade project identity.
- [x] Add secure sign-in, protected API workflows, and explicit no-Exness-password messaging.
- [x] Add database tables and server-side types for profiles, accounts, strategies, risk controls, decisions, positions, trades, backtests, notifications, and audit events.
- [x] Implement a server-side paper broker, deterministic BUY/SELL/WAIT strategy engine, and a disabled MT5 bridge adapter boundary.
- [x] Preserve the documented MT5 bridge contract: a separately operated terminal-side bridge only, with no terminal or broker credential in the mobile app.
- [x] Enforce paper-only mode, mandatory stop-loss/take-profit, maximum risk per trade, daily loss limit, daily trade limit, and open-position cap on the server.
- [x] Build Dashboard, Positions, History, Strategy, Risk, Backtest, Performance, Connection, Notifications, and Security workflows.
- [x] Add secure notification preferences and trading/risk event delivery hooks.
- [x] Generate a unique app icon and configure all required Android, splash, and favicon assets.
- [x] Add automated tests for authentication protection, paper-mode lockout, risk enforcement, close-all behaviour, and trade calculations.
- [x] Verify TypeScript, tests, and relevant Android UI screens; then create the first completed-project checkpoint.
