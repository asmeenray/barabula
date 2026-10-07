import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PlanClient } from '@/components/board/PlanClient'
import { LiveRegionProvider } from '@/components/a11y/LiveRegion'
import { UndoProvider } from '@/components/undo/UndoProvider'
import type { PlanActivity, PlanTrip, TripPlan } from '@/lib/plan/types'

// Trip details from the plan header (16-17, D-20): the cell opens that
// question with Save / Cancel; Save PATCHes the trip with one Undo toast. A
// shorter WHEN first moves the places on removed days to Maybe, in the same
// Undo op. Undated trips get "+ DAY".

vi.mock('@/components/map/TripMapLazy', () => ({ TripMapLazy: () => null }))

const TRIP_ID = '11111111-1111-4111-8111-111111111111'
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const M = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

function activity(id: string, name: string, day: number | null, position: number): PlanActivity {
  return {
    id,
    itinerary_id: TRIP_ID,
    day_number: day,
    position,
    name,
    time: null,
    description: null,
    location: null,
    activity_type: null,
    extra_data: {},
    duration: null,
    tips: null,
  }
}

function plan(trip: Partial<PlanTrip>, activities: PlanActivity[], dayCount: number): TripPlan {
  return {
    trip: {
      id: TRIP_ID,
      user_id: 'user-1',
      title: 'Lisbon',
      description: null,
      destination: 'Lisbon',
      start_date: '2026-05-12',
      end_date: '2026-05-14',
      cover_image_url: null,
      extra_data: null,
      is_public: false,
      created_at: null,
      updated_at: null,
      ...trip,
    },
    activities,
    dayCount,
  }
}

const fetchMock = vi.fn()

function renderBoard(p: TripPlan) {
  return render(
    <LiveRegionProvider>
      <UndoProvider>
        <PlanClient plan={p} />
      </UndoProvider>
    </LiveRegionProvider>
  )
}

type Call = { url: string; method: string; body: Record<string, unknown> | null }
function calls(): Call[] {
  return fetchMock.mock.calls.map(([url, init]) => ({
    url: String(url),
    method: init?.method ?? 'GET',
    body: init?.body ? JSON.parse(init.body) : null,
  }))
}
const tripPatches = () => calls().filter((c) => c.method === 'PATCH' && c.url === `/api/itineraries/${TRIP_ID}`)
const placePatches = () => calls().filter((c) => c.method === 'PATCH' && c.url.startsWith('/api/activities/'))

function idsIn(day: string): string[] {
  return [...document.querySelectorAll(`[data-day="${day}"] li[data-activity-id]`)].map(
    (el) => el.getAttribute('data-activity-id') ?? ''
  )
}

const LISBON = [
  activity(A, 'Time Out Market', 1, 1),
  activity(B, 'Belém Tower', 3, 1),
  activity(C, 'LX Factory', 3, 2),
  activity(M, 'MAAT', null, 1),
]

