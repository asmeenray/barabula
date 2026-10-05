// USD per 1M tokens, OpenAI Standard tier. Update by hand.
// Source: https://developers.openai.com/api/docs/pricing (Standard table, checked 2026-10-05).
// Keys are the model ids this app requests, never the dated ids the API echoes back.
export const OPENAI_PRICES_PER_1M: Record<string, { input: number; cachedInput: number; output: number }> = {
  'gpt-4.1': { input: 2.0, cachedInput: 0.5, output: 8.0 },
  'gpt-4o': { input: 2.5, cachedInput: 1.25, output: 10.0 },
}

/** The usage fields we read from an OpenAI chat completion. */
export type OpenAIUsage = {
  prompt_tokens: number
  completion_tokens: number
  prompt_tokens_details?: { cached_tokens?: number } | null
}

export function roundUsd(value: number): number {
  return Math.round(value * 1e5) / 1e5
}

/**
 * Estimated cost in USD, rounded to 5 decimals. Cached prompt tokens are
 * priced at the cached rate. Unknown model or missing usage gives null.
 */
export function estimateOpenAICostUsd(
  model: string,
  usage: OpenAIUsage | null | undefined
): number | null {
  const price = OPENAI_PRICES_PER_1M[model]
  if (!price || !usage) return null
  const cached = Math.min(usage.prompt_tokens_details?.cached_tokens ?? 0, usage.prompt_tokens)
  const uncached = usage.prompt_tokens - cached
  const total =
    (uncached * price.input + cached * price.cachedInput + usage.completion_tokens * price.output) / 1_000_000
  return roundUsd(total)
}
