import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// POST /api/activities/[id]/geocode (16-11, D-23, D-24): the owner-only
// "Find on map" retry. One Nominatim lookup through the shared throttle,
// cached in extra_data, one cost_log row per lookup (T-16-32, T-16-34).

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSupabase = { auth: { getUser: mockGetUser }, from: mockFrom }
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

const mockCostInsert = vi.fn()
const mockServiceFrom = vi.fn(() => ({ insert: mockCostInsert }))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mockServiceFrom }),
}))

const ID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e'
const USER = { id: 'user-1' }

type Row = {
  id: string
  location: string | null
  extra_data: Record<string, unknown> | null
  itineraries: { user_id: string; destination: string | null }
}

let readEq: Array<[string, unknown]>
const updates: Array<{ id: string; extra_data: Record<string, unknown> }> = []

function mockDb(row: Row | null, updateError: unknown = null) {
  readEq = []
  mockFrom.mockImplementation((table: string) => {
    if (table !== 'activities') throw new Error(`unexpected table ${table}`)
    const read = {
      eq: vi.fn((col: string, val: unknown) => {
        readEq.push([col, val])
        return read
      }),
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
    }
    return {
      select: vi.fn(() => read),
      update: (payload: { extra_data: Record<string, unknown> }) => ({
        eq: vi.fn((_col: string, id: string) => {
          updates.push({ id, extra_data: payload.extra_data })
          return Promise.resolve({ error: updateError })
        }),
      }),
    }
  })
}

function row(over: Partial<Row> = {}): Row {
  return {
    id: ID,
    location: 'Rua Augusta',
    extra_data: { visited: true },
    itineraries: { user_id: USER.id, destination: 'Lisbon' },
    ...over,
  }
}

const fetchMock = vi.fn()

async function callPost(id = ID) {
  const { POST } = await import('@/app/api/activities/[id]/geocode/route')
  const req = new Request(`http://localhost/api/activities/${id}/geocode`, { method: 'POST' })
  const pending = POST(req, { params: Promise.resolve({ id }) })
  await vi.runAllTimersAsync()
  return pending
}

describe('POST /api/activities/[id]/geocode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.useFakeTimers()
    updates.length = 0
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('NOMINATIM_DISABLED', '')
    mockGetUser.mockResolvedValue({ data: { user: USER }, error: null })
    mockCostInsert.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('returns 401 without a user and makes no call', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockDb(row())
    const res = await callPost()
    expect(res.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockCostInsert).not.toHaveBeenCalled()
  })

  it('returns 400 for a non-uuid id', async () => {
    mockDb(row())
    const res = await callPost('nope')
    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the activity is not on one of the user’s trips, filtering by the owner', async () => {
    mockDb(null)
    const res = await callPost()
    expect(res.status).toBe(404)
    expect(readEq).toContainEqual(['id', ID])
    expect(readEq).toContainEqual(['itineraries.user_id', USER.id])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the joined itinerary belongs to someone else', async () => {
    mockDb(row({ itineraries: { user_id: 'someone-else', destination: 'Lisbon' } }))
    const res = await callPost()
    expect(res.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(updates).toHaveLength(0)
  })

  it('answers no_location without calling Nominatim', async () => {
    mockDb(row({ location: null }))
    const res = await callPost()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'no_location' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(updates).toHaveLength(0)
  })

  it('a hit (even after a not_found) stores OSM coordinates and keeps other keys', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([{ lat: '38.71', lon: '-9.13' }]), { status: 200 }))
    mockDb(row({ extra_data: { visited: true, geo_status: 'not_found', geocoded_at: 'x' } }))
    const res = await callPost()
    expect(await res.json()).toEqual({ status: 'hit', lat: 38.71, lng: -9.13 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = new URL(fetchMock.mock.calls[0][0] as string)
    expect(url.searchParams.get('q')).toBe('Rua Augusta, Lisbon')
    expect(updates).toEqual([
      {
        id: ID,
        extra_data: {
          visited: true,
          lat: 38.71,
          lng: -9.13,
          geo_source: 'osm_nominatim',
          geocoded_at: expect.any(String),
        },
      },
    ])
  })

  it('a miss stores geo_status not_found', async () => {
    fetchMock.mockResolvedValueOnce(new Response('[]', { status: 200 }))
    mockDb(row())
    const res = await callPost()
    expect(await res.json()).toEqual({ status: 'not_found' })
    expect(updates[0].extra_data).toEqual({ visited: true, geo_status: 'not_found', geocoded_at: expect.any(String) })
  })

  it('an error writes nothing', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }))
    mockDb(row())
    const res = await callPost()
    expect(await res.json()).toEqual({ status: 'error' })
    expect(updates).toHaveLength(0)
  })

  it('answers error when the write fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response('[]', { status: 200 }))
    mockDb(row(), { code: '42501' })
    const res = await callPost()
    expect(await res.json()).toEqual({ status: 'error' })
  })

  it('writes one cost_log row for the lookup', async () => {
    fetchMock.mockResolvedValueOnce(new Response('[]', { status: 200 }))
    mockDb(row())
    await callPost()
    expect(mockServiceFrom).toHaveBeenCalledWith('cost_log')
    expect(mockCostInsert).toHaveBeenCalledTimes(1)
    expect(mockCostInsert.mock.calls[0][0]).toMatchObject({
      user_id: USER.id,
      route: '/api/activities/[id]/geocode',
      external_calls: { nominatim: 1 },
    })
  })

  it('with NOMINATIM_DISABLED=1 answers error without calling Nominatim or counting', async () => {
    vi.stubEnv('NOMINATIM_DISABLED', '1')
    mockDb(row())
    const res = await callPost()
    expect(await res.json()).toEqual({ status: 'error' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(updates).toHaveLength(0)
    expect(mockCostInsert).not.toHaveBeenCalled()
  })
})
