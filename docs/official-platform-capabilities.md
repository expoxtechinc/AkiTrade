# Official Platform Capability Notes

## MetaTrader 5

The official MetaTrader 5 Python integration is a terminal-side interface. It exposes terminal initialization and login together with account information, symbols, ticks and rates, margin/profit calculation, order checking and sending, positions, orders, and historical orders/deals. The AkiTrade adapter must therefore target a separately operated MT5 terminal bridge; it must not attempt to embed the terminal or collect broker passwords in the Android client. [1]

## cTrader

cTrader Open API supports authorized applications for cTrader-affiliated broker accounts and uses JSON or Protocol Buffers messages. Its official documented capability surface includes real-time market data, permitted trading operations, and historical/current/pending deal, order, and position retrieval. It supports both demo and live accounts, making demo the required first connection environment for AkiTrade. [2]

## Architecture Implication

Both platforms map into the same normalized AkiTrade adapter surface: account, market data, positions, orders, order status, and history. Their authorization and transport methods remain adapter-specific. The core engine may accept normalized recommendations and execution intents only; it must not receive raw platform credentials.

## Exness and MetaTrader 4/5

Exness documents algorithmic use through an MT5 terminal/API workflow and through Expert Advisors running on desktop MT4/MT5 terminals. Its help guidance states that MT4/MT5 Expert Advisors run on desktop terminals rather than mobile or web versions, and that MT4 and MT5 EAs are platform-specific. AkiTrade therefore models Exness as a broker context attached to an MT4/MT5 terminal-side bridge, not as a mobile-password or screen-scraping integration. [3] [4]

## Interactive Brokers

Interactive Brokers identifies the Trader Workstation API as a way to build applications in Java, .NET, C++, Python, or DDE, but its older TWS API documentation points developers to the current IBKR Campus API material. The adapter is therefore an official-API implementation placeholder pending the current API entitlement, client gateway, and account authorization configuration. [5]

## Alpaca and Binance

Alpaca documents separate paper trading and live brokerage/crypto capabilities, plus standard and advanced order types. AkiTrade treats Alpaca paper as the first test environment for that adapter. [6] Binance publishes an official developer documentation surface; its adapter remains capability-gated until a user has completed the exchange’s official API-key authorization and the regional/account eligibility checks. [7]

## Adapter Readiness

| Platform context | Authorization boundary | Initial AkiTrade capability |
| --- | --- | --- |
| MT5 / Exness MT5 | User-controlled desktop terminal bridge | Health and paper-intent preparation; no mobile password |
| MT4 / Exness MT4 | User-controlled desktop EA bridge | Health and paper-intent preparation; no mobile password |
| cTrader | Official cTID/Open API authorization | Adapter contract ready; connect flow can be authorized later |
| Interactive Brokers | Official TWS/Gateway authorization | Adapter contract ready; entitlement configuration required |
| Alpaca | Official server-side API credential vault | Paper-first adapter contract ready |
| Binance | Official server-side API credential vault | Capability-gated adapter contract ready |
| Other provider | Official OAuth/API/terminal bridge only | Register a future adapter without modifying the core engine |

## References

[1] [MQL5 — MetaTrader 5 Python Integration](https://www.mql5.com/en/docs/python_metatrader5)

[2] [cTrader — Open API Getting Started](https://help.ctrader.com/open-api/)

[3] [Exness — Algorithmic Trading with Python and MT5](https://www.exness.com/blog/behind-the-markets/an-introduction-to-algorithmic-trading-with-python-and-mt5/)

[4] [Exness Help — Using Expert Advisors](https://get.exness.help/hc/en-us/articles/360019530859-Using-Expert-Advisors-EA)

[5] [Interactive Brokers — TWS API](https://interactivebrokers.github.io/tws-api/)

[6] [Alpaca — Trading API](https://docs.alpaca.markets/docs/trading-api)

[7] [Binance — Developer Documentation](https://developers.binance.com/docs/binance-spot-api-docs)
