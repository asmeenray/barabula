import { describe, it, expect } from 'vitest'
import { OPENAI_PRICES_PER_1M, estimateOpenAICostUsd } from '@/lib/ai/pricing'

describe('OPENAI_PRICES_PER_1M', () => {
  it('holds exactly the two models the app requests', () => {
    expect(Object.keys(OPENAI_PRICES_PER_1M).sort()).toEqual(['gpt-4.1', 'gpt-4o'])
  })
})

describe('estimateOpenAICostUsd', () => {
  it('prices uncached, cached and output tokens from the table, rounded to 5 decimals', () => {
    const p = OPENAI_PRICES_PER_1M['gpt-4.1']
    const usage = { prompt_tokens: 1000, completion_tokens: 500, prompt_tokens_details: { cached_tokens: 200 } }
    const expected = Math.round((((1000 - 200) * p.input + 200 * p.cachedInput + 500 * p.output) / 1_000_000) * 1e5) / 1e5
    expect(estimateOpenAICostUsd('gpt-4.1', usage)).toBe(expected)
  })

  it('treats missing cached-token details as zero cached tokens', () => {
    const p = OPENAI_PRICES_PER_1M['gpt-4o']
    const expected = Math.round(((1000 * p.input + 100 * p.output) / 1_000_000) * 1e5) / 1e5
    expect(estimateOpenAICostUsd('gpt-4o', { prompt_tokens: 1000, completion_tokens: 100 })).toBe(expected)
    expect(estimateOpenAICostUsd('gpt-4o', { prompt_tokens: 1000, completion_tokens: 100, prompt_tokens_details: null })).toBe(expected)
  })

  it('returns a value with at most 5 decimals', () => {
    const v = estimateOpenAICostUsd('gpt-4o', { prompt_tokens: 7, completion_tokens: 3 })
    expect(v).not.toBeNull()
    expect(Number((v as number).toFixed(5))).toBe(v)
  })

  it('returns null for a model missing from the table, never a guess', () => {
    expect(estimateOpenAICostUsd('some-unknown-model', { prompt_tokens: 1000, completion_tokens: 500 })).toBeNull()
  })

  it('returns null for a dated snapshot id (lookups use the requested id)', () => {
    expect(estimateOpenAICostUsd('gpt-4o-2024-08-06', { prompt_tokens: 10, completion_tokens: 10 })).toBeNull()
  })

  it('returns null when usage is missing', () => {
    expect(estimateOpenAICostUsd('gpt-4.1', null)).toBeNull()
    expect(estimateOpenAICostUsd('gpt-4.1', undefined)).toBeNull()
  })
})
