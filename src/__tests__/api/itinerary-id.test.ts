import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase server client
const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

describe('GET /api/itineraries/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 401 when itinerary is private and no session', async () => {
    // First call: publicCheck returns is_public=false
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { is_public: false }, error: null }),
    })
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { GET } = await import('@/app/api/itineraries/[id]/route')
    const req = new Request('http://localhost/api/itineraries/itin-1')
    const res = await GET(req as any, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 200 for public itinerary without auth', async () => {
    const fakeItinerary = { id: 'itin-1', title: 'Paris Trip', is_public: true, activities: [] }
    // First call: publicCheck returns is_public=true
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { is_public: true }, error: null }),
      })
      // Second call: full itinerary fetch
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: fakeItinerary, error: null }),
      })

    const { GET } = await import('@/app/api/itineraries/[id]/route')
    const req = new Request('http://localhost/api/itineraries/itin-1')
    const res = await GET(req as any, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.is_public).toBe(true)
  })

  it('returns 200 for private itinerary when authenticated', async () => {
    const fakeItinerary = { id: 'itin-1', title: 'Private Trip', is_public: false, activities: [] }
    // First call: publicCheck returns is_public=false
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { is_public: false }, error: null }),
      })
      // Second call: full itinerary fetch
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: fakeItinerary, error: null }),
      })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const { GET } = await import('@/app/api/itineraries/[id]/route')
    const req = new Request('http://localhost/api/itineraries/itin-1')
    const res = await GET(req as any, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.title).toBe('Private Trip')
  })
})

// 16-17: PATCH and DELETE are hardened (T-16-47, T-16-48, T-16-50): uuid ids,
// JSON only, strict TripPatchSchema, RLS-scoped writes, 404 when nothing was
// touched and generic error text.

const TRIP = '11111111-1111-4111-8111-111111111111'

type Result = { data: unknown; error: unknown }

/** A chainable Supabase query stub: every builder call returns itself; awaiting it (or maybeSingle) gives `result`. */
function query(result: Result) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'update', 'delete', 'insert', 'order', 'limit']) q[m] = vi.fn(() => q)
  q.maybeSingle = vi.fn(() => Promise.resolve(result))
  q.single = vi.fn(() => Promise.resolve(result))
  q.then = (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return q as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<Result>
}

