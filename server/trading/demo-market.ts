import type { PriceCandle, SupportedInstrument } from "../../shared/trading";

const BASE_PRICES: Record<SupportedInstrument, number> = {
  EURUSD: 1.082,
  GBPUSD: 1.267,
  USDJPY: 148.2,
};

/**
 * Deterministic synthetic candles used only for paper-mode previews and backtests.
 * They are explicitly not market data, trading signals, or an execution feed.
 */
export function buildDemoPaperCandles(symbol: SupportedInstrument, count = 160): PriceCandle[] {
  const base = BASE_PRICES[symbol];
  const step = symbol === "USDJPY" ? 0.012 : 0.00012;
  const start = Date.UTC(2025, 0, 2, 9, 0, 0);
  let previousClose = base;

  return Array.from({ length: count }, (_, index) => {
    const trend = Math.sin(index / 10) * step * 7 + Math.cos(index / 23) * step * 3 + (index * step * 0.07);
    const close = Number((base + trend).toFixed(symbol === "USDJPY" ? 3 : 5));
    const open = previousClose;
    previousClose = close;
    const wick = step * (1.8 + (index % 5) * 0.15);
    return {
      timestamp: new Date(start + index * 60 * 60 * 1000),
      open,
      close,
      high: Number((Math.max(open, close) + wick).toFixed(symbol === "USDJPY" ? 3 : 5)),
      low: Number((Math.min(open, close) - wick).toFixed(symbol === "USDJPY" ? 3 : 5)),
    };
  });
}
