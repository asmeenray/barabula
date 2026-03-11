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
    beta = {
      chat: {
        completions: {
          parse: mockParse,
        }
      }
    }
  }
  return { default: MockOpenAI }
})

function setupMockFrom() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'trip_sessions') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        delete: vi.fn().mockReturnThis(),
      }
    }
    if (table === 'chat_history') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }
    if (table === 'itineraries') {
      return {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'itin-1' }, error: null }),
      }
    }
    if (table === 'activities') {
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
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
    const req = new Request('http://localhost/api/chat/history')
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
    expect(body.itineraryId).toBe('itin-1')
    expect(body.conversationPhase).toBe('itinerary_complete')
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
