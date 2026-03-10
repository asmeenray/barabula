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

const mockOpenAICreate = vi.fn().mockResolvedValue({
  choices: [{ message: { content: 'Hello, how can I help?' } }],
})

vi.mock('openai', () => {
  class MockOpenAI {
    chat = { completions: { create: mockOpenAICreate } }
  }
  return { default: MockOpenAI }
})

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
})
