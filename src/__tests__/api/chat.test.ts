import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

const mockParse = vi.fn().mockResolvedValue({
  choices: [{
    message: {
      parsed: {
        reply: 'Where would you like to go?',
        trip_state: {
          destination: null, origin: null, dates_start: null, dates_end: null,
          duration_days: null, travelers_count: null, travelers_type: null,
          budget: null, interests: [], travel_style: null, pace: null,
          constraints: [], notes: null,
        },
        conversation_phase: 'gathering_destination',
        itinerary: null,
      }
    }
  }]
})

vi.mock('openai', () => {
  class MockOpenAI {
    chat = {
      completions: {
        parse: mockParse,
      }
    }
  }
  return { default: MockOpenAI }
})

const SESSION_ID = '11111111-1111-4111-8111-111111111111'
const NEW_SESSION_ID = '22222222-2222-4222-8222-222222222222'

type Call = [string, unknown[]]
// Every supabase.from(table) call records its method chain here, so tests can assert reads and writes
let chains: Record<string, Call[][]> = {}
let db: { sessionRow: Record<string, unknown> | null; itineraryIds: string[] } = { sessionRow: null, itineraryIds: [] }

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
    if (has(chain, 'select')) return { data: [], error: null }
    return { data: null, error: null }
  }
  if (table === 'itineraries') {
    if (has(chain, 'insert') && has(chain, 'single')) return { data: { id: db.itineraryIds.shift() ?? 'itin-1' }, error: null }
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
  db = { sessionRow: null, itineraryIds: [] }
  mockFrom.mockImplementation((table: string) => builder(table))
}

const EMPTY_TRIP_STATE = {
  destination: null, origin: null, dates_start: null, dates_end: null,
  duration_days: null, travelers_count: null, travelers_type: null,
  budget: null, interests: [], travel_style: null, pace: null,
  constraints: [], notes: null,
}

function completeItineraryReply(title = 'Tokyo Adventure') {
  return {
    choices: [{
      message: {
        parsed: {
          reply: 'Your itinerary is ready!',
          trip_state: {
            destination: 'Tokyo', origin: 'NYC', dates_start: '2026-04-01', dates_end: '2026-04-01',
            duration_days: 1, travelers_count: 2, travelers_type: 'couple',
            budget: '$3000', interests: ['food', 'culture'], travel_style: 'balanced', pace: 'moderate',
            constraints: [], notes: null,
          },
          conversation_phase: 'itinerary_complete',
          itinerary: {
            title,
            destination: 'Tokyo',
            start_date: '2026-04-01',
            end_date: '2026-04-01',
            description: 'A wonderful trip to Tokyo',
            days: [
              {
                day_number: 1,
                activities: [
                  { name: 'Arrive', time: '10:00', description: 'Land at Narita', location: 'Narita Airport' },
                ],
              },
            ],
          },
        }
      }
    }]
  }
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
    mockParse.mockResolvedValueOnce({
      choices: [{
        message: {
          parsed: {
            reply: 'Your itinerary is ready!',
            trip_state: {
              destination: 'Tokyo', origin: 'NYC', dates_start: '2026-04-01', dates_end: '2026-04-01',
              duration_days: 1, travelers_count: 2, travelers_type: 'couple',
              budget: '$3000', interests: ['food', 'culture'], travel_style: 'balanced', pace: 'moderate',
              constraints: [], notes: null,
            },
            conversation_phase: 'itinerary_complete',
            itinerary: {
              title: 'Tokyo Adventure',
              destination: 'Tokyo',
              start_date: '2026-04-01',
              end_date: '2026-04-01',
              description: 'A wonderful trip to Tokyo',
              days: [
                {
                  day_number: 1,
                  activities: [
                    { name: 'Arrive', time: '10:00', description: 'Land at Narita', location: 'Narita Airport' },
                  ],
                },
              ],
            },
          }
        }
      }]
    })

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
    mockParse.mockResolvedValueOnce({
      choices: [{
        message: {
          parsed: {
            reply: 'Your itinerary is ready!',
            trip_state: {
              destination: 'Tokyo', origin: 'NYC', dates_start: '2026-04-01', dates_end: '2026-04-10',
              duration_days: 9, travelers_count: 2, travelers_type: 'couple',
              budget: '$3000', interests: ['food', 'culture'], travel_style: 'balanced', pace: 'moderate',
              constraints: [], notes: null,
            },
            conversation_phase: 'itinerary_complete',
            itinerary: {
              title: 'Tokyo Adventure',
              destination: 'Tokyo',
              start_date: '2026-04-01',
              end_date: '2026-04-10',
              description: 'A wonderful trip to Tokyo',
              days: [
                {
                  day_number: 1,
                  activities: [
                    { name: 'Arrive', time: '10:00', description: 'Land at Narita', location: 'Narita Airport' },
                  ],
                },
              ],
            },
          }
        }
      }]
    })

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
    mockParse.mockResolvedValueOnce({
      choices: [{
        message: {
          parsed: {
            reply: 'Let me summarize your trip.',
            trip_state: {
              destination: 'Paris', origin: null, dates_start: null, dates_end: null,
              duration_days: null, travelers_count: null, travelers_type: null,
              budget: null, interests: [], travel_style: null, pace: null,
              constraints: [], notes: null,
            },
            conversation_phase: 'itinerary_complete',
            itinerary: null,
          }
        }
      }]
    })

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
    expect(mockParse).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown or foreign sessionId and creates nothing', async () => {
    db.sessionRow = null
    const { POST } = await import('@/app/api/chat/message/route')
    const res = await POST(postMessage({ content: 'Hi', sessionId: SESSION_ID }) as any)
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Chat not found')
    expect(mockParse).not.toHaveBeenCalled()
    expect(chainsFor('trip_sessions').some(c => has(c, 'insert') || has(c, 'update'))).toBe(false)
    expect(chainsFor('chat_history')).toHaveLength(0)
  })

  it('itinerary_complete links the session to the new itinerary; a later itinerary re-points it (D-27)', async () => {
    db.sessionRow = { id: SESSION_ID, trip_state: { destination: 'Tokyo' }, conversation_phase: 'ready_for_summary' }
    db.itineraryIds = ['itin-1', 'itin-2']
    mockParse
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
    mockParse.mockResolvedValueOnce(completeItineraryReply())
    const { POST } = await import('@/app/api/chat/message/route')
    const body = await (await POST(postMessage({ content: 'Generate it' }) as any)).json()
    expect(body.sessionId).toBe(NEW_SESSION_ID)
    const link = chainsFor('trip_sessions').find(c => has(c, 'update'))!
    expect((argsOf(link, 'update')![0] as Record<string, unknown>).itinerary_id).toBe('itin-9')
    expect(link.filter(([m]) => m === 'eq').map(([, a]) => a)).toContainEqual(['id', NEW_SESSION_ID])
  })

  it('new chat whose AI call fails creates no session row', async () => {
    mockParse.mockRejectedValueOnce(new Error('upstream down'))
    const { POST } = await import('@/app/api/chat/message/route')
    await expect(POST(postMessage({ content: 'Plan Rome' }) as any)).rejects.toThrow('upstream down')
    expect(chainsFor('trip_sessions').some(c => has(c, 'insert'))).toBe(false)
    expect(chainsFor('chat_history').some(c => has(c, 'insert'))).toBe(false)
  })
})
