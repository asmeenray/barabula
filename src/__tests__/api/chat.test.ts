import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CostTracker } from '@/lib/cost-log'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

const EMPTY_TRIP_STATE = {
  destination: null, origin: null, dates_start: null, dates_end: null,
  duration_days: null, travelers_count: null, travelers_type: null,
  budget: null, interests: [], travel_style: null, pace: null,
  constraints: [], notes: null, transport_mode: null,
}

const USAGE = { prompt_tokens: 1000, completion_tokens: 200, total_tokens: 1200 }

// A chat.completions.create() result (the route parses message.content itself)
function completion(
  body: unknown,
  { finish = 'stop', usage = USAGE as typeof USAGE | undefined, refusal = null as string | null } = {}
) {
  return {
    choices: [{
      message: { content: typeof body === 'string' ? body : body === null ? null : JSON.stringify(body), refusal },
      finish_reason: finish,
    }],
    usage,
  }
}

function gatheringReply() {
  return {
    reply: 'Where would you like to go?',
    trip_state: EMPTY_TRIP_STATE,
    conversation_phase: 'gathering_destination',
    itinerary: null,
  }
}

const mockCreate = vi.fn()

vi.mock('openai', () => {
  class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate,
      }
    }
  }
  return { default: MockOpenAI }
})

// Service-role client: captures the cost_log insert made by the real tracker
const mockCostInsert = vi.fn()
const mockServiceFrom = vi.fn(() => ({ insert: mockCostInsert }))
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

function resetOpenAIAndCost() {
  trackers.length = 0
  mockCreate.mockReset()
  mockCreate.mockResolvedValue(completion(gatheringReply()))
  mockCostInsert.mockReset()
  mockCostInsert.mockResolvedValue({ error: null })
}

const SESSION_ID = '11111111-1111-4111-8111-111111111111'
const NEW_SESSION_ID = '22222222-2222-4222-8222-222222222222'

type Call = [string, unknown[]]
// Every supabase.from(table) call records its method chain here, so tests can assert reads and writes
let chains: Record<string, Call[][]> = {}
let db: {
  sessionRow: Record<string, unknown> | null
  itineraryIds: string[]
  history: { role: string; content: string }[]
  itineraryInsertError: { message: string } | null
} = { sessionRow: null, itineraryIds: [], history: [], itineraryInsertError: null }

const has = (chain: Call[], name: string) => chain.some(([m]) => m === name)
const argsOf = (chain: Call[], name: string) => chain.find(([m]) => m === name)?.[1]
const chainsFor = (table: string) => chains[table] ?? []

function resultFor(table: string, chain: Call[]) {
  if (table === 'trip_sessions') {
    if (has(chain, 'maybeSingle')) return { data: db.sessionRow, error: null }
    if (has(chain, 'insert') && has(chain, 'single')) return { data: { id: NEW_SESSION_ID }, error: null }
    return { data: null, error: null }
  }
  if (table === 'chat_history') {
    if (has(chain, 'select')) return { data: db.history, error: null }
    return { data: null, error: null }
  }
  if (table === 'itineraries') {
    if (has(chain, 'insert') && has(chain, 'single')) {
      if (db.itineraryInsertError) return { data: null, error: db.itineraryInsertError }
      return { data: { id: db.itineraryIds.shift() ?? 'itin-1' }, error: null }
    }
    return { data: null, error: null }
  }
  return { data: [], error: null }
}

function builder(table: string) {
  const chain: Call[] = []
  ;(chains[table] ??= []).push(chain)
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'upsert', 'delete', 'single', 'maybeSingle']) {
    b[m] = vi.fn((...args: unknown[]) => { chain.push([m, args]); return b })
  }
  b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(resultFor(table, chain)).then(resolve, reject)
  return b
}

function setupMockFrom() {
  chains = {}
  db = { sessionRow: null, itineraryIds: [], history: [], itineraryInsertError: null }
  mockFrom.mockImplementation((table: string) => builder(table))
}

function activity(name: string, overrides: Record<string, unknown> = {}) {
  return {
    name, time: '10:00', description: `${name} description`, location: `${name} location`,
    activity_type: 'activity', hotel_name: null, star_rating: null, check_in: null, check_out: null,
    duration: null, tips: null,
    ...overrides,
  }
}

