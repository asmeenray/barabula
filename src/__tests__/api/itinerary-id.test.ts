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

describe('PATCH /api/itineraries/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { PATCH } = await import('@/app/api/itineraries/[id]/route')
    const req = new Request('http://localhost/api/itineraries/itin-1', {
      method: 'PATCH',
      body: JSON.stringify({ is_public: true }),
    })
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(401)
  })

  it('accepts is_public boolean and stores it', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const updatedItinerary = { id: 'itin-1', title: 'Paris Trip', is_public: true }
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedItinerary, error: null }),
    })

    const { PATCH } = await import('@/app/api/itineraries/[id]/route')
    const req = new Request('http://localhost/api/itineraries/itin-1', {
      method: 'PATCH',
      body: JSON.stringify({ is_public: true }),
    })
    const res = await PATCH(req as any, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.is_public).toBe(true)
  })
})
