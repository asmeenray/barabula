import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Supabase server client (same pattern as the other route tests)
const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// Service-role client: captures the cost_log row written by the real tracker
const mockCostInsert = vi.fn()
const mockServiceFrom = vi.fn(() => ({ insert: mockCostInsert }))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mockServiceFrom }),
}))

const ITIN_ID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e'
const USER = { id: 'user-1' }

type Act = {
  id: string
  name: string
  day_number: number
  location: string | null
  activity_type: string | null
  extra_data: Record<string, unknown> | null
}

function act(n: number, extra: Record<string, unknown> | null = null, location: string | null = `Place ${n}`): Act {
  return { id: `act-${n}`, name: `Activity ${n}`, day_number: 1, location, activity_type: null, extra_data: extra }
}

const updates: Array<{ id: string; payload: Record<string, unknown> }> = []
let itinerarySelect: { eq: ReturnType<typeof vi.fn> } & Record<string, ReturnType<typeof vi.fn>>

function mockDb(itinerary: { id: string; destination: string | null; activities: Act[] } | null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'itineraries') {
      itinerarySelect = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: itinerary, error: null }),
      } as typeof itinerarySelect
      return itinerarySelect
    }
    if (table === 'activities') {
      return {
        update: (payload: Record<string, unknown>) => ({
          eq: (_col: string, id: string) => ({
            eq: vi.fn().mockImplementation(() => {
              updates.push({ id, payload })
              return Promise.resolve({ error: null })
            }),
          }),
        }),
      }
    }
    throw new Error(`unexpected table ${table}`)
  })
}

function nominatimHit(lat = '35.7148', lon = '139.7967') {
  return new Response(JSON.stringify([{ lat, lon }]), { status: 200 })
}

function nominatimEmpty() {
  return new Response('[]', { status: 200 })
}

const fetchMock = vi.fn()

async function callPost(id = ITIN_ID) {
  const { POST } = await import('@/app/api/itineraries/[id]/geocode/route')
  const req = new Request(`http://localhost/api/itineraries/${id}/geocode`, { method: 'POST' })
  // Advance fake time so throttle waits resolve while the route runs.
  const pending = POST(req, { params: Promise.resolve({ id }) })
  await vi.runAllTimersAsync()
  const res = await pending
  return res
}