function itineraryBody(
  { title = 'Tokyo Adventure', durationDays = 1, activities = [activity('Arrive')] as ReturnType<typeof activity>[] } = {}
) {
  return {
    reply: 'Your itinerary is ready!',
    trip_state: {
      destination: 'Tokyo', origin: 'NYC', dates_start: '2026-04-01', dates_end: '2026-04-01',
      duration_days: durationDays, travelers_count: 2, travelers_type: 'couple',
      budget: '$3000', interests: ['food', 'culture'], travel_style: 'balanced', pace: 'moderate',
      constraints: [], notes: null, transport_mode: null,
    },
    conversation_phase: 'itinerary_complete',
    itinerary: {
      title,
      destination: 'Tokyo',
      start_date: '2026-04-01',
      end_date: '2026-04-01',
      description: 'A wonderful trip to Tokyo',
      days: [{ day_number: 1, activities }],
      flights: [],
      daily_food: [],
    },
  }
}

function completeItineraryReply(title = 'Tokyo Adventure') {
  return completion(itineraryBody({ title }))
}

function postMessage(body: Record<string, unknown>) {
  return new Request('http://localhost/api/chat/message', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('GET /api/chat/history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 401 when no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { GET } = await import('@/app/api/chat/history/route')
    const req = new Request('http://localhost/api/chat/history')
    const res = await GET(req as any)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 200 + array of messages when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const messages = [{ id: 'msg-1', role: 'user', content: 'Hello' }]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: messages, error: null }),
    })

    const { GET } = await import('@/app/api/chat/history/route')
    const req = new Request(`http://localhost/api/chat/history?session=${SESSION_ID}`)
    const res = await GET(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(messages)
  })
})

describe('POST /api/chat/message', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    setupMockFrom()
    resetOpenAIAndCost()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { POST } = await import('@/app/api/chat/message/route')
    const req = new Request('http://localhost/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ content: 'Plan me a trip' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('returns conversationPhase and tripState in response', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const { POST } = await import('@/app/api/chat/message/route')
    const req = new Request('http://localhost/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ content: 'I want to go to Tokyo' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.conversationPhase).toBe('gathering_destination')
    expect(body.tripState).toBeDefined()
    expect(body.content).toBe('Where would you like to go?')
  })

  it('returns itineraryId when phase is itinerary_complete with itinerary data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockCreate.mockResolvedValueOnce(completeItineraryReply())

    const { POST } = await import('@/app/api/chat/message/route')
    const req = new Request('http://localhost/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ content: 'Generate the itinerary!' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.itineraryId).toBe('itin-1')
    expect(body.conversationPhase).toBe('itinerary_complete')
  })

  it('rejects a partial itinerary (9 days requested, 1 returned) without saving it', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockCreate.mockResolvedValueOnce(completion(itineraryBody({ durationDays: 9 })))

    const { POST } = await import('@/app/api/chat/message/route')
    const req = new Request('http://localhost/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ content: 'Generate the itinerary!' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.itineraryId).toBeUndefined()
    expect(body.conversationPhase).toBe('ready_for_summary')
    expect(chainsFor('itineraries').some(c => has(c, 'insert'))).toBe(false)
    // New chat: no empty session row is created for a rejected reply
    expect(chainsFor('trip_sessions').some(c => has(c, 'insert'))).toBe(false)
    expect(body.sessionId).toBeUndefined()
  })

  it('overrides itinerary_complete to ready_for_summary when itinerary is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockCreate.mockResolvedValueOnce(completion({
      reply: 'Let me summarize your trip.',
      trip_state: { ...EMPTY_TRIP_STATE, destination: 'Paris' },
      conversation_phase: 'itinerary_complete',
      itinerary: null,
    }))

    const { POST } = await import('@/app/api/chat/message/route')
    const req = new Request('http://localhost/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ content: 'Go ahead!' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.conversationPhase).toBe('ready_for_summary')
    expect(body.itineraryId).toBeUndefined()
  })
})