describe('trip details from the plan header', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockImplementation(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('header cells are buttons with the edit names', () => {
    renderBoard(plan({}, LISBON, 3))
    for (const name of ['Edit destination', 'Edit dates', 'Edit travellers', 'Edit interests']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
  })

  it('Edit travellers → Save PATCHes the pass; WHO updates; toast "Trip details saved"', async () => {
    renderBoard(plan({}, LISBON, 3))
    fireEvent.click(screen.getByRole('button', { name: 'Edit travellers' }))
    const dialog = await screen.findByRole('dialog', { name: "Who's going?" })
    // Single-question mode: no progress, Back or Skip.
    expect(within(dialog).queryByText(/Question \d of 4/)).toBeNull()
    expect(within(dialog).queryByRole('button', { name: 'Skip this question' })).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Cancel editing' })).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'More adults' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'More adults' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save trip details' }))

    await waitFor(() => expect(tripPatches()).toHaveLength(1))
    expect(tripPatches()[0].body).toEqual({ extra_data: { pass: { adults: 3, kids: 0 } } })
    expect(await screen.findByText('Trip details saved')).toBeTruthy()
    expect(screen.getByText('3 adults')).toBeTruthy()
  })

  it('Cancel sends nothing', async () => {
    renderBoard(plan({}, LISBON, 3))
    fireEvent.click(screen.getByRole('button', { name: 'Edit interests' }))
    const dialog = await screen.findByRole('dialog', { name: 'What are you into?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel editing' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(tripPatches()).toHaveLength(0)
  })

  it('shows the 30-day message and keeps Save disabled', async () => {
    renderBoard(plan({}, LISBON, 3))
    fireEvent.click(screen.getByRole('button', { name: 'Edit dates' }))
    const dialog = await screen.findByRole('dialog', { name: 'When?' })
    fireEvent.change(within(dialog).getByLabelText('End date'), { target: { value: '2026-06-20' } })
    expect(await within(dialog).findByText('Trips can be up to 30 days.')).toBeTruthy()
    const save = within(dialog).getByRole('button', { name: 'Save trip details' })
    expect(save.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(save)
    expect(tripPatches()).toHaveLength(0)
  })

  it('fewer days: day-3 places go to Maybe first, one toast, Undo restores places and dates', async () => {
    renderBoard(plan({}, LISBON, 3))
    expect(document.querySelector('[data-day="3"]')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Edit dates' }))
    const dialog = await screen.findByRole('dialog', { name: 'When?' })
    fireEvent.change(within(dialog).getByLabelText('End date'), { target: { value: '2026-05-13' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save trip details' }))

    expect(await screen.findByText('2 places moved to Maybe')).toBeTruthy()
    await waitFor(() => expect(tripPatches()).toHaveLength(1))
    // Places were sent before the trip (appended after MAAT, in plan order).
    expect(placePatches().map((c) => [c.url.split('/').pop(), c.body])).toEqual([
      [B, { day_number: null, position: 2 }],
      [C, { day_number: null, position: 3 }],
    ])
    const order = calls().map((c) => c.url)
    expect(order.indexOf(`/api/itineraries/${TRIP_ID}`)).toBeGreaterThan(order.lastIndexOf(`/api/activities/${C}`))
    expect(tripPatches()[0].body).toEqual({
      start_date: '2026-05-12',
      end_date: '2026-05-13',
      extra_data: { pass: { when: { kind: 'dates', start: '2026-05-12', end: '2026-05-13' } }, day_count: 2 },
    })
    expect(document.querySelector('[data-day="3"]')).toBeNull()
    expect(idsIn('maybe')).toEqual([M, B, C])

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(tripPatches()).toHaveLength(2))
    expect(tripPatches()[1].body).toEqual({
      start_date: '2026-05-12',
      end_date: '2026-05-14',
      extra_data: { pass: { when: null }, day_count: 3 },
    })
    await waitFor(() => expect(placePatches()).toHaveLength(4))
    expect(placePatches().slice(2).map((c) => [c.url.split('/').pop(), c.body])).toEqual([
      [B, { day_number: 3, position: 1 }],
      [C, { day_number: 3, position: 2 }],
    ])
    expect(idsIn('3')).toEqual([B, C])
    expect(idsIn('maybe')).toEqual([M])
  })

  it('a failed trip save shows the DELAYED line; Retry sends it again', async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === 'PATCH' && String(url).startsWith('/api/itineraries/')
        ? new Response('{}', { status: 500 })
        : new Response('{}', { status: 200 })
    )
    renderBoard(plan({}, LISBON, 3))
    fireEvent.click(screen.getByRole('button', { name: 'Edit travellers' }))
    const dialog = await screen.findByRole('dialog', { name: "Who's going?" })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save trip details' }))
    expect(await screen.findByText("Couldn't save.")).toBeTruthy()

    fetchMock.mockImplementation(async () => new Response('{}', { status: 200 }))
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(tripPatches()).toHaveLength(2))
    expect(tripPatches()[1].body).toEqual({ extra_data: { pass: { adults: 1, kids: 0 } } })
    await waitFor(() => expect(screen.queryByText("Couldn't save.")).toBeNull())
  })

  it('undated trips show "+ DAY" (Add a day), which adds one day', async () => {
    renderBoard(
      plan(
        { start_date: null, end_date: null, title: 'Porto', destination: 'Porto', extra_data: { day_count: 2 } },
        [activity(A, 'Livraria Lello', 1, 1), activity(B, 'Ponte Luís I', 2, 1)],
        2
      )
    )
    const add = screen.getAllByRole('button', { name: 'Add a day' })
    expect(add.length).toBeGreaterThan(0)
    // Not a tab: it sits beside the tablist.
    expect(add[0].closest('[role="tablist"]')).toBeNull()
    fireEvent.click(add[0])
    await waitFor(() => expect(tripPatches()).toHaveLength(1))
    expect(tripPatches()[0].body).toEqual({ extra_data: { day_count: 3 } })
    expect(document.querySelector('[data-day="3"]')).not.toBeNull()
    expect(screen.getAllByRole('tab', { name: /^D\d/ })).toHaveLength(3)
  })

  it('dated trips have no "+ DAY"', () => {
    renderBoard(plan({}, LISBON, 3))
    expect(screen.queryByRole('button', { name: 'Add a day' })).toBeNull()
  })
})
