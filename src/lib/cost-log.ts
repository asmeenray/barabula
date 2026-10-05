import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { estimateOpenAICostUsd, roundUsd, type OpenAIUsage } from '@/lib/ai/pricing'

export type ExternalCallKind = 'openai' | 'unsplash' | 'pexels' | 'foursquare' | 'nominatim'

export type CostTracker = {
  /** Count external request attempts of one kind (call right before the request). */
  count(kind: ExternalCallKind, n?: number): void
  /** Record token usage of one OpenAI call, keyed by the requested model id. */
  addUsage(model: string, usage: OpenAIUsage | null | undefined): void
  /** Insert one cost_log row if anything was recorded. Runs once, never throws. */
  flush(): Promise<void>
}

/**
 * One tracker per request (D-15). Writes go through the service-role client
 * because cost_log has RLS on and no policies. A failed insert is logged and
 * swallowed so it never changes the route's response.
 */
export function startCostLog(route: string, userId: string | null): CostTracker {
  const startedAt = Date.now()
  const counts: Partial<Record<ExternalCallKind, number>> = {}
  let model: string | null = null
  let usageCalls = 0
  let inputTokens = 0
  let outputTokens = 0
  let costUsd: number | null = 0
  let flushed = false

  return {
    count(kind, n = 1) {
      if (n <= 0) return
      counts[kind] = (counts[kind] ?? 0) + n
    },

    addUsage(requestedModel, usage) {
      model = requestedModel
      usageCalls++
      if (usage) {
        inputTokens += usage.prompt_tokens
        outputTokens += usage.completion_tokens
      }
      const estimate = estimateOpenAICostUsd(requestedModel, usage)
      costUsd = estimate === null || costUsd === null ? null : costUsd + estimate
    },

    async flush() {
      if (flushed) return
      flushed = true
      const hasCounts = Object.values(counts).some(n => (n ?? 0) > 0)
      if (!hasCounts && usageCalls === 0) return

      const row = {
        user_id: userId,
        route,
        model,
        input_tokens: usageCalls > 0 ? inputTokens : null,
        output_tokens: usageCalls > 0 ? outputTokens : null,
        external_calls: counts,
        est_cost_usd: usageCalls > 0 && costUsd !== null ? roundUsd(costUsd) : null,
        latency_ms: Math.max(0, Math.round(Date.now() - startedAt)),
      }

      try {
        const { error } = await createServiceClient().from('cost_log').insert(row)
        if (error) console.error('[cost_log]', route, error.message ?? error)
      } catch (err) {
        console.error('[cost_log]', route, err instanceof Error ? err.message : err)
      }
    },
  }
}
