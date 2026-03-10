import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DashboardPage from '@/app/(authenticated)/dashboard/page'

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn(),
}))

// Mock fetch for delete action
global.fetch = vi.fn()

const mockItineraries = [
  {
    id: '1',
    user_id: 'u1',
    title: 'Tokyo Adventure',
    destination: 'Tokyo, Japan',
    start_date: '2024-04-01',
    end_date: '2024-04-07',
    description: 'An amazing trip',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

import useSWR from 'swr'

beforeEach(() => {
  vi.clearAllMocks()
})

it('renders card grid when itineraries exist (DASH-01)', () => {
  ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
    data: mockItineraries,
    error: null,
    isLoading: false,
    mutate: vi.fn(),
  })
  render(<DashboardPage />)
  expect(screen.getByTestId('itinerary-grid')).toBeInTheDocument()
  expect(screen.getByText('Tokyo Adventure')).toBeInTheDocument()
})

it('renders empty state when no itineraries (DASH-05)', () => {
  ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
    data: [],
    error: null,
    isLoading: false,
    mutate: vi.fn(),
  })
  render(<DashboardPage />)
  expect(screen.getByText(/No trips yet/i)).toBeInTheDocument()
  expect(screen.getByText(/Start a trip in Chat/i)).toBeInTheDocument()
})

it('calls DELETE API and mutates after delete (DASH-04)', async () => {
  const mockMutate = vi.fn()
  ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
    data: mockItineraries,
    error: null,
    isLoading: false,
    mutate: mockMutate,
  })
  ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  })

  // Mock window.confirm to auto-confirm
  window.confirm = vi.fn(() => true)

  render(<DashboardPage />)
  const deleteBtn = screen.getByText('Delete')
  fireEvent.click(deleteBtn)

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith('/api/itineraries/1', { method: 'DELETE' })
    expect(mockMutate).toHaveBeenCalled()
  })
})