function jsonRequest(body: unknown, method = 'PATCH', contentType = 'application/json') {
  return new Request(`http://localhost/api/itineraries/${TRIP}`, {
    method,
    headers: { 'content-type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const ctx = (id = TRIP) => ({ params: Promise.resolve({ id }) })
const signedIn = () => mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

const PASS = {
  stops: ['Lisbon'],
  when: { kind: 'dates', start: '2026-05-12', end: '2026-05-14' },
  adults: 2,
  kids: 0,
  interests: ['Food'],
  note: null,
}

describe('PATCH /api/itineraries/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const { PATCH } = await import('@/app/api/itineraries/[id]/route')
    const res = await PATCH(jsonRequest({ title: 'Porto' }) as any, ctx())
    expect(res.status).toBe(401)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 400 for a non-uuid id', async () => {
    signedIn()
    const { PATCH } = await import('@/app/api/itineraries/[id]/route')
    const res = await PATCH(jsonRequest({ title: 'Porto' }) as any, ctx('itin-1'))
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 415 for a non-JSON body', async () => {
    signedIn()
    const { PATCH } = await import('@/app/api/itineraries/[id]/route')
    const res = await PATCH(jsonRequest('title=Porto', 'PATCH', 'application/x-www-form-urlencoded') as any, ctx())
    expect(res.status).toBe(415)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it.each([
    ['a range over 30 days', { start_date: '2026-05-12', end_date: '2026-06-20' }],
    ['an end before the start', { start_date: '2026-05-12', end_date: '2026-05-10' }],
    ['only one date', { start_date: '2026-05-12' }],
    ['an invalid date', { start_date: '2026-02-31', end_date: '2026-03-02' }],
    ['an unknown extra_data key', { extra_data: { is_admin: true } }],
    ['an unknown column', { user_id: 'someone-else' }],
    ['is_public (not writable here)', { is_public: true }],
    ['an empty title', { title: '   ' }],
    ['a title over 200 characters', { title: 'x'.repeat(201) }],
    ['day_count over 30', { extra_data: { day_count: 31 } }],
    ['a pass with client_ref', { extra_data: { pass: { client_ref: '22222222-2222-4222-8222-222222222222' } } }],
    ['an empty body', {}],
  ])('returns 400 for %s', async (_name, body) => {
    signedIn()
    const { PATCH } = await import('@/app/api/itineraries/[id]/route')
    const res = await PATCH(jsonRequest(body) as any, ctx())
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('updates the trip columns and returns the row', async () => {
    signedIn()
    const row = { id: TRIP, title: 'Porto', destination: 'Porto', start_date: '2026-05-12', end_date: '2026-05-13' }
    const update = query({ data: row, error: null })
    mockFrom.mockReturnValueOnce(update)
    const { PATCH } = await import('@/app/api/itineraries/[id]/route')
    const res = await PATCH(
      jsonRequest({ title: 'Porto', destination: 'Porto', start_date: '2026-05-12', end_date: '2026-05-13' }) as any,
      ctx()
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(row)
    expect(update.update).toHaveBeenCalledWith({
      title: 'Porto',
      destination: 'Porto',
      start_date: '2026-05-12',
      end_date: '2026-05-13',
    })
    expect(update.eq).toHaveBeenCalledWith('id', TRIP)
  })

  it('clears both dates with null', async () => {
    signedIn()
    const update = query({ data: { id: TRIP }, error: null })
    mockFrom.mockReturnValueOnce(update)
    const { PATCH } = await import('@/app/api/itineraries/[id]/route')
    const res = await PATCH(jsonRequest({ start_date: null, end_date: null }) as any, ctx())
    expect(res.status).toBe(200)
    expect(update.update).toHaveBeenCalledWith({ start_date: null, end_date: null })
  })

  it('merges pass and day_count into the stored extra_data, keeping sibling keys and client_ref', async () => {
    signedIn()
    const stored = {
      flights: [{ code: 'TP123' }],
      day_count: 3,
      pass: { v: 1, ...PASS, client_ref: '22222222-2222-4222-8222-222222222222' },
    }
    const read = query({ data: { extra_data: stored }, error: null })
    const update = query({ data: { id: TRIP }, error: null })
    mockFrom.mockReturnValueOnce(read).mockReturnValueOnce(update)
    const { PATCH } = await import('@/app/api/itineraries/[id]/route')
    const res = await PATCH(
      jsonRequest({ extra_data: { pass: { adults: 3, kids: 1 }, day_count: 4 } }) as any,
      ctx()
    )
    expect(res.status).toBe(200)
    expect(read.eq).toHaveBeenCalledWith('id', TRIP)
    expect(update.update).toHaveBeenCalledWith({
      extra_data: {
        flights: [{ code: 'TP123' }],
        day_count: 4,
        pass: { v: 1, ...PASS, adults: 3, kids: 1, client_ref: '22222222-2222-4222-8222-222222222222' },
      },
    })
  })

  it('starts a pass for a trip that has none', async () => {
    signedIn()
    const read = query({ data: { extra_data: null }, error: null })
    const update = query({ data: { id: TRIP }, error: null })
    mockFrom.mockReturnValueOnce(read).mockReturnValueOnce(update)
    const { PATCH } = await import('@/app/api/itineraries/[id]/route')
    const res = await PATCH(jsonRequest({ extra_data: { pass: { adults: 3, kids: 0 } } }) as any, ctx())
    expect(res.status).toBe(200)
    expect(update.update).toHaveBeenCalledWith({ extra_data: { pass: { v: 1, adults: 3, kids: 0 } } })
  })

  it('returns 404 when the trip is not readable (RLS or missing)', async () => {
    signedIn()
    mockFrom.mockReturnValueOnce(query({ data: null, error: null }))
    const { PATCH } = await import('@/app/api/itineraries/[id]/route')
    const res = await PATCH(jsonRequest({ extra_data: { day_count: 2 } }) as any, ctx())
    expect(res.status).toBe(404)
  })

  it('returns 404 when no row was updated', async () => {
    signedIn()
    mockFrom.mockReturnValueOnce(query({ data: null, error: null }))
    const { PATCH } = await import('@/app/api/itineraries/[id]/route')
    const res = await PATCH(jsonRequest({ title: 'Porto' }) as any, ctx())
    expect(res.status).toBe(404)
  })

  it('returns a generic 500 on a database error', async () => {
    signedIn()
    mockFrom.mockReturnValueOnce(query({ data: null, error: { message: 'relation "itineraries" secret detail' } }))
    const { PATCH } = await import('@/app/api/itineraries/[id]/route')
    const res = await PATCH(jsonRequest({ title: 'Porto' }) as any, ctx())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: "Couldn't save" })
  })
})

describe('DELETE /api/itineraries/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  const del = () => new Request(`http://localhost/api/itineraries/${TRIP}`, { method: 'DELETE' })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const { DELETE } = await import('@/app/api/itineraries/[id]/route')
    const res = await DELETE(del() as any, ctx())
    expect(res.status).toBe(401)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 400 for a non-uuid id', async () => {
    signedIn()
    const { DELETE } = await import('@/app/api/itineraries/[id]/route')
    const res = await DELETE(del() as any, ctx('itin-1'))
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('deletes through the RLS client and returns success', async () => {
    signedIn()
    const q = query({ data: [{ id: TRIP }], error: null })
    mockFrom.mockReturnValueOnce(q)
    const { DELETE } = await import('@/app/api/itineraries/[id]/route')
    const res = await DELETE(del() as any, ctx())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(mockFrom).toHaveBeenCalledWith('itineraries')
    expect(q.delete).toHaveBeenCalled()
    expect(q.eq).toHaveBeenCalledWith('id', TRIP)
    expect(q.select).toHaveBeenCalledWith('id')
  })

  it('returns 404 when nothing was deleted (RLS or missing)', async () => {
    signedIn()
    mockFrom.mockReturnValueOnce(query({ data: [], error: null }))
    const { DELETE } = await import('@/app/api/itineraries/[id]/route')
    const res = await DELETE(del() as any, ctx())
    expect(res.status).toBe(404)
  })

  it('returns a generic 500 on a database error', async () => {
    signedIn()
    mockFrom.mockReturnValueOnce(query({ data: null, error: { message: 'secret detail' } }))
    const { DELETE } = await import('@/app/api/itineraries/[id]/route')
    const res = await DELETE(del() as any, ctx())
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Couldn't delete" })
  })
})
