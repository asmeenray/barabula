import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

vi.mock('next/dynamic', () => ({
  default: (_fn: () => Promise<unknown>, _opts?: unknown) => {
    const MockMap = () => <div data-testid="map-container" />
    return MockMap
  },
}))

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...p}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/lib/geocoding', () => ({
  resolveActivityCoordinates: vi.fn().mockResolvedValue(null),
}))

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
  cover_image_url: null,
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
      extra_data: null,
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
      extra_data: null,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ItineraryDetailPage', () => {
  it('renders itinerary hero with title (ITIN-01)', () => {
    ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    render(<ItineraryDetailPage />)
    expect(screen.getByTestId('itinerary-hero')).toBeInTheDocument()
    // Title appears in both hero overlay and editable inline heading — use getAllByText
    const titles = screen.getAllByText('Tokyo Adventure')
    expect(titles.length).toBeGreaterThanOrEqual(1)
  })

  it('renders Day 1 and Day 2 section headers', () => {
    ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    render(<ItineraryDetailPage />)
    // Day pills and section headers both contain "Day 1" / "Day 2" — use getAllByText
    const day1Elements = screen.getAllByText(/Day 1/)
    const day2Elements = screen.getAllByText(/Day 2/)
    expect(day1Elements.length).toBeGreaterThanOrEqual(1)
    expect(day2Elements.length).toBeGreaterThanOrEqual(1)
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

  it('Show Map button is visible on load and map is hidden', () => {
    ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    render(<ItineraryDetailPage />)
    // Show Map button should be visible
    expect(screen.getByRole('button', { name: /show map/i })).toBeInTheDocument()
    // Map container should NOT be in the document initially
    expect(screen.queryByTestId('map-container')).not.toBeInTheDocument()
  })

  it('clicking Show Map mounts the map', () => {
    ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    render(<ItineraryDetailPage />)
    const showMapBtn = screen.getByRole('button', { name: /show map/i })
    fireEvent.click(showMapBtn)
    // Map container should now be in the document
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
    // Button label should now read "Hide Map"
    expect(screen.getByRole('button', { name: /hide map/i })).toBeInTheDocument()
  })
})