describe('POST /api/itineraries/[id]/geocode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.useFakeTimers()
    updates.length = 0
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    mockGetUser.mockResolvedValue({ data: { user: USER }, error: null })
    mockCostInsert.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('returns 401 without a signed-in user and makes no Nominatim call', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockDb({ id: ITIN_ID, destination: 'Tokyo', activities: [act(1)] })
    const res = await callPost()
    expect(res.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 400 for a non-UUID id', async () => {
    mockDb({ id: ITIN_ID, destination: 'Tokyo', activities: [act(1)] })
    const res = await callPost('not-a-uuid')
    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the itinerary is not the caller\'s, scoping the query by user_id', async () => {
    mockDb(null)
    const res = await callPost()
    expect(res.status).toBe(404)
    expect(itinerarySelect.eq).toHaveBeenCalledWith('id', ITIN_ID)
    expect(itinerarySelect.eq).toHaveBeenCalledWith('user_id', USER.id)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns cached OSM coordinates as pins without calling Nominatim', async () => {
    mockDb({
      id: ITIN_ID,
      destination: 'Tokyo',
      activities: [act(1, { lat: 35.7, lng: 139.8, geo_source: 'osm_nominatim' })],
    })
    const res = await callPost()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      pins: [{ id: 'act-1', name: 'Activity 1', day: 1, lat: 35.7, lng: 139.8, type: 'activity' }],
      remaining: 0,
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(updates).toHaveLength(0)
  })

  it('geocodes an uncached activity with jsonv2, limit=1 and the Barabula User-Agent, keeping existing extra_data', async () => {
    fetchMock.mockResolvedValueOnce(nominatimHit())
    mockDb({ id: ITIN_ID, destination: 'Tokyo, Japan', activities: [act(1, { note: 'keep me' }, 'Asakusa')] })
    const res = await callPost()
    const body = await res.json()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://nominatim.openstreetmap.org/search')
    expect(parsed.searchParams.get('q')).toBe('Asakusa, Tokyo, Japan')
    expect(parsed.searchParams.get('format')).toBe('jsonv2')
    expect(parsed.searchParams.get('limit')).toBe('1')
    const ua = (init.headers as Record<string, string>)['User-Agent']
    expect(ua).toMatch(/^Barabula\/\d+\.\d+\.\d+ \(\+https:\/\/github\.com\/asmeenray\/barabula\)$/)

    expect(updates).toHaveLength(1)
    expect(updates[0].id).toBe('act-1')
    expect(updates[0].payload.extra_data).toEqual({
      note: 'keep me',
      lat: 35.7148,
      lng: 139.7967,
      geo_source: 'osm_nominatim',
      geocoded_at: expect.any(String),
    })
    expect(body.pins).toEqual([
      { id: 'act-1', name: 'Activity 1', day: 1, lat: 35.7148, lng: 139.7967, type: 'activity' },
    ])
    expect(body.remaining).toBe(0)
  })

  it('treats coordinates without the OSM source tag as uncached and replaces them', async () => {
    fetchMock.mockResolvedValueOnce(nominatimHit('1.5', '2.5'))
    mockDb({ id: ITIN_ID, destination: null, activities: [act(1, { lat: 9, lng: 9 })] })
    const res = await callPost()
    const body = await res.json()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(updates[0].payload.extra_data).toMatchObject({ lat: 1.5, lng: 2.5, geo_source: 'osm_nominatim' })
    expect(body.pins[0]).toMatchObject({ lat: 1.5, lng: 2.5 })
  })

  it('stores geo_status not_found for an empty result and skips it on a later call', async () => {
    fetchMock.mockResolvedValueOnce(nominatimEmpty())
    mockDb({ id: ITIN_ID, destination: 'Tokyo', activities: [act(1)] })
    const res = await callPost()
    const body = await res.json()
    expect(updates[0].payload.extra_data).toEqual({ geo_status: 'not_found', geocoded_at: expect.any(String) })
    expect(body).toEqual({ pins: [], remaining: 0 })

    // Later call: the stored not_found means no repeat query.
    fetchMock.mockClear()
    mockDb({ id: ITIN_ID, destination: 'Tokyo', activities: [act(1, updates[0].payload.extra_data as Record<string, unknown>)] })
    const res2 = await callPost()
    expect(await res2.json()).toEqual({ pins: [], remaining: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([429, 403, 500])('writes nothing and stops the batch on HTTP %i', async status => {
    fetchMock.mockResolvedValueOnce(new Response('', { status }))
    mockDb({ id: ITIN_ID, destination: 'Tokyo', activities: [act(1), act(2)] })
    const res = await callPost()
    const body = await res.json()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(updates).toHaveLength(0)
    expect(body).toEqual({ pins: [], remaining: 2 })
  })

  it('writes nothing and stops the batch on a network error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))
    mockDb({ id: ITIN_ID, destination: 'Tokyo', activities: [act(1), act(2)] })
    const res = await callPost()
    const body = await res.json()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(updates).toHaveLength(0)
    expect(body.remaining).toBe(2)
  })

  it('starts consecutive Nominatim fetches at least 1100 ms apart', async () => {
    const startTimes: number[] = []
    fetchMock.mockImplementation(() => {
      startTimes.push(Date.now())
      return Promise.resolve(nominatimHit())
    })
    mockDb({ id: ITIN_ID, destination: 'Tokyo', activities: [act(1), act(2), act(3)] })
    await callPost()
    expect(startTimes).toHaveLength(3)
    expect(startTimes[1] - startTimes[0]).toBeGreaterThanOrEqual(1100)
    expect(startTimes[2] - startTimes[1]).toBeGreaterThanOrEqual(1100)
  })

  it('geocodes at most 20 per call and reports the rest as remaining', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(nominatimHit()))
    const activities = Array.from({ length: 25 }, (_, i) => act(i + 1))
    mockDb({ id: ITIN_ID, destination: 'Tokyo', activities })
    const res = await callPost()
    const body = await res.json()
    expect(fetchMock).toHaveBeenCalledTimes(20)
    expect(updates).toHaveLength(20)
    expect(body.pins).toHaveLength(20)
    expect(body.remaining).toBe(5)
  })

  it('skips activities without a location', async () => {
    mockDb({ id: ITIN_ID, destination: 'Tokyo', activities: [act(1, null, null)] })
    const res = await callPost()
    expect(await res.json()).toEqual({ pins: [], remaining: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
  describe('cost logging', () => {
    it('writes one cost_log row counting each Nominatim attempt, with model null', async () => {
      fetchMock
        .mockResolvedValueOnce(nominatimHit())
        .mockResolvedValueOnce(nominatimEmpty())
        .mockResolvedValueOnce(nominatimHit())
      mockDb({ id: ITIN_ID, destination: 'Tokyo', activities: [act(1), act(2), act(3)] })
      const res = await callPost()
      expect(res.status).toBe(200)
      expect(mockServiceFrom).toHaveBeenCalledWith('cost_log')
      expect(mockCostInsert).toHaveBeenCalledTimes(1)
      expect(mockCostInsert.mock.calls[0][0]).toMatchObject({
        user_id: USER.id,
        route: '/api/itineraries/[id]/geocode',
        model: null,
        input_tokens: null,
        output_tokens: null,
        external_calls: { nominatim: 3 },
        est_cost_usd: null,
        latency_ms: expect.any(Number),
      })
    })

    it('counts a failed Nominatim attempt too', async () => {
      fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }))
      mockDb({ id: ITIN_ID, destination: 'Tokyo', activities: [act(1), act(2)] })
      await callPost()
      expect(mockCostInsert).toHaveBeenCalledTimes(1)
      expect(mockCostInsert.mock.calls[0][0].external_calls).toEqual({ nominatim: 1 })
    })

    it('writes no row when every activity is already cached', async () => {
      mockDb({
        id: ITIN_ID,
        destination: 'Tokyo',
        activities: [act(1, { lat: 35.7, lng: 139.8, geo_source: 'osm_nominatim' })],
      })
      await callPost()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(mockCostInsert).not.toHaveBeenCalled()
    })

    it('writes no row for an unauthenticated call', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
      mockDb({ id: ITIN_ID, destination: 'Tokyo', activities: [act(1)] })
      await callPost()
      expect(mockCostInsert).not.toHaveBeenCalled()
    })

    it('keeps the response unchanged when the cost_log insert fails', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockCostInsert.mockResolvedValue({ error: { message: 'relation "cost_log" does not exist' } })
      fetchMock.mockResolvedValueOnce(nominatimHit('1.5', '2.5'))
      mockDb({ id: ITIN_ID, destination: null, activities: [act(1)] })
      const res = await callPost()
      expect(res.status).toBe(200)
      expect((await res.json()).pins[0]).toMatchObject({ lat: 1.5, lng: 2.5 })
      expect(errorSpy).toHaveBeenCalledWith('[cost_log]', '/api/itineraries/[id]/geocode', 'relation "cost_log" does not exist')
      errorSpy.mockRestore()
    })
  })
})
