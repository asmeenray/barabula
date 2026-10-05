import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { estimateOpenAICostUsd } from '@/lib/ai/pricing'

const mockInsert = vi.fn()
const mockFrom = vi.fn(() => ({ insert: mockInsert }))
const mockCreateServiceClient = vi.fn(() => ({ from: mockFrom }))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => mockCreateServiceClient(),
}))

import { startCostLog } from '@/lib/cost-log'

describe('startCostLog', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('records only non-zero external call counts', async () => {
    const cost = startCostLog('/api/test', 'user-1')
    cost.count('unsplash')
    cost.count('unsplash')
    cost.count('nominatim')
    cost.count('pexels', 0)
    await cost.flush()

    expect(mockFrom).toHaveBeenCalledWith('cost_log')
    expect(mockInsert).toHaveBeenCalledTimes(1)
    const row = mockInsert.mock.calls[0][0]
    expect(row.external_calls).toEqual({ unsplash: 2, nominatim: 1 })
    expect(row.model).toBeNull()
    expect(row.input_tokens).toBeNull()
    expect(row.output_tokens).toBeNull()
    expect(row.est_cost_usd).toBeNull()
  })

  it('sums tokens and costs across usage calls and writes one full row', async () => {
    const u1 = { prompt_tokens: 1000, completion_tokens: 500, prompt_tokens_details: { cached_tokens: 200 } }
    const u2 = { prompt_tokens: 300, completion_tokens: 100 }
    const cost = startCostLog('/api/chat/message', 'user-1')
    cost.count('openai', 2)
    cost.addUsage('gpt-4.1', u1)
    cost.addUsage('gpt-4.1', u2)
    await cost.flush()

    expect(mockInsert).toHaveBeenCalledTimes(1)
    const row = mockInsert.mock.calls[0][0]
    const expectedCost =
      Math.round(((estimateOpenAICostUsd('gpt-4.1', u1) as number) + (estimateOpenAICostUsd('gpt-4.1', u2) as number)) * 1e5) / 1e5
    expect(row).toEqual({
      user_id: 'user-1',
      route: '/api/chat/message',
      model: 'gpt-4.1',
      input_tokens: 1300,
      output_tokens: 600,
      external_calls: { openai: 2 },
      est_cost_usd: expectedCost,
      latency_ms: expect.any(Number),
    })
    expect(Number.isInteger(row.latency_ms)).toBe(true)
    expect(row.latency_ms).toBeGreaterThanOrEqual(0)
  })

  it('measures latency from startCostLog', async () => {
    vi.useFakeTimers()
    try {
      const cost = startCostLog('/api/test', null)
      cost.count('openai')
      vi.advanceTimersByTime(250)
      await cost.flush()
      expect(mockInsert.mock.calls[0][0].latency_ms).toBe(250)
      expect(mockInsert.mock.calls[0][0].user_id).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('gives est_cost_usd null when any call has an unknown model', async () => {
    const cost = startCostLog('/api/test', 'user-1')
    cost.addUsage('gpt-4o', { prompt_tokens: 10, completion_tokens: 10 })
    cost.addUsage('mystery-model', { prompt_tokens: 10, completion_tokens: 10 })
    await cost.flush()
    const row = mockInsert.mock.calls[0][0]
    expect(row.est_cost_usd).toBeNull()
    expect(row.model).toBe('mystery-model')
    expect(row.input_tokens).toBe(20)
  })

  it('inserts nothing when there are no counts and no usage', async () => {
    const cost = startCostLog('/api/test', 'user-1')
    await cost.flush()
    expect(mockCreateServiceClient).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('makes a second flush a no-op', async () => {
    const cost = startCostLog('/api/test', 'user-1')
    cost.count('openai')
    await cost.flush()
    await cost.flush()
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('resolves and logs when the insert returns an error', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'relation "cost_log" does not exist' } })
    const cost = startCostLog('/api/test', 'user-1')
    cost.count('openai')
    await expect(cost.flush()).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith('[cost_log]', '/api/test', 'relation "cost_log" does not exist')
  })

  it('resolves and logs when creating the client throws', async () => {
    mockCreateServiceClient.mockImplementationOnce(() => {
      throw new Error('supabaseKey is required.')
    })
    const cost = startCostLog('/api/test', 'user-1')
    cost.count('nominatim')
    await expect(cost.flush()).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith('[cost_log]', '/api/test', 'supabaseKey is required.')
  })

  it('resolves and logs when the insert rejects', async () => {
    mockInsert.mockRejectedValue(new Error('network down'))
    const cost = startCostLog('/api/test', 'user-1')
    cost.count('openai')
    await expect(cost.flush()).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith('[cost_log]', '/api/test', 'network down')
  })
})
