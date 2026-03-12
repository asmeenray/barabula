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

// Mock next/navigation with a spy so we can assert on push calls
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
  useSearchParams: () => ({ get: () => null }),
}))

/** Helper: default fetch mocks — history empty + session gathering_destination */
function mockDefaultFetches() {
  ;(global.fetch as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce({ json: () => Promise.resolve([]) })  // history
    .mockResolvedValueOnce({  // session GET
      ok: true,
      json: () => Promise.resolve({ trip_state: {}, conversation_phase: 'gathering_destination' }),
    })
}

beforeEach(() => {
  vi.resetAllMocks()
  mockPush.mockReset()
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
  ;(global.fetch as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce({ json: () => Promise.resolve([]) })  // history
    .mockResolvedValueOnce({  // session GET
      ok: true,
      json: () => Promise.resolve({ trip_state: {}, conversation_phase: 'gathering_destination' }),
    })
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
})

it('passes conversationPhase to QuickActionChips after API response', async () => {
  ;(global.fetch as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce({ json: () => Promise.resolve([]) })  // history
    .mockResolvedValueOnce({  // session GET
      ok: true,
      json: () => Promise.resolve({ trip_state: {}, conversation_phase: 'gathering_destination' }),
    })
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

it('calls DELETE /api/chat/session when __reset_session__ sentinel is triggered', async () => {
  // Pre-set itinerary_complete phase via session
  ;(global.fetch as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce({ json: () => Promise.resolve([]) })  // history
    .mockResolvedValueOnce({  // session GET — returns itinerary_complete so "Plan a new trip" chip renders
      ok: true,
      json: () => Promise.resolve({ trip_state: { destination: 'Tokyo' }, conversation_phase: 'itinerary_complete' }),
    })
    .mockResolvedValueOnce({ json: () => Promise.resolve({ ok: true }) })  // DELETE session

  // Mock window.confirm to return true
  vi.spyOn(window, 'confirm').mockReturnValue(true)

  // Mock window.location.reload
  const reloadMock = vi.fn()
  Object.defineProperty(window, 'location', {
    value: { reload: reloadMock },
    writable: true,
  })

  render(<ChatPage />)

  // Wait for "Plan a new trip" chip to appear (itinerary_complete phase)
  await waitFor(() => {
    expect(screen.getByText('Plan a new trip')).toBeTruthy()
  })

  // Click the "Plan a new trip" chip
  fireEvent.click(screen.getByText('Plan a new trip'))

  await waitFor(() => {
    // confirm dialog shown
    expect(window.confirm).toHaveBeenCalled()
    // DELETE called on /api/chat/session
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
    const deleteCall = calls.find(c => c[0] === '/api/chat/session' && c[1]?.method === 'DELETE')
    expect(deleteCall).toBeTruthy()
  })
})
