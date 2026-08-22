import type { AiRecommendation, NormalizedMarketQuote, PriceCandle, TradingPlatform } from "../../shared/trading";
import { invokeLLM } from "../_core/llm";

export type AiMarketAnalysisInput = {
  platform: TradingPlatform;
  symbol: string;
  quote: NormalizedMarketQuote;
  recentCandles: PriceCandle[];
};

const aiRecommendationSchema = {
  name: "akitrade_market_recommendation",
  strict: true,
  schema: {
    type: "object",
    properties: {
      decision: { type: "string", enum: ["buy", "sell", "wait"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      rationale: { type: "string", minLength: 1, maxLength: 600 },
      riskFactors: { type: "array", items: { type: "string" }, maxItems: 8 },
    },
    required: ["decision", "confidence", "rationale", "riskFactors"],
    additionalProperties: false,
  },
} as const;

function normalizeRecommendation(value: unknown): AiRecommendation {
  if (!value || typeof value !== "object") throw new Error("AI analysis returned an invalid recommendation");
  const result = value as Record<string, unknown>;
  const decision = result.decision;
  const confidence = Number(result.confidence);
  const rationale = result.rationale;
  const riskFactors = result.riskFactors;
  if ((decision !== "buy" && decision !== "sell" && decision !== "wait") || !Number.isFinite(confidence) || confidence < 0 || confidence > 1 || typeof rationale !== "string" || !Array.isArray(riskFactors) || !riskFactors.every((factor) => typeof factor === "string")) {
    throw new Error("AI analysis did not meet the AkiTrade recommendation contract");
  }
  return { decision, confidence, rationale, riskFactors, requiresRiskApproval: true, mayDispatchOrder: false };
}

/**
 * Produces a non-binding market-data recommendation. It does not receive account secrets,
 * invoke broker tools, construct orders, or call any execution path.
 */
export async function analyzeMarketWithAi(input: AiMarketAnalysisInput): Promise<AiRecommendation> {
  const marketContext = {
    platform: input.platform,
    symbol: input.symbol,
    quote: { bid: input.quote.bid, ask: input.quote.ask, last: input.quote.last, timestamp: input.quote.timestamp.toISOString() },
    recentCandles: input.recentCandles.slice(-32).map((candle) => ({ timestamp: candle.timestamp.toISOString(), open: candle.open, high: candle.high, low: candle.low, close: candle.close })),
  };
  const response = await invokeLLM({
    model: "gpt-5-mini",
    maxTokens: 700,
    messages: [
      {
        role: "system",
        content: "You are AkiTrade's bounded market-data analysis component. Analyze only the supplied normalized market data. Return a cautious structured recommendation, explicitly identifying uncertainty and risks. Do not promise gains, do not invent information, do not give personalized financial advice, do not mention credentials, and never propose direct execution. The system will independently risk-check every outcome.",
      },
      { role: "user", content: JSON.stringify(marketContext) },
    ],
    outputSchema: aiRecommendationSchema,
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("AI analysis returned no structured content");
  return normalizeRecommendation(JSON.parse(content));
}

/** Exposed for deterministic tests without invoking a model. */
export function validateAiRecommendation(value: unknown) { return normalizeRecommendation(value); }
