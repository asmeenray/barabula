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

const eqArgs = (chain: Call[]) => chain.filter(([m]) => m === 'eq').map(([, a]) => a)

// Same pattern as chat.test.ts: each from(table) records its method chain and resolves to `result`
function builder(table: string) {
  const chain: Call[] = []
  ;(chains[table] ??= []).push(chain)
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'upsert', 'delete', 'single', 'maybeSingle']) {
    b[m] = vi.fn((...args: unknown[]) => { chain.push([m, args]); return b })
  }
  b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return b
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  chains = {}
  result = { data: null, error: null }
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
