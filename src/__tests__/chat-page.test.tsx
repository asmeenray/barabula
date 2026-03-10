import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ChatPage from '@/app/(authenticated)/chat/page'

// Mock fetch
global.fetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  // Default: history returns empty array
  ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    json: () => Promise.resolve([]),
  })
})

it('renders the chat container', async () => {
  render(<ChatPage />)
  expect(screen.getByTestId('chat-container')).toBeInTheDocument()
})

it('shows empty state when no messages', async () => {
  render(<ChatPage />)
  await waitFor(() => {
    expect(screen.getByText(/Plan your next trip/i)).toBeInTheDocument()
  })
})

it('calls router.push after receiving itineraryId', async () => {
  const { useRouter } = await import('next/navigation')
  const mockPush = vi.fn()
  ;(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockPush })

  ;(global.fetch as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce({ json: () => Promise.resolve([]) })  // history
    .mockResolvedValueOnce({ json: () => Promise.resolve({ content: "Your itinerary is ready!", itineraryId: 'abc-123' }) })  // message
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