describe('POST /api/chat/message: per-trip sessions (D-07, D-27)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    setupMockFrom()
    resetOpenAIAndCost()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('new chat: creates a session after the reply, saves both messages with its session_id and returns sessionId', async () => {
    const { POST } = await import('@/app/api/chat/message/route')
    const res = await POST(postMessage({ content: 'I want to go to Lisbon' }) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessionId).toBe(NEW_SESSION_ID)

    const sessionChains = chainsFor('trip_sessions')
    // No read of an existing session for a new chat, and no history query
    expect(sessionChains.some(c => has(c, 'maybeSingle'))).toBe(false)
    expect(chainsFor('chat_history').some(c => has(c, 'select'))).toBe(false)

    const insertChain = sessionChains.find(c => has(c, 'insert'))!
    expect(insertChain).toBeDefined()
    const inserted = argsOf(insertChain, 'insert')![0] as Record<string, unknown>
    expect(inserted.user_id).toBe('user-1')
    expect(inserted.conversation_phase).toBe('gathering_destination')
    expect(inserted.trip_state).toEqual(EMPTY_TRIP_STATE)
    expect(typeof inserted.updated_at).toBe('string')
    expect(argsOf(insertChain, 'select')).toEqual(['id'])

    const historyInsert = chainsFor('chat_history').find(c => has(c, 'insert'))!
    const rows = argsOf(historyInsert, 'insert')![0] as Array<Record<string, unknown>>
    expect(rows).toHaveLength(2)
    expect(rows.map(r => r.role)).toEqual(['user', 'assistant'])
    for (const row of rows) {
      expect(row.session_id).toBe(NEW_SESSION_ID)
      expect(row.user_id).toBe('user-1')
    }
    expect(sessionChains.some(c => has(c, 'upsert'))).toBe(false)
  })

  it('existing session: reads it by id, history by session_id, updates it by id, no upsert', async () => {
    db.sessionRow = { id: SESSION_ID, trip_state: { destination: 'Lisbon' }, conversation_phase: 'gathering_details' }
    const { POST } = await import('@/app/api/chat/message/route')
    const res = await POST(postMessage({ content: 'Four days please', sessionId: SESSION_ID }) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessionId).toBe(SESSION_ID)

    const sessionChains = chainsFor('trip_sessions')
    const readChain = sessionChains.find(c => has(c, 'maybeSingle'))!
    expect(readChain.filter(([m]) => m === 'eq').map(([, a]) => a)).toContainEqual(['id', SESSION_ID])

    const historyRead = chainsFor('chat_history').find(c => has(c, 'select'))!
    expect(historyRead.filter(([m]) => m === 'eq').map(([, a]) => a)).toContainEqual(['session_id', SESSION_ID])
    expect(argsOf(historyRead, 'limit')).toEqual([20])

    const updateChain = sessionChains.find(c => has(c, 'update'))!
    const update = argsOf(updateChain, 'update')![0] as Record<string, unknown>
    expect(update.conversation_phase).toBe('gathering_destination')
    expect(update.trip_state).toEqual(EMPTY_TRIP_STATE)
    expect(typeof update.updated_at).toBe('string')
    expect(updateChain.filter(([m]) => m === 'eq').map(([, a]) => a)).toContainEqual(['id', SESSION_ID])

    expect(sessionChains.some(c => has(c, 'insert'))).toBe(false)
    expect(sessionChains.some(c => has(c, 'upsert'))).toBe(false)

    const rows = argsOf(chainsFor('chat_history').find(c => has(c, 'insert'))!, 'insert')![0] as Array<Record<string, unknown>>
    expect(rows.every(r => r.session_id === SESSION_ID)).toBe(true)
  })

  it('returns 400 for a non-UUID sessionId and touches nothing', async () => {
    const { POST } = await import('@/app/api/chat/message/route')
    const res = await POST(postMessage({ content: 'Hi', sessionId: 'not-a-uuid' }) as any)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid session id')
    expect(mockFrom).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown or foreign sessionId and creates nothing', async () => {
    db.sessionRow = null
    const { POST } = await import('@/app/api/chat/message/route')
    const res = await POST(postMessage({ content: 'Hi', sessionId: SESSION_ID }) as any)
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Chat not found')
    expect(mockCreate).not.toHaveBeenCalled()
    expect(chainsFor('trip_sessions').some(c => has(c, 'insert') || has(c, 'update'))).toBe(false)
    expect(chainsFor('chat_history')).toHaveLength(0)
  })

  it('itinerary_complete links the session to the new itinerary; a later itinerary re-points it (D-27)', async () => {
    db.sessionRow = { id: SESSION_ID, trip_state: { destination: 'Tokyo' }, conversation_phase: 'ready_for_summary' }
    db.itineraryIds = ['itin-1', 'itin-2']
    mockCreate
      .mockResolvedValueOnce(completeItineraryReply('Tokyo Adventure'))
      .mockResolvedValueOnce(completeItineraryReply('Tokyo Adventure v2'))

    const { POST } = await import('@/app/api/chat/message/route')
    const first = await (await POST(postMessage({ content: 'Generate it', sessionId: SESSION_ID }) as any)).json()
    const second = await (await POST(postMessage({ content: 'Again, slower', sessionId: SESSION_ID }) as any)).json()
    expect(first.itineraryId).toBe('itin-1')
    expect(second.itineraryId).toBe('itin-2')
    expect(first.sessionId).toBe(SESSION_ID)
    expect(second.sessionId).toBe(SESSION_ID)

    const links = chainsFor('trip_sessions')
      .filter(c => has(c, 'update') && 'itinerary_id' in (argsOf(c, 'update')![0] as object))
    expect(links.map(c => (argsOf(c, 'update')![0] as Record<string, unknown>).itinerary_id)).toEqual(['itin-1', 'itin-2'])
    for (const c of links) {
      expect(c.filter(([m]) => m === 'eq').map(([, a]) => a)).toContainEqual(['id', SESSION_ID])
    }
  })

  it('new chat that completes an itinerary links the newly created session', async () => {
    db.itineraryIds = ['itin-9']
    mockCreate.mockResolvedValueOnce(completeItineraryReply())
    const { POST } = await import('@/app/api/chat/message/route')
    const body = await (await POST(postMessage({ content: 'Generate it' }) as any)).json()
    expect(body.sessionId).toBe(NEW_SESSION_ID)
    const link = chainsFor('trip_sessions').find(c => has(c, 'update'))!
    expect((argsOf(link, 'update')![0] as Record<string, unknown>).itinerary_id).toBe('itin-9')
    expect(link.filter(([m]) => m === 'eq').map(([, a]) => a)).toContainEqual(['id', NEW_SESSION_ID])
  })

  it('new chat whose AI call fails creates no session row', async () => {
    mockCreate.mockRejectedValueOnce(new Error('upstream down'))
    const { POST } = await import('@/app/api/chat/message/route')
    await expect(POST(postMessage({ content: 'Plan Rome' }) as any)).rejects.toThrow('upstream down')
    expect(chainsFor('trip_sessions').some(c => has(c, 'insert'))).toBe(false)
    expect(chainsFor('chat_history').some(c => has(c, 'insert'))).toBe(false)
  })
})

