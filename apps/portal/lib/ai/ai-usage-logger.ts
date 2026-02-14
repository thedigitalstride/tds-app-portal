import mongoose from 'mongoose';
import { connectDB, AiUsageLog } from '@tds/database';
// ---------------------------------------------------------------------------
// Static pricing map (USD per 1M tokens)
// ---------------------------------------------------------------------------

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514':   { input: 3.00,  output: 15.00 },
  'claude-3-5-sonnet-20241022': { input: 3.00,  output: 15.00 },
  'claude-3-5-haiku-20241022':  { input: 0.80,  output: 4.00  },
  'gpt-4o':                     { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':                { input: 0.15,  output: 0.60  },
  'gpt-4-turbo':                { input: 10.00, output: 30.00 },
};

// ---------------------------------------------------------------------------
// Pricing helpers
// ---------------------------------------------------------------------------

export function getModelPricing(model: string): { input: number; output: number } {
  return MODEL_PRICING[model] ?? { input: 0, output: 0 };
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: { input: number; output: number }
): number {
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

// ---------------------------------------------------------------------------
// Exchange rate (USD -> GBP) with 1-hour in-memory cache
// ---------------------------------------------------------------------------

let exchangeRateCache: { rate: number; fetchedAt: number } | null = null;

const ONE_HOUR_MS = 60 * 60 * 1000;
const FALLBACK_GBP_RATE = 0.79;

export async function getUsdToGbpRate(): Promise<number> {
  try {
    if (exchangeRateCache && Date.now() - exchangeRateCache.fetchedAt < ONE_HOUR_MS) {
      return exchangeRateCache.rate;
    }

    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    const rate = data.rates?.GBP as number | undefined;

    if (rate && typeof rate === 'number') {
      exchangeRateCache = { rate, fetchedAt: Date.now() };
      return rate;
    }

    // API returned unexpected shape — use cached or fallback
    return exchangeRateCache?.rate ?? FALLBACK_GBP_RATE;
  } catch {
    // Network / parse error — use cached or fallback
    return exchangeRateCache?.rate ?? FALLBACK_GBP_RATE;
  }
}

// ---------------------------------------------------------------------------
// Main logging function
// ---------------------------------------------------------------------------

export async function logAiUsage(params: {
  toolId: string;
  userId: string;
  clientId?: string;
  purpose: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  resourceId?: string;
  resourceType?: string;
}): Promise<void> {
  try {
    const pricing = getModelPricing(params.model);
    const totalCost = calculateCost(params.inputTokens, params.outputTokens, pricing);

    if (pricing.input === 0 && pricing.output === 0) {
      console.warn(
        `[ai-usage-logger] Unknown model "${params.model}" — cost will be recorded as $0.00`
      );
    }

    await connectDB();

    await AiUsageLog.create({
      toolId: params.toolId,
      userId: new mongoose.Types.ObjectId(params.userId),
      clientId: params.clientId
        ? new mongoose.Types.ObjectId(params.clientId)
        : undefined,
      purpose: params.purpose,
      provider: params.provider,
      aiModel: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      inputCostPer1M: pricing.input,
      outputCostPer1M: pricing.output,
      totalCost,
      resourceId: params.resourceId,
      resourceType: params.resourceType,
    });
  } catch (error) {
    // NEVER let logging failures break the AI call
    console.error(
      '[ai-usage-logger] Failed to log AI usage:',
      error instanceof Error ? error.message : error
    );
  }
}
