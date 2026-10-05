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

const SESSION_ID = '11111111-1111-4111-8111-111111111111'

type Call = [string, unknown[]]
let chains: Record<string, Call[][]> = {}
let result: { data: unknown; error: unknown } = { data: null, error: null }
// Optional per-chain answer (table, chain so far, index of this from(table) call); falls back to `result`
let resolver: ((table: string, chain: Call[], index: number) => { data: unknown; error: unknown }) | null = null

const eqArgs = (chain: Call[]) => chain.filter(([m]) => m === 'eq').map(([, a]) => a)

// Same pattern as chat.test.ts: each from(table) records its method chain and resolves to `result`
function builder(table: string) {
  const chain: Call[] = []
  const index = (chains[table] ??= []).push(chain) - 1
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'order', 'limit', 'insert', 'update', 'upsert', 'delete', 'single', 'maybeSingle']) {
    b[m] = vi.fn((...args: unknown[]) => { chain.push([m, args]); return b })
  }
  b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(resolver ? resolver(table, chain, index) : result).then(resolve, reject)
  return b
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  chains = {}
  result = { data: null, error: null }
  resolver = null
  mockFrom.mockImplementation((table: string) => builder(table))
})

describe('GET /api/chat/history', () => {
  it('returns 401 when not signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { GET } = await import('@/app/api/chat/history/route')
    const res = await GET(new Request(`http://localhost/api/chat/history?session=${SESSION_ID}`) as any)
    expect(res.status).toBe(401)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 400 without a session parameter and reads nothing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { GET } = await import('@/app/api/chat/history/route')
    const res = await GET(new Request('http://localhost/api/chat/history') as any)
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 400 for a non-UUID session and reads nothing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { GET } = await import('@/app/api/chat/history/route')
    const res = await GET(new Request('http://localhost/api/chat/history?session=not-a-uuid') as any)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid session id')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 200 with only that session\'s rows, filtered by session_id and user_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const rows = [
      { id: 'm1', session_id: SESSION_ID, role: 'user', content: 'Plan Lisbon' },
      { id: 'm2', session_id: SESSION_ID, role: 'assistant', content: 'Lisbon it is.' },
    ]
    result = { data: rows, error: null }
    const { GET } = await import('@/app/api/chat/history/route')
    const res = await GET(new Request(`http://localhost/api/chat/history?session=${SESSION_ID}`) as any)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(rows)

    const [chain] = chains.chat_history
    expect(eqArgs(chain)).toContainEqual(['session_id', SESSION_ID])
    expect(eqArgs(chain)).toContainEqual(['user_id', 'user-1'])
    expect(chain.find(([m]) => m === 'order')?.[1]).toEqual(['created_at', { ascending: true }])
  })

  it('returns 500 when the query fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    result = { data: null, error: { message: 'boom' } }
    const { GET } = await import('@/app/api/chat/history/route')
    const res = await GET(new Request(`http://localhost/api/chat/history?session=${SESSION_ID}`) as any)
    expect(res.status).toBe(500)
  })
})

describe('GET /api/chat/session', () => {
  it('returns 401 when not signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { GET } = await import('@/app/api/chat/session/route')
    const res = await GET(new Request(`http://localhost/api/chat/session?id=${SESSION_ID}`) as any)
    expect(res.status).toBe(401)
  })

  it('returns 400 without an id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { GET } = await import('@/app/api/chat/session/route')
    const res = await GET(new Request('http://localhost/api/chat/session') as any)
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 400 for a non-UUID id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const { GET } = await import('@/app/api/chat/session/route')
    const res = await GET(new Request('http://localhost/api/chat/session?id=123') as any)
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown (or another user\'s) id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    result = { data: null, error: null }
    const { GET } = await import('@/app/api/chat/session/route')
    const res = await GET(new Request(`http://localhost/api/chat/session?id=${SESSION_ID}`) as any)
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Chat not found')
  })

  it('returns 200 with id, trip_state, conversation_phase and itinerary_id, read by id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const row = {
      id: SESSION_ID,
      trip_state: { destination: 'Lisbon' },
      conversation_phase: 'itinerary_complete',
      itinerary_id: '33333333-3333-4333-8333-333333333333',
    }
    result = { data: row, error: null }
    const { GET } = await import('@/app/api/chat/session/route')
    const res = await GET(new Request(`http://localhost/api/chat/session?id=${SESSION_ID}`) as any)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(row)

    const [chain] = chains.trip_sessions
    expect(chain.find(([m]) => m === 'select')?.[1]).toEqual(['id, trip_state, conversation_phase, itinerary_id'])
    expect(eqArgs(chain)).toContainEqual(['id', SESSION_ID])
    expect(chain.some(([m]) => m === 'maybeSingle')).toBe(true)
  })

  it('has no DELETE handler (D-10)', async () => {
    const mod = await import('@/app/api/chat/session/route')
    expect('DELETE' in mod).toBe(false)
  })
})

