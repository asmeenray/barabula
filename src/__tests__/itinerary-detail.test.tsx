import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

vi.mock('next/dynamic', () => ({
  default: (_fn: () => Promise<unknown>, _opts?: unknown) => {
    const MockMap = ({ pins }: { pins?: Array<{ id: string; sequenceNumber?: number }> }) => (
      <div
        data-testid="map-container"
        data-pins={(pins ?? []).map(p => `${p.id}#${p.sequenceNumber}`).join(',')}
      />
    )
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

vi.mock('swr', () => ({
  default: vi.fn(),
}))

let shareParam: string | null = null
const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'itin-1' }),
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/itinerary/itin-1',
  useSearchParams: () => ({ get: (key: string) => (key === 'share' ? shareParam : null) }),
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

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  shareParam = null
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ pins: [], remaining: 0 }), { status: 200 })
  )
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
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

  it('clicking Show Map POSTs to the server geocode route (no browser geocoding)', async () => {
    ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    render(<ItineraryDetailPage />)
    const geocodeCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/geocode'))
    expect(geocodeCalls()).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: /show map/i }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/itineraries/itin-1/geocode', { method: 'POST' })
    )
    // Only our own API is called; never Nominatim from the browser
    for (const [url] of fetchMock.mock.calls) {
      expect(String(url)).toMatch(/^\/api\//)
    }
  })

  it('keeps calling the geocode route while remaining > 0 and shows "Finding places on the map…" until done', async () => {
    ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    let release!: () => void
    const firstBatch = new Promise<void>(r => { release = r })
    const geocodeResponses = [
      async () => {
        await firstBatch
        return new Response(JSON.stringify({
          pins: [{ id: 'act-2', name: 'Shibuya Crossing', day: 2, lat: 35.66, lng: 139.7, type: 'activity' }],
          remaining: 1,
        }), { status: 200 })
      },
      async () => new Response(JSON.stringify({
        pins: [
          { id: 'act-1', name: 'Senso-ji Temple', day: 1, lat: 35.71, lng: 139.79, type: 'activity' },
          { id: 'act-2', name: 'Shibuya Crossing', day: 2, lat: 35.66, lng: 139.7, type: 'activity' },
        ],
        remaining: 0,
      }), { status: 200 }),
    ]
    fetchMock.mockImplementation((url: string) => {
      if (String(url).endsWith('/geocode')) return geocodeResponses.shift()!()
      return Promise.resolve(new Response('{}', { status: 200 }))
    })

    render(<ItineraryDetailPage />)
    fireEvent.click(screen.getByRole('button', { name: /show map/i }))
    expect(await screen.findByText('Finding places on the map…')).toBeInTheDocument()

    release()
    await waitFor(() =>
      expect(screen.queryByText('Finding places on the map…')).not.toBeInTheDocument()
    )
    const geocodeCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/geocode'))
    expect(geocodeCalls).toHaveLength(2)
    // Pins merged and numbered in activity order
    expect(screen.getByTestId('map-container').getAttribute('data-pins')).toBe('act-1#1,act-2#2')
  })

  it('stops the loop when a call makes no progress (no hammering Nominatim)', async () => {
    ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(new Response(
        String(url).endsWith('/geocode') ? JSON.stringify({ pins: [], remaining: 2 }) : '{}',
        { status: 200 }
      ))
    )
    render(<ItineraryDetailPage />)
    fireEvent.click(screen.getByRole('button', { name: /show map/i }))
    await waitFor(() =>
      expect(screen.queryByText('Finding places on the map…')).not.toBeInTheDocument()
    )
    const geocodeCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/geocode'))
    expect(geocodeCalls.length).toBeLessThanOrEqual(2)
  })

  it('share mode (share=true) never calls the geocode route', async () => {
    shareParam = 'true'
    ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    render(<ItineraryDetailPage />)
    await new Promise(r => setTimeout(r, 0))
    const geocodeCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/geocode'))
    expect(geocodeCalls).toHaveLength(0)
    expect(screen.queryByText('Finding places on the map…')).not.toBeInTheDocument()
  })

  it('renders "Eat & Drink" tab button', () => {
    ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    render(<ItineraryDetailPage />)
    expect(screen.getByRole('button', { name: /eat & drink/i })).toBeInTheDocument()
  })

  it('renders "Itinerary" tab button', () => {
    ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    render(<ItineraryDetailPage />)
    expect(screen.getByRole('button', { name: /^itinerary$/i })).toBeInTheDocument()
  })

  it('renders "Chat again" FAB with md:hidden class (mobile only)', () => {
    ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    render(<ItineraryDetailPage />)
    const fab = screen.getByRole('button', { name: /chat again/i })
    expect(fab).toBeInTheDocument()
    expect(fab.className).toContain('md:hidden')
  })
})

