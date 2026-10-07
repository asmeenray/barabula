import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PlanClient } from '@/components/board/PlanClient'
import { LiveRegionProvider } from '@/components/a11y/LiveRegion'
import { UndoProvider } from '@/components/undo/UndoProvider'
import type { PlanActivity, TripPlan } from '@/lib/plan/types'

// Map states on the board (16-11, D-23, D-24): places waiting for a lookup read
// "Finding on map…" while the batch runs after the map is up; places without
// an address or not found carry the NOT ON MAP tag and a "Find on map" retry
// in the ticket; a failed retry says what to do next.

vi.mock('@/components/map/TripMapLazy', () => ({ TripMapLazy: () => null }))
// The map is "ready" at once, so the batch lookup starts on mount.
vi.mock('@/lib/client/use-after-mark', () => ({ useAfterMark: () => true }))

const TRIP_ID = '11111111-1111-4111-8111-111111111111'
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

function activity(id: string, name: string, position: number, location: string | null, extra = {}): PlanActivity {
  return {
    id,
    itinerary_id: TRIP_ID,
    day_number: 1,
    position,
    name,
    time: null,
    description: null,
    location,
    activity_type: null,
    extra_data: extra,
    duration: null,
    tips: null,
  }
}

function plan(activities: PlanActivity[]): TripPlan {
  return {
    trip: {
      id: TRIP_ID,
      user_id: 'user-1',
      title: 'Lisbon',
      description: null,
      destination: 'Lisbon',
      start_date: null,
      end_date: null,
      cover_image_url: null,
      extra_data: { day_count: 1 },
      is_public: false,
      created_at: null,
      updated_at: null,
    },
    activities,
    dayCount: 1,
  }
}

const fetchMock = vi.fn()

function row(id: string): HTMLElement {
  return document.querySelector(`li[data-activity-id="${id}"]`) as HTMLElement
}

function posts(path: string) {
  return fetchMock.mock.calls.filter(([url, init]) => init?.method === 'POST' && String(url) === path)
}

function renderBoard(activities: PlanActivity[]) {
  render(
    <LiveRegionProvider>
      <UndoProvider>
        <PlanClient plan={plan(activities)} />
      </UndoProvider>
    </LiveRegionProvider>
  )
}

describe('map states on the board', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('batch: Finding on map… while it runs, then a pin (location shown) or NOT ON MAP', async () => {
    let answer: (r: Response) => void = () => {}
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          answer = resolve
        })
    )
    renderBoard([
      activity(A, 'Castelo', 1, 'Alfama'),
      activity(B, 'Graça', 2, 'Graça'),
      activity(C, 'Café', 3, null),
    ])
    await waitFor(() => expect(posts(`/api/itineraries/${TRIP_ID}/geocode`)).toHaveLength(1))
    expect(row(A).querySelector('[data-geo="finding"]')?.textContent).toBe('Finding on map…')
    expect(row(B).querySelector('[data-geo="finding"]')).not.toBeNull()
    // No address: never looked up, tagged at once.
    expect(row(C).querySelector('[data-geo="not-on-map"]')?.textContent).toBe('Not on map')

    answer(
      new Response(JSON.stringify({ pins: [{ id: A, lat: 38.71, lng: -9.13 }], remaining: 0, not_found: [B] }), {
        status: 200,
      })
    )
    await waitFor(() => expect(row(A).querySelector('[data-geo]')).toBeNull())
    expect(within(row(A)).getByText('Alfama')).toBeTruthy()
    expect(row(A).querySelector('[data-walk]')?.textContent).toBe('Start')
    expect(row(B).querySelector('[data-geo="not-on-map"]')).not.toBeNull()
    expect(posts(`/api/itineraries/${TRIP_ID}/geocode`)).toHaveLength(1)
  })

  it('batch stops when a call makes no progress (rate limit or kill switch)', async () => {
    fetchMock.mockImplementation(
      async () => new Response(JSON.stringify({ pins: [], remaining: 1, not_found: [] }), { status: 200 })
    )
    renderBoard([activity(A, 'Castelo', 1, 'Alfama')])
    await waitFor(() => expect(row(A).querySelector('[data-geo="finding"]')).toBeNull())
    expect(posts(`/api/itineraries/${TRIP_ID}/geocode`)).toHaveLength(1)
    expect(within(row(A)).getByText('Alfama')).toBeTruthy()
  })

  it('Find on map with no address: Still not on map. Add an address with Edit place.', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith(`/api/activities/${C}/geocode`)
        ? new Response(JSON.stringify({ status: 'no_location' }), { status: 200 })
        : new Response(JSON.stringify({ pins: [], remaining: 0, not_found: [] }), { status: 200 })
    )
    renderBoard([activity(C, 'Café', 1, null)])
    fireEvent.click(within(row(C)).getAllByRole('button')[0])
    const ticket = within(row(C)).getByRole('region')
    fireEvent.click(within(ticket).getByRole('button', { name: 'Find on map' }))
    await waitFor(() => expect(posts(`/api/activities/${C}/geocode`)).toHaveLength(1))
    expect(await within(ticket).findByText('Still not on map. Add an address with Edit place.')).toBeTruthy()
  })

  it('Find on map that hits drops the pin and hides the retry', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith(`/api/activities/${A}/geocode`)
        ? new Response(JSON.stringify({ status: 'hit', lat: 38.71, lng: -9.13 }), { status: 200 })
        : new Response(JSON.stringify({ pins: [], remaining: 0, not_found: [] }), { status: 200 })
    )
    renderBoard([activity(A, 'Castelo', 1, 'Alfama', { geo_status: 'not_found' })])
    expect(row(A).querySelector('[data-geo="not-on-map"]')).not.toBeNull()
    fireEvent.click(within(row(A)).getAllByRole('button')[0])
    const ticket = within(row(A)).getByRole('region')
    fireEvent.click(within(ticket).getByRole('button', { name: 'Find on map' }))
    await waitFor(() => expect(within(ticket).queryByRole('button', { name: 'Find on map' })).toBeNull())
    expect(row(A).querySelector('[data-geo]')).toBeNull()
    // A known not_found row is not part of the batch.
    expect(posts(`/api/itineraries/${TRIP_ID}/geocode`)).toHaveLength(0)
  })
})
