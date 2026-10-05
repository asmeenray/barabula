import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'
import type { CostTracker } from '@/lib/cost-log'

// Supabase user client (auth only)
const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}))

// OpenAI
const mockCreate = vi.fn()
vi.mock('openai', () => {
  class MockOpenAI {
    chat = { completions: { create: mockCreate } }
  }
  return { default: MockOpenAI }
})

// Service-role client: captures the cost_log insert made by the real tracker
const mockInsert = vi.fn()
const mockServiceFrom = vi.fn(() => ({ insert: mockInsert }))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mockServiceFrom }),
}))

// Spy on the tracker: the real implementation, with every call recorded
type TrackerSpy = {
  route: string
  userId: string | null
  count: ReturnType<typeof vi.fn>
  addUsage: ReturnType<typeof vi.fn>
  flush: ReturnType<typeof vi.fn>
}
const trackers: TrackerSpy[] = []
vi.mock('@/lib/cost-log', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/cost-log')>()
  return {
    ...actual,
    startCostLog: vi.fn((route: string, userId: string | null): CostTracker => {
      const real = actual.startCostLog(route, userId)
      const spy: TrackerSpy = {
        route,
        userId,
        count: vi.fn(real.count),
        addUsage: vi.fn(real.addUsage),
        flush: vi.fn(real.flush),
      }
      trackers.push(spy)
      return { count: spy.count, addUsage: spy.addUsage, flush: spy.flush } as CostTracker
    }),
  }
})

const USER = { id: 'user-1' }
const USAGE = { prompt_tokens: 400, completion_tokens: 120, total_tokens: 520 }

function completion(content: string, usage: typeof USAGE | undefined = USAGE) {
  return { choices: [{ message: { content } }], usage }
}

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  trackers.length = 0
  mockGetUser.mockResolvedValue({ data: { user: USER }, error: null })
  mockInsert.mockResolvedValue({ error: null })
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  errorSpy.mockRestore()
})

describe('POST /api/flights/lookup cost logging', () => {
  async function callFlights(body: unknown = { airline: 'BA', from_airport: 'London' }) {
    const { POST } = await import('@/app/api/flights/lookup/route')
    return POST(jsonRequest('http://localhost/api/flights/lookup', body) as unknown as NextRequest)
  }

  it('records one OpenAI call with gpt-4o usage and writes one cost_log row', async () => {
    mockCreate.mockResolvedValueOnce(
      completion(JSON.stringify({ found: true, from_airport: 'LHR', to_airport: null, note: 'Heathrow' }))
    )
    const res = await callFlights()
    expect(res.status).toBe(200)
    expect((await res.json()).from_airport).toBe('LHR')

    expect(trackers).toHaveLength(1)
    const t = trackers[0]
    expect(t.route).toBe('/api/flights/lookup')
    expect(t.userId).toBe('user-1')
    expect(t.count).toHaveBeenCalledTimes(1)
    expect(t.count).toHaveBeenCalledWith('openai')
    expect(t.addUsage).toHaveBeenCalledWith('gpt-4o', USAGE)
    expect(t.flush).toHaveBeenCalledTimes(1)

    expect(mockServiceFrom).toHaveBeenCalledWith('cost_log')
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      user_id: 'user-1',
      route: '/api/flights/lookup',
      model: 'gpt-4o',
      input_tokens: 400,
      output_tokens: 120,
      external_calls: { openai: 1 },
      est_cost_usd: expect.any(Number),
      latency_ms: expect.any(Number),
    })
  })

  it('still counts the OpenAI call and writes the row when OpenAI throws', async () => {
    mockCreate.mockRejectedValueOnce(new Error('rate limited'))
    const res = await callFlights()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Lookup failed' })

    const t = trackers[0]
    expect(t.count).toHaveBeenCalledWith('openai')
    expect(t.addUsage).not.toHaveBeenCalled()
    expect(t.flush).toHaveBeenCalledTimes(1)
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      external_calls: { openai: 1 },
      model: null,
      input_tokens: null,
      output_tokens: null,
      est_cost_usd: null,
    })
  })

  it('flushes once when the model returns unparseable JSON', async () => {
    mockCreate.mockResolvedValueOnce(completion('not json'))
    const res = await callFlights()
    expect(await res.json()).toEqual({ found: false })
    expect(trackers[0].flush).toHaveBeenCalledTimes(1)
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('keeps the response unchanged when the cost_log insert fails', async () => {
    mockCreate.mockResolvedValueOnce(completion(JSON.stringify({ found: true, from_airport: 'JFK' })))
    mockInsert.mockResolvedValueOnce({ error: { message: 'relation "cost_log" does not exist' } })
    const res = await callFlights()
    expect(res.status).toBe(200)
    expect((await res.json()).from_airport).toBe('JFK')
    expect(errorSpy).toHaveBeenCalledWith('[cost_log]', '/api/flights/lookup', 'relation "cost_log" does not exist')
  })

  it('starts no tracker and writes no row for an unauthenticated call', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    const res = await callFlights()
    expect(res.status).toBe(401)
    expect(trackers).toHaveLength(0)
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