describe('Continue planning opens this trip\'s chat (D-12, D-27)', () => {
  const SESSION_ID = '44444444-4444-4444-8444-444444444444'
  const sessionCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).startsWith('/api/chat/session?'))

  function renderOwner() {
    ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockData,
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    render(<ItineraryDetailPage />)
  }

  function answerSession(response: Response | Error) {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).startsWith('/api/chat/session?')) {
        return response instanceof Error ? Promise.reject(response) : Promise.resolve(response)
      }
      return Promise.resolve(new Response(JSON.stringify({ pins: [], remaining: 0 }), { status: 200 }))
    })
  }

  const clickContinue = () => fireEvent.click(screen.getByRole('button', { name: /continue planning/i }))
  const clickChatAgain = () => fireEvent.click(screen.getByRole('button', { name: /chat again/i }))

  it.each([
    ['Continue planning', clickContinue],
    ['Chat again', clickChatAgain],
  ])('%s fetches the itinerary\'s session and opens /chat?session=<id>', async (_label, click) => {
    answerSession(new Response(JSON.stringify({ id: SESSION_ID }), { status: 200 }))
    renderOwner()
    click()
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(`/chat?session=${SESSION_ID}`))
    expect(sessionCalls().map(([url]) => url)).toEqual(['/api/chat/session?itineraryId=itin-1'])
    expect(pushMock).not.toHaveBeenCalledWith('/chat')
  })

  it.each([
    ['Continue planning', clickContinue],
    ['Chat again', clickChatAgain],
  ])('%s falls back to /chat when the session request fails', async (_label, click) => {
    answerSession(new Response(JSON.stringify({ error: 'Itinerary not found' }), { status: 404 }))
    renderOwner()
    click()
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/chat'))
    expect(pushMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to /chat on a network error', async () => {
    answerSession(new Error('offline'))
    renderOwner()
    clickContinue()
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/chat'))
  })
})

describe('ItineraryDetailPage share mode with the map open', () => {
  it('shows only cached OSM pins and never calls the geocode route', async () => {
    shareParam = 'true'
    vi.resetModules()
    // The real hero hides the map toggle for share viewers; expose it here to open the map.
    vi.doMock('@/components/itinerary/ItineraryHero', () => ({
      ItineraryHero: ({ onToggleMap }: { onToggleMap: () => void }) => (
        <button onClick={onToggleMap}>Show Map</button>
      ),
    }))
    const { default: freshUseSWR } = await import('swr')
    ;(freshUseSWR as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        ...mockData,
        activities: [
          { ...mockData.activities[0], extra_data: { lat: 35.71, lng: 139.79, geo_source: 'osm_nominatim' } },
          // Untagged coordinates are not OSM: no pin
          { ...mockData.activities[1], extra_data: { lat: 1, lng: 2 } },
        ],
      },
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    })
    const { default: SharePage } = await import('@/app/(authenticated)/itinerary/[id]/page')
    render(<SharePage />)
    fireEvent.click(screen.getByRole('button', { name: /show map/i }))
    await new Promise(r => setTimeout(r, 0))

    expect(screen.getByTestId('map-container').getAttribute('data-pins')).toBe('act-1#1')
    const geocodeCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/geocode'))
    expect(geocodeCalls).toHaveLength(0)
    expect(screen.queryByText('Finding places on the map…')).not.toBeInTheDocument()
    vi.doUnmock('@/components/itinerary/ItineraryHero')
  })
})
