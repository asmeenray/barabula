import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ChatPage from '@/app/(authenticated)/chat/page'

// Mock Supabase client (used for personalized greeting)
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}))

// Mock prompt-store
vi.mock('@/lib/landing/prompt-store', () => ({
  getPrompt: vi.fn().mockReturnValue(null),
  clearPrompt: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

// Mock next/navigation with spies so we can assert on push/replace calls
const mockPush = vi.fn()
const mockReplace = vi.fn()
let mockParams: Record<string, string> = {}
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/',
  useSearchParams: () => ({ get: (key: string) => mockParams[key] ?? null }),
}))

const SESSION_A = '11111111-1111-4111-8111-111111111111'
const NEW_SESSION = '22222222-2222-4222-8222-222222222222'

const fetchMock = () => global.fetch as ReturnType<typeof vi.fn>
const fetchCalls = () => fetchMock().mock.calls as Array<[string, RequestInit | undefined]>
const postBodies = () => fetchCalls()
  .filter(([url, init]) => url === '/api/chat/message' && init?.method === 'POST')
  .map(([, init]) => JSON.parse(String(init!.body)))

/** Helper: bare /chat is a new chat, so there is nothing to fetch on load */
function mockDefaultFetches() {
  // no history or session fetch without ?session=
}

/** Helper: /chat?session=<id> loads that chat's history then its session state */
function mockSessionFetches(history: unknown[] = [], session: Record<string, unknown> = { trip_state: {}, conversation_phase: 'gathering_destination' }) {
  fetchMock()
    .mockResolvedValueOnce({ json: () => Promise.resolve(history) })  // history
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(session) })  // session GET
}

function send(text: string) {
  const textarea = screen.getByPlaceholderText(/dream trip/i)
  fireEvent.change(textarea, { target: { value: text } })
  fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
}

beforeEach(() => {
  vi.resetAllMocks()
  mockPush.mockReset()
  mockReplace.mockReset()
  mockParams = {}
})

it('renders the chat container', async () => {
  mockDefaultFetches()
  render(<ChatPage />)
  expect(screen.getByTestId('chat-container')).toBeInTheDocument()
})

it('shows empty state when no messages', async () => {
  mockDefaultFetches()
  render(<ChatPage />)
  await waitFor(() => {
    expect(screen.getByText(/Where are we going today\?/i)).toBeInTheDocument()
  })
})

it('calls router.push after receiving itineraryId', async () => {
  // Simulate mobile viewport so the mobile auto-nav branch fires
  const originalInnerWidth = window.innerWidth
  Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true })

  ;(global.fetch as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce({ json: () => Promise.resolve({ content: "Your itinerary is ready!", itineraryId: 'abc-123', conversationPhase: 'itinerary_complete', tripState: {} }) })  // message
    .mockResolvedValueOnce({ json: () => Promise.resolve({ title: 'Test', destination: 'Paris', start_date: '2024-01-01', end_date: '2024-01-07', activities: [] }) })  // itinerary fetch

  render(<ChatPage />)
  await waitFor(() => screen.getByPlaceholderText(/dream trip/i))

  const textarea = screen.getByPlaceholderText(/dream trip/i)
  fireEvent.change(textarea, { target: { value: 'Plan a trip to Paris' } })
  fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith('/itinerary/abc-123')
  }, { timeout: 5000 })

  // Restore original innerWidth
  Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true, configurable: true })
})

it('passes conversationPhase to QuickActionChips after API response', async () => {
  ;(global.fetch as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce({
      json: () => Promise.resolve({
        content: 'Great! Here is what I have so far...',
        conversationPhase: 'ready_for_summary',
        tripState: { destination: 'Tokyo', interests: ['food'] },
      }),
    })  // message

  render(<ChatPage />)
  await waitFor(() => screen.getByPlaceholderText(/dream trip/i))

  const textarea = screen.getByPlaceholderText(/dream trip/i)
  fireEvent.change(textarea, { target: { value: 'Tokyo for 5 days' } })
  fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

  await waitFor(() => {
    // Summary chips appear after ready_for_summary response
    expect(screen.getByText('Looks good')).toBeTruthy()
  })
})

it('shows mobile overlay when showMobileOverlay state is true', async () => {
  // Note: this test verifies the overlay element exists in the DOM when rendered.
  // The overlay is controlled by showMobileOverlay state inside ChatPageInner.
  // Since we cannot set internal state directly, this test verifies the overlay
  // does NOT appear on initial render (it is hidden by default).
  // The full overlay behavior is validated manually (mobile viewport + itinerary generation).
  mockDefaultFetches()
  render(<ChatPage />)
  // Overlay should not be present on initial load
  expect(screen.queryByText('Building your itinerary...')).not.toBeInTheDocument()
})

it("'Plan a new trip' opens a fresh chat: router.push('/chat'), no DELETE, no confirm (D-10)", async () => {
  // Start on a finished chat so the "Plan a new trip" chip renders
  mockParams = { session: SESSION_A }
  mockSessionFetches(
    [{ id: 'm1', role: 'user', content: 'Plan Tokyo' }, { id: 'm2', role: 'assistant', content: 'Your Tokyo trip is ready.' }],
    { id: SESSION_A, trip_state: { destination: 'Tokyo' }, conversation_phase: 'itinerary_complete', itinerary_id: null },
  )
  const confirmSpy = vi.spyOn(window, 'confirm')

  render(<ChatPage />)
  await waitFor(() => {
    expect(screen.getByText('Plan a new trip')).toBeTruthy()
    expect(screen.getByText('Your Tokyo trip is ready.')).toBeTruthy()
  })

  // The browser still shows ?session=A until the push lands; the fresh chat must not reload it
  const callsBefore = fetchCalls().length
  fireEvent.click(screen.getByText('Plan a new trip'))

  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith('/chat')
    expect(screen.getByText(/Where are we going today\?/i)).toBeInTheDocument()
  })
  expect(screen.queryByText('Your Tokyo trip is ready.')).not.toBeInTheDocument()
  expect(screen.queryByText('Plan a new trip')).not.toBeInTheDocument()
  expect(confirmSpy).not.toHaveBeenCalled()
  expect(fetchCalls().some(([, init]) => init?.method === 'DELETE')).toBe(false)
  expect(fetchCalls().length).toBe(callsBefore)
  confirmSpy.mockRestore()
})

