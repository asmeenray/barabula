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

type SWRState = { data?: unknown; error?: unknown; isLoading?: boolean; mutate?: ReturnType<typeof vi.fn> }

// Answer each useSWR call by its key, so the itinerary grid and the 'In progress' list are set separately.
function mockSWR(byKey: { itineraries: SWRState; sessions?: SWRState }) {
  ;(useSWR as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
    const state = key === '/api/chat/sessions'
      ? (byKey.sessions ?? { data: [] })
      : byKey.itineraries
    return { data: undefined, error: null, isLoading: false, mutate: vi.fn(), ...state }
  })
}

const mockSessions = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    trip_state: { destination: 'Lisbon' },
    conversation_phase: 'gathering_details',
    updated_at: '2026-10-05T10:00:00Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    trip_state: {},
    conversation_phase: 'gathering_destination',
    updated_at: '2026-10-04T10:00:00Z',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

it('renders card grid when itineraries exist (DASH-01)', () => {
  mockSWR({ itineraries: { data: mockItineraries } })
  render(<DashboardPage />)
  expect(screen.getByTestId('itinerary-grid')).toBeInTheDocument()
  expect(screen.getByText('Tokyo Adventure')).toBeInTheDocument()
})

it('renders empty state when no itineraries (DASH-05)', () => {
  mockSWR({ itineraries: { data: [] } })
  render(<DashboardPage />)
  expect(screen.getByText(/No trips yet/i)).toBeInTheDocument()
  expect(screen.getByText(/Start a trip in Chat/i)).toBeInTheDocument()
})

it('calls DELETE API and mutates after delete (DASH-04)', async () => {
  const mockMutate = vi.fn()
  mockSWR({ itineraries: { data: mockItineraries, mutate: mockMutate } })
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

describe('In progress list (D-09)', () => {
  it('loads /api/chat/sessions', () => {
    mockSWR({ itineraries: { data: mockItineraries } })
    render(<DashboardPage />)
    const keys = (useSWR as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0])
    expect(keys).toContain('/api/chat/sessions')
    expect(keys).toContain('/api/itineraries')
  })

  it('shows an In progress heading and one link per session to its chat', () => {
    mockSWR({ itineraries: { data: mockItineraries }, sessions: { data: mockSessions } })
    render(<DashboardPage />)
    expect(screen.getByRole('heading', { name: 'In progress' })).toBeInTheDocument()

    const lisbon = screen.getByRole('link', { name: /Lisbon/ })
    expect(lisbon).toHaveAttribute('href', `/chat?session=${mockSessions[0].id}`)
    const untitled = screen.getByRole('link', { name: /New trip/ })
    expect(untitled).toHaveAttribute('href', `/chat?session=${mockSessions[1].id}`)

    // Newest first, as returned by the route
    const sessionLinks = screen.getAllByRole('link').filter(a => a.getAttribute('href')?.startsWith('/chat?session='))
    expect(sessionLinks.map(a => a.getAttribute('href'))).toEqual(mockSessions.map(s => `/chat?session=${s.id}`))

    // Itinerary grid still renders
    expect(screen.getByTestId('itinerary-grid')).toBeInTheDocument()
  })

  it('also shows In progress when there are no saved itineraries', () => {
    mockSWR({ itineraries: { data: [] }, sessions: { data: mockSessions } })
    render(<DashboardPage />)
    expect(screen.getByRole('heading', { name: 'In progress' })).toBeInTheDocument()
    expect(screen.getByText(/No trips yet/i)).toBeInTheDocument()
  })

  it.each([
    ['an empty list', { data: [] }],
    ['loading', { data: undefined, isLoading: true }],
    ['an error', { data: undefined, error: new Error('Failed to load') }],
  ])('renders no In progress heading for %s, and the grid still renders', (_label, sessions) => {
    mockSWR({ itineraries: { data: mockItineraries }, sessions })
    render(<DashboardPage />)
    expect(screen.queryByText('In progress')).not.toBeInTheDocument()
    expect(screen.getByTestId('itinerary-grid')).toBeInTheDocument()
    expect(screen.getByText('Tokyo Adventure')).toBeInTheDocument()
  })
})
