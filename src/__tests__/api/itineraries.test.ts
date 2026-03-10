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

describe('POST /api/itineraries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('not authenticated') })

    const { POST } = await import('@/app/api/itineraries/route')
    const req = new Request('http://localhost/api/itineraries', {
      method: 'POST',
      body: JSON.stringify({ title: 'My Trip' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('returns 201 + new itinerary when valid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const newItinerary = { id: 'itin-new', title: 'My Trip', user_id: 'user-1' }
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newItinerary, error: null }),
    })

    const { POST } = await import('@/app/api/itineraries/route')
    const req = new Request('http://localhost/api/itineraries', {
      method: 'POST',
      body: JSON.stringify({ title: 'My Trip' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.title).toBe('My Trip')
  })

  it('returns 400 when title is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const { POST } = await import('@/app/api/itineraries/route')
    const req = new Request('http://localhost/api/itineraries', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })
})
