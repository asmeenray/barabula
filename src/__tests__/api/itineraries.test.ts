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

describe('GET /api/itineraries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('not authenticated') })

    const { GET } = await import('@/app/api/itineraries/route')
    const req = new Request('http://localhost/api/itineraries')
    const res = await GET(req as any)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 200 + array when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const fakeData = [{ id: 'itin-1', title: 'Paris Trip' }]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: fakeData, error: null }),
    })

    const { GET } = await import('@/app/api/itineraries/route')
    const req = new Request('http://localhost/api/itineraries')
    const res = await GET(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(fakeData)
  })
})

describe('POST /api/itineraries (blank pass)', () => {
  const REF = '3b241101-e2bb-4255-8caf-4136c566a962'
  const pass = {
    stops: ['Lisbon', 'Prague'],
    when: { kind: 'length', days: 3 },
    adults: 2,
    kids: 0,
    interests: ['Food'],
    note: null,
    client_ref: REF,
  }

  // Chain for the client_ref lookup: select → eq → eq → limit → maybeSingle.
  function lookupChain(found: { id: string } | null, error: unknown = null) {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      maybeSingle: vi.fn().mockResolvedValue({ data: found, error }),
    }
    return chain
  }
  // Chain for the insert: insert → select → single.
  function insertChain(row: { id: string } | null, error: unknown = null) {
    const chain = {
      insert: vi.fn(),
      select: vi.fn(() => chain),
      single: vi.fn().mockResolvedValue({ data: row, error }),
    }
    chain.insert.mockReturnValue(chain)
    return chain
  }

  function post(body: unknown, contentType = 'application/json') {
    return new Request('http://localhost/api/itineraries', {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  }

  async function call(req: Request) {
    const { POST } = await import('@/app/api/itineraries/route')
    return POST(req as any)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  })

  it('401 without a user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('not authenticated') })
    const res = await call(post(pass))
    expect(res.status).toBe(401)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('415 for a non-JSON body (CSRF guard)', async () => {
    const res = await call(post('stops=Lisbon', 'application/x-www-form-urlencoded'))
    expect(res.status).toBe(415)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('400 for malformed JSON', async () => {
    const res = await call(post('{not json'))
    expect(res.status).toBe(400)
  })

  it.each([
    ['the old title body', { title: 'My Trip' }],
    ['no stops', { ...pass, stops: [] }],
    ['a 31-day length', { ...pass, when: { kind: 'length', days: 31 } }],
    ['a user_id in the body', { ...pass, user_id: 'someone-else' }],
  ])('400 for %s', async (_name, body) => {
    const res = await call(post(body))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid request' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('201 { id } and inserts the pass for a length trip', async () => {
    const lookup = lookupChain(null)
    const insert = insertChain({ id: 'itin-new' })
    mockFrom.mockReturnValueOnce(lookup).mockReturnValueOnce(insert)

    const res = await call(post(pass))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: 'itin-new' })

    expect(lookup.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(lookup.eq).toHaveBeenCalledWith('extra_data->pass->>client_ref', REF)
    expect(insert.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      title: 'Lisbon → Prague',
      destination: 'Lisbon',
      start_date: null,
      end_date: null,
      extra_data: {
        pass: {
          v: 1,
          stops: ['Lisbon', 'Prague'],
          when: { kind: 'length', days: 3 },
          adults: 2,
          kids: 0,
          interests: ['Food'],
          note: null,
          client_ref: REF,
        },
        day_count: 3,
      },
    })
  })

  it('sets start_date and end_date only for dates', async () => {
    const insert = insertChain({ id: 'itin-dated' })
    mockFrom.mockReturnValueOnce(lookupChain(null)).mockReturnValueOnce(insert)
    const res = await call(post({ ...pass, stops: ['Lisbon'], when: { kind: 'dates', start: '2026-05-12', end: '2026-05-15' } }))
    expect(res.status).toBe(201)
    const row = insert.insert.mock.calls[0][0]
    expect(row).toMatchObject({ title: 'Lisbon', destination: 'Lisbon', start_date: '2026-05-12', end_date: '2026-05-15' })
    expect(row.extra_data.day_count).toBe(4)
  })

  it.each([
    ['unsure', { kind: 'unsure' }],
    ['skipped', null],
  ])('day_count 1 when when is %s', async (_name, when) => {
    const insert = insertChain({ id: 'itin-open' })
    mockFrom.mockReturnValueOnce(lookupChain(null)).mockReturnValueOnce(insert)
    await call(post({ ...pass, when }))
    const row = insert.insert.mock.calls[0][0]
    expect(row).toMatchObject({ start_date: null, end_date: null })
    expect(row.extra_data.day_count).toBe(1)
  })

  it('a second POST with the same client_ref returns 200 with the first id and inserts nothing', async () => {
    mockFrom.mockReturnValueOnce(lookupChain({ id: 'itin-first' }))
    const res = await call(post(pass))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 'itin-first' })
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('500 with a generic message when the insert fails', async () => {
    mockFrom
      .mockReturnValueOnce(lookupChain(null))
      .mockReturnValueOnce(insertChain(null, { message: 'violates row-level security policy' }))
    const res = await call(post(pass))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Couldn't create the trip" })
  })

  it('500 with a generic message when the lookup fails', async () => {
    mockFrom.mockReturnValueOnce(lookupChain(null, { message: 'db down' }))
    const res = await call(post(pass))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Couldn't create the trip" })
  })
})