describe('GET /api/chat/sessions (D-09)', () => {
  it('returns 401 when not signed in and reads nothing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { GET } = await import('@/app/api/chat/sessions/route')
    const res = await GET()
    expect(res.status).toBe(401)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns the caller\'s sessions with no itinerary, newest first', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const rows = [
      { id: SESSION_ID, trip_state: { destination: 'Lisbon' }, conversation_phase: 'gathering_details', updated_at: '2026-10-05T10:00:00Z' },
    ]
    result = { data: rows, error: null }
    const { GET } = await import('@/app/api/chat/sessions/route')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(rows)

    const [chain] = chains.trip_sessions
    expect(chain.find(([m]) => m === 'select')?.[1]).toEqual(['id, trip_state, conversation_phase, updated_at'])
    expect(eqArgs(chain)).toContainEqual(['user_id', 'user-1'])
    expect(chain.find(([m]) => m === 'is')?.[1]).toEqual(['itinerary_id', null])
    expect(chain.find(([m]) => m === 'order')?.[1]).toEqual(['updated_at', { ascending: false }])
    expect(chain.some(([m]) => ['insert', 'update', 'upsert', 'delete'].includes(m))).toBe(false)
  })

  it('returns an empty array when there are no rows', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    result = { data: null, error: null }
    const { GET } = await import('@/app/api/chat/sessions/route')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns 500 with the error message when the query fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    result = { data: null, error: { message: 'boom' } }
    const { GET } = await import('@/app/api/chat/sessions/route')
    const res = await GET()
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('boom')
  })
})

describe('GET /api/chat/session?itineraryId= (D-12, D-27)', () => {
  const ITINERARY_ID = '55555555-5555-4555-8555-555555555555'
  const COLS = 'id, trip_state, conversation_phase, itinerary_id'
  const linked = { id: SESSION_ID, trip_state: {}, conversation_phase: 'itinerary_complete', itinerary_id: ITINERARY_ID }
  const url = (q: string) => new Request(`http://localhost/api/chat/session?${q}`) as any
  const writes = (table: string) =>
    (chains[table] ?? []).filter(chain => chain.some(([m]) => ['insert', 'update', 'upsert', 'delete'].includes(m)))

  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('returns 400 for a non-UUID itineraryId and reads nothing', async () => {
    const { GET } = await import('@/app/api/chat/session/route')
    const res = await GET(url('itineraryId=itin-1'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid itinerary id')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 401 when not signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { GET } = await import('@/app/api/chat/session/route')
    const res = await GET(url(`itineraryId=${ITINERARY_ID}`))
    expect(res.status).toBe(401)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 404 for an itinerary the caller does not own, and never links it', async () => {
    resolver = () => ({ data: null, error: null })
    const { GET } = await import('@/app/api/chat/session/route')
    const res = await GET(url(`itineraryId=${ITINERARY_ID}`))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Itinerary not found')

    const [owner] = chains.itineraries
    expect(eqArgs(owner)).toContainEqual(['id', ITINERARY_ID])
    expect(eqArgs(owner)).toContainEqual(['user_id', 'user-1'])
    expect(chains.trip_sessions).toBeUndefined()
  })

  it('returns the session linked to the itinerary without creating one', async () => {
    resolver = table => table === 'itineraries'
      ? { data: { id: ITINERARY_ID }, error: null }
      : { data: linked, error: null }
    const { GET } = await import('@/app/api/chat/session/route')
    const res = await GET(url(`itineraryId=${ITINERARY_ID}`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(linked)

    expect(chains.trip_sessions).toHaveLength(1)
    const [read] = chains.trip_sessions
    expect(read.find(([m]) => m === 'select')?.[1]).toEqual([COLS])
    expect(eqArgs(read)).toContainEqual(['itinerary_id', ITINERARY_ID])
    expect(eqArgs(read)).toContainEqual(['user_id', 'user-1'])
    expect(writes('trip_sessions')).toHaveLength(0)
  })

  it('creates one linked session when none exists (manual itinerary)', async () => {
    resolver = (table, chain) => {
      if (table === 'itineraries') return { data: { id: ITINERARY_ID }, error: null }
      if (chain.some(([m]) => m === 'insert')) return { data: linked, error: null }
      return { data: null, error: null }
    }
    const { GET } = await import('@/app/api/chat/session/route')
    const res = await GET(url(`itineraryId=${ITINERARY_ID}`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(linked)

    const inserts = writes('trip_sessions')
    expect(inserts).toHaveLength(1)
    const [insert] = inserts
    expect(insert.find(([m]) => m === 'insert')?.[1]).toEqual([{ user_id: 'user-1', itinerary_id: ITINERARY_ID }])
    expect(insert.find(([m]) => m === 'select')?.[1]).toEqual([COLS])
    expect(insert.some(([m]) => m === 'single')).toBe(true)
  })

  it('re-reads the existing row when the insert loses a race on the unique link (23505)', async () => {
    resolver = (table, chain, index) => {
      if (table === 'itineraries') return { data: { id: ITINERARY_ID }, error: null }
      if (chain.some(([m]) => m === 'insert')) return { data: null, error: { code: '23505', message: 'duplicate key' } }
      return index === 0 ? { data: null, error: null } : { data: linked, error: null }
    }
    const { GET } = await import('@/app/api/chat/session/route')
    const res = await GET(url(`itineraryId=${ITINERARY_ID}`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(linked)
    expect(chains.trip_sessions).toHaveLength(3)  // read, insert, re-read
    expect(eqArgs(chains.trip_sessions[2])).toContainEqual(['itinerary_id', ITINERARY_ID])
  })

  it('returns 500 when the insert fails for another reason', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    resolver = (table, chain) => {
      if (table === 'itineraries') return { data: { id: ITINERARY_ID }, error: null }
      if (chain.some(([m]) => m === 'insert')) return { data: null, error: { code: '42501', message: 'rls' } }
      return { data: null, error: null }
    }
    const { GET } = await import('@/app/api/chat/session/route')
    const res = await GET(url(`itineraryId=${ITINERARY_ID}`))
    expect(res.status).toBe(500)
    errorSpy.mockRestore()
  })
})