describe('POST /api/chat/message: create(), length retry and cost logging (D-15)', () => {
  const TOO_LARGE = 'Itinerary too large to generate — try a shorter trip or fewer days.'
  const FIRST_USAGE = { prompt_tokens: 3000, completion_tokens: 32768, total_tokens: 35768 }
  const RETRY_USAGE = { prompt_tokens: 3100, completion_tokens: 9000, total_tokens: 12100 }
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    setupMockFrom()
    resetOpenAIAndCost()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    errorSpy.mockRestore()
    vi.unstubAllGlobals()
    delete process.env.UNSPLASH_ACCESS_KEY
    delete process.env.PEXELS_API_KEY
    delete process.env.FOURSQUARE_API_KEY
  })

  async function send(body: Record<string, unknown> = { content: 'I want to go to Tokyo' }) {
    const { POST } = await import('@/app/api/chat/message/route')
    return POST(postMessage(body) as any)
  }

  const costRow = () => mockCostInsert.mock.calls[0][0] as Record<string, unknown>

  it('normal reply: one create() call with gpt-4.1, the prompt and the zod response_format; one cost row', async () => {
    const res = await send()
    expect(res.status).toBe(200)
    expect((await res.json()).content).toBe('Where would you like to go?')

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const args = mockCreate.mock.calls[0][0]
    expect(args.model).toBe('gpt-4.1')
    expect(args.max_tokens).toBe(32768)
    expect(args.messages[0].role).toBe('system')
    expect(args.messages[0].content.startsWith('CONCISE MODE')).toBe(false)
    expect(args.messages.at(-1)).toEqual({ role: 'user', content: 'I want to go to Tokyo' })
    expect(args.response_format.type).toBe('json_schema')
    expect(args.response_format.json_schema.name).toBe('ai_response')

    expect(trackers).toHaveLength(1)
    const t = trackers[0]
    expect(t.route).toBe('/api/chat/message')
    expect(t.userId).toBe('user-1')
    expect(t.count.mock.calls).toEqual([['openai']])
    expect(t.addUsage).toHaveBeenCalledWith('gpt-4.1', USAGE)
    expect(t.flush).toHaveBeenCalledTimes(1)
    expect(mockServiceFrom).toHaveBeenCalledWith('cost_log')
    expect(mockCostInsert).toHaveBeenCalledTimes(1)
    expect(costRow()).toMatchObject({
      user_id: 'user-1',
      route: '/api/chat/message',
      model: 'gpt-4.1',
      input_tokens: 1000,
      output_tokens: 200,
      external_calls: { openai: 1 },
      est_cost_usd: expect.any(Number),
      latency_ms: expect.any(Number),
    })
  })

  it('first attempt stops on length: retries once in concise mode and sums both attempts', async () => {
    mockCreate
      .mockResolvedValueOnce(completion('{"reply": "cut off', { finish: 'length', usage: FIRST_USAGE }))
      .mockResolvedValueOnce(completion(gatheringReply(), { usage: RETRY_USAGE }))

    const res = await send()
    expect(res.status).toBe(200)
    expect((await res.json()).content).toBe('Where would you like to go?')

    expect(mockCreate).toHaveBeenCalledTimes(2)
    const retry = mockCreate.mock.calls[1][0]
    expect(retry.model).toBe('gpt-4.1')
    expect(retry.messages[0].content.startsWith('CONCISE MODE')).toBe(true)
    expect(retry.response_format.json_schema.name).toBe('ai_response')

    const t = trackers[0]
    expect(t.count.mock.calls).toEqual([['openai'], ['openai']])
    expect(t.addUsage.mock.calls).toEqual([['gpt-4.1', FIRST_USAGE], ['gpt-4.1', RETRY_USAGE]])
    expect(t.flush).toHaveBeenCalledTimes(1)
    expect(costRow()).toMatchObject({
      model: 'gpt-4.1',
      input_tokens: 6100,
      output_tokens: 41768,
      external_calls: { openai: 2 },
      est_cost_usd: expect.any(Number),
    })
  })

  it('two length stops in a row: returns the "too large" 500 and still writes the cost row', async () => {
    mockCreate
      .mockResolvedValueOnce(completion('{"reply": "cut', { finish: 'length', usage: FIRST_USAGE }))
      .mockResolvedValueOnce(completion('{"reply": "cut again', { finish: 'length', usage: RETRY_USAGE }))

    const res = await send()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: TOO_LARGE })
    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(trackers[0].flush).toHaveBeenCalledTimes(1)
    expect(costRow()).toMatchObject({ input_tokens: 6100, output_tokens: 41768, external_calls: { openai: 2 } })
    expect(chainsFor('trip_sessions').some(c => has(c, 'insert'))).toBe(false)
  })

  it('concise retry throws: returns the "too large" 500 and keeps the first attempt usage', async () => {
    mockCreate
      .mockResolvedValueOnce(completion('{"reply": "cut', { finish: 'length', usage: FIRST_USAGE }))
      .mockRejectedValueOnce(new Error('upstream down'))

    const res = await send()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: TOO_LARGE })
    expect(costRow()).toMatchObject({ input_tokens: 3000, output_tokens: 32768, external_calls: { openai: 2 } })
  })

  it('a thrown first attempt is rethrown, counted and flushed once (no tokens)', async () => {
    mockCreate.mockRejectedValueOnce(new Error('rate limited'))
    await expect(send()).rejects.toThrow('rate limited')
    expect(mockCreate).toHaveBeenCalledTimes(1)
    const t = trackers[0]
    expect(t.addUsage).not.toHaveBeenCalled()
    expect(t.flush).toHaveBeenCalledTimes(1)
    expect(costRow()).toMatchObject({ model: null, input_tokens: null, output_tokens: null, external_calls: { openai: 1 } })
  })

  it.each([
    ['content that is not JSON', completion('not json at all')],
    ['JSON that fails AIResponseSchema', completion({ reply: 42, trip_state: {}, conversation_phase: 'nope', itinerary: null })],
    ['a refusal', completion(null, { refusal: 'I cannot help with that.' })],
    ['empty content', completion('')],
  ])('%s returns "AI response parse failed" 500 and still writes the cost row', async (_label, result) => {
    mockCreate.mockResolvedValueOnce(result)
    const res = await send()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'AI response parse failed' })
    expect(trackers[0].flush).toHaveBeenCalledTimes(1)
    expect(mockCostInsert).toHaveBeenCalledTimes(1)
    expect(costRow()).toMatchObject({ model: 'gpt-4.1', input_tokens: 1000, external_calls: { openai: 1 } })
    expect(chainsFor('trip_sessions').some(c => has(c, 'insert'))).toBe(false)
    expect(chainsFor('chat_history').some(c => has(c, 'insert'))).toBe(false)
  })

  it('itinerary_complete: cover image, activity image and places lookups are counted in external_calls', async () => {
    process.env.UNSPLASH_ACCESS_KEY = 'test-unsplash-key'
    process.env.PEXELS_API_KEY = 'test-pexels-key'
    process.env.FOURSQUARE_API_KEY = 'test-fsq-key'
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('api.unsplash.com')) return { ok: false, status: 404 } as Response
      if (url.includes('api.pexels.com')) {
        return { ok: true, json: async () => ({ photos: [{ src: { large2x: 'https://images.pexels.com/x.jpg' } }] }) } as Response
      }
      if (url.includes('api.foursquare.com')) {
        return { ok: true, json: async () => ({ results: [{ rating: 8.8, price: 2 }] }) } as Response
      }
      throw new Error(`unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    mockCreate.mockResolvedValueOnce(completion(itineraryBody({
      activities: [
        activity('Senso-ji'),
        activity('Check in', { activity_type: 'hotel', hotel_name: 'Park Hyatt', star_rating: 5 }),
      ],
    })))

    const res = await send({ content: 'Generate it' })
    expect(res.status).toBe(200)
    expect((await res.json()).itineraryId).toBe('itin-1')

    // Cover: unsplash + pexels. Senso-ji: unsplash + pexels + foursquare. Hotel: no lookups.
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(trackers[0].flush).toHaveBeenCalledTimes(1)
    expect(costRow()).toMatchObject({
      route: '/api/chat/message',
      model: 'gpt-4.1',
      external_calls: { openai: 1, unsplash: 2, pexels: 2, foursquare: 1 },
    })

    const activityRows = argsOf(chainsFor('activities').find(c => has(c, 'insert'))!, 'insert')![0] as Array<Record<string, any>>
    expect(activityRows[0].extra_data).toMatchObject({ photo_url: 'https://images.pexels.com/x.jpg', places_rating: 8.8, places_price_level: 2 })
  })

  it('a failed itinerary insert still flushes the cost row once', async () => {
    db.itineraryInsertError = { message: 'insert failed' }
    mockCreate.mockResolvedValueOnce(completeItineraryReply())
    const res = await send({ content: 'Generate it' })
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to save itinerary')
    expect(trackers[0].flush).toHaveBeenCalledTimes(1)
    expect(mockCostInsert).toHaveBeenCalledTimes(1)
  })

  it('400 and 404 paths after the auth guard flush once and write no row (no external call)', async () => {
    const bad = await send({ content: 'Hi', sessionId: 'not-a-uuid' })
    expect(bad.status).toBe(400)
    db.sessionRow = null
    const missing = await send({ content: 'Hi', sessionId: SESSION_ID })
    expect(missing.status).toBe(404)
    expect(trackers).toHaveLength(2)
    for (const t of trackers) expect(t.flush).toHaveBeenCalledTimes(1)
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockCostInsert).not.toHaveBeenCalled()
  })

  it('unauthenticated: no tracker and no row', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await send()
    expect(res.status).toBe(401)
    expect(trackers).toHaveLength(0)
    expect(mockCostInsert).not.toHaveBeenCalled()
  })

  it('history: sends the newest 20 messages, oldest first', async () => {
    db.sessionRow = { id: SESSION_ID, trip_state: { destination: 'Lisbon' }, conversation_phase: 'gathering_details' }
    // The query returns newest first; the route must put them back in chat order
    db.history = [
      { role: 'assistant', content: 'newest reply' },
      { role: 'user', content: 'newer question' },
      { role: 'assistant', content: 'older reply' },
    ]
    const res = await send({ content: 'And day three?', sessionId: SESSION_ID })
    expect(res.status).toBe(200)

    const historyRead = chainsFor('chat_history').find(c => has(c, 'select'))!
    expect(argsOf(historyRead, 'order')).toEqual(['created_at', { ascending: false }])
    expect(argsOf(historyRead, 'limit')).toEqual([20])

    const messages = mockCreate.mock.calls[0][0].messages as Array<{ role: string; content: string }>
    expect(messages.slice(1)).toEqual([
      { role: 'assistant', content: 'older reply' },
      { role: 'user', content: 'newer question' },
      { role: 'assistant', content: 'newest reply' },
      { role: 'user', content: 'And day three?' },
    ])
  })
})
