import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('swr', () => ({
  default: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'itin-1' }),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/itinerary/itin-1',
}))

import useSWR from 'swr'
import ItineraryDetailPage from '@/app/(authenticated)/itinerary/[id]/page'

const mockData = {
  id: 'itin-1',
  user_id: 'u1',
  title: 'Tokyo Adventure',
  description: 'Amazing trip',
  destination: 'Tokyo, Japan',
  start_date: '2024-04-01',
  end_date: '2024-04-07',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  activities: [
    {
      id: 'act-1',
      itinerary_id: 'itin-1',
      day_number: 1,
      name: 'Senso-ji Temple',
      time: '09:00',
      description: 'Ancient Buddhist temple',
      location: 'Asakusa',
      activity_type: null,
    },
    {
      id: 'act-2',
      itinerary_id: 'itin-1',
      day_number: 2,
      name: 'Shibuya Crossing',
      time: '10:00',
      description: null,
      location: 'Shibuya',
      activity_type: null,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ItineraryDetailPage', () => {
  it('renders itinerary header with title (ITIN-01)', () => {
    ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    render(<ItineraryDetailPage />)
    expect(screen.getByTestId('itinerary-header')).toBeInTheDocument()
    expect(screen.getByText('Tokyo Adventure')).toBeInTheDocument()
  })

  it('renders Day 1 and Day 2 section headers', () => {
    ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    render(<ItineraryDetailPage />)
    expect(screen.getByText('Day 1')).toBeInTheDocument()
    expect(screen.getByText('Day 2')).toBeInTheDocument()
  })

  it('renders activities from the data', () => {
    ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    render(<ItineraryDetailPage />)
    expect(screen.getByText('Senso-ji Temple')).toBeInTheDocument()
    expect(screen.getByText('Shibuya Crossing')).toBeInTheDocument()
  })
})