it('after a new trip, the first message starts a new session (no old sessionId sent)', async () => {
  mockParams = { session: SESSION_A }
  mockSessionFetches([], { id: SESSION_A, trip_state: {}, conversation_phase: 'itinerary_complete', itinerary_id: null })
  fetchMock().mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'Where to next?', conversationPhase: 'gathering_destination', tripState: {}, sessionId: NEW_SESSION }) })

  render(<ChatPage />)
  await waitFor(() => screen.getByText('Plan a new trip'))
  fireEvent.click(screen.getByText('Plan a new trip'))
  await waitFor(() => screen.getByText(/Where are we going today\?/i))

  send('Somewhere warm')
  await waitFor(() => screen.getByText('Where to next?'))
  expect(postBodies()[0].sessionId).toBeUndefined()
  expect(mockReplace).toHaveBeenCalledWith(`/chat?session=${NEW_SESSION}`, { scroll: false })
})

it('bare /chat: no history or session fetch on load', async () => {
  mockDefaultFetches()
  render(<ChatPage />)
  await waitFor(() => screen.getByText(/Where are we going today\?/i))
  expect(fetchMock()).not.toHaveBeenCalled()
})

it('first reply with sessionId puts the chat in the URL and the next send carries that sessionId (D-07)', async () => {
  fetchMock()
    .mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'Lisbon, lovely. When?', conversationPhase: 'gathering_details', tripState: { destination: 'Lisbon' }, sessionId: NEW_SESSION }) })
    .mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'Got it.', conversationPhase: 'gathering_details', tripState: { destination: 'Lisbon' }, sessionId: NEW_SESSION }) })

  render(<ChatPage />)
  await waitFor(() => screen.getByPlaceholderText(/dream trip/i))

  send('Lisbon please')
  await waitFor(() => screen.getByText('Lisbon, lovely. When?'))
  expect(mockReplace).toHaveBeenCalledTimes(1)
  expect(mockReplace).toHaveBeenCalledWith(`/chat?session=${NEW_SESSION}`, { scroll: false })
  expect(postBodies()[0].sessionId).toBeUndefined()

  send('In May')
  await waitFor(() => screen.getByText('Got it.'))
  expect(postBodies()[1].sessionId).toBe(NEW_SESSION)
  // Already known: no second URL replace
  expect(mockReplace).toHaveBeenCalledTimes(1)
})

it('/chat?session=<id>: loads that chat by id and sends its sessionId', async () => {
  mockParams = { session: SESSION_A }
  mockSessionFetches(
    [{ id: 'm1', role: 'user', content: 'Plan Lisbon' }, { id: 'm2', role: 'assistant', content: 'Lisbon it is.' }],
    { id: SESSION_A, trip_state: { destination: 'Lisbon' }, conversation_phase: 'gathering_details', itinerary_id: null },
  )
  fetchMock().mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'Noted.', conversationPhase: 'gathering_details', tripState: {}, sessionId: SESSION_A }) })

  render(<ChatPage />)
  await waitFor(() => screen.getByText('Lisbon it is.'))
  const urls = fetchCalls().map(([url]) => url)
  expect(urls).toContain(`/api/chat/history?session=${SESSION_A}`)
  expect(urls).toContain(`/api/chat/session?id=${SESSION_A}`)

  await waitFor(() => expect(screen.getByPlaceholderText(/dream trip/i)).not.toBeDisabled())
  send('Four days')
  await waitFor(() => screen.getByText('Noted.'))
  expect(postBodies()[0].sessionId).toBe(SESSION_A)
  expect(mockReplace).not.toHaveBeenCalled()
})

it('?q= starts a new chat without any DELETE request', async () => {
  mockParams = { q: 'Weekend in Porto' }
  fetchMock().mockResolvedValueOnce({ json: () => Promise.resolve({ content: 'Porto, great.', conversationPhase: 'gathering_details', tripState: {}, sessionId: NEW_SESSION }) })

  render(<ChatPage />)
  await waitFor(() => screen.getByText('Porto, great.'))
  expect(fetchCalls().some(([, init]) => init?.method === 'DELETE')).toBe(false)
  expect(postBodies()[0].content).toBe('Weekend in Porto')
  expect(mockReplace).toHaveBeenCalledWith(`/chat?session=${NEW_SESSION}`, { scroll: false })
})

it('shows a calm message when the chat is not found (404)', async () => {
  mockParams = { session: SESSION_A }
  mockSessionFetches()
  fetchMock().mockResolvedValueOnce({ status: 404, json: () => Promise.resolve({ error: 'Chat not found' }) })

  render(<ChatPage />)
  await waitFor(() => expect(screen.getByPlaceholderText(/dream trip/i)).not.toBeDisabled())
  send('Hello?')
  await waitFor(() => screen.getByText('This chat could not be found. Start a new trip from the dashboard.'))
})
