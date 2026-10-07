import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PlanClient } from '@/components/board/PlanClient'
import { LiveRegionProvider } from '@/components/a11y/LiveRegion'
import { UndoProvider } from '@/components/undo/UndoProvider'
import { clockOf, editPatch, type NewPlace } from '@/lib/plan/use-plan'
import type { PlanActivity, TripPlan } from '@/lib/plan/types'

// Edit place (16-11): the row menu opens the place form prefilled; Save place
// sends one PATCH of what changed. Duration and tips are never sent. A new
// address clears the cached coordinates so the place is looked up again.

vi.mock('@/components/map/TripMapLazy', () => ({ TripMapLazy: () => null }))

const TRIP_ID = '11111111-1111-4111-8111-111111111111'
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const GEO = { lat: 38.7, lng: -9.1, geo_source: 'osm_nominatim', geocoded_at: '2026-10-01T00:00:00Z' }

function activity(id: string, name: string, day: number | null, position: number, extra = {}): PlanActivity {
  return {
    id,
    itinerary_id: TRIP_ID,
    day_number: day,
    position,
    name,
    time: null,
    description: 'Viewpoint',
    location: 'Alfama',
    activity_type: null,
    extra_data: extra,
    duration: '1 hour',
    tips: 'Go early',
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
      extra_data: { day_count: 2 },
      is_public: false,
      created_at: null,
      updated_at: null,
    },
    activities,
    dayCount: 2,
  }
}

function place(over: Partial<NewPlace> = {}): NewPlace {
  return {
    day_number: 1,
    name: 'Castelo',
    location: 'Alfama',
    description: 'Viewpoint',
    time: null,
    fixed_time: false,
    ...over,
  }
}

describe('editPatch', () => {
  const a = activity(A, 'Castelo', 1, 1)

  it('is empty when nothing changed', () => {
    expect(editPatch(a, place())).toEqual({})
  })

  it('sends only changed fields, never duration or tips', () => {
    const patch = editPatch(a, place({ name: 'Castelo de São Jorge', description: null }))
    expect(patch).toEqual({ name: 'Castelo de São Jorge', description: null })
  })

  it('turns the fixed time on with a time, and off without touching the time', () => {
    expect(editPatch(a, place({ fixed_time: true, time: '19:30' }))).toEqual({
      time: '19:30',
      extra_data: { fixed_time: true },
    })
    const fixed = { ...a, time: '19:30:00', extra_data: { fixed_time: true } }
    expect(editPatch(fixed, place({ fixed_time: true, time: '19:30' }))).toEqual({})
    expect(editPatch(fixed, place())).toEqual({ extra_data: { fixed_time: false } })
  })

  it('clockOf reads HH:MM', () => {
    expect(clockOf('9:05:00')).toBe('09:05')
    expect(clockOf('evening')).toBeNull()
    expect(clockOf(null)).toBeNull()
  })
})

const fetchMock = vi.fn()

function patches() {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'PATCH')
    .map(([url, init]) => ({ id: String(url).split('/').pop(), body: JSON.parse(String(init.body)) }))
}

async function openEdit(id: string, name: string) {
  const row = document.querySelector(`li[data-activity-id="${id}"]`) as HTMLElement
  fireEvent.click(within(row).getByRole('button', { name: `Actions for ${name}` }))
  const menu = await screen.findByRole('menu')
  fireEvent.click(within(menu).getByRole('menuitem', { name: 'Edit place' }))
  return screen.findByRole('dialog', { name: 'Edit place' })
}

describe('Edit place from the row menu', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockImplementation(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  function renderBoard(activities: PlanActivity[]) {
    render(
      <LiveRegionProvider>
        <UndoProvider>
          <PlanClient plan={plan(activities)} />
        </UndoProvider>
      </LiveRegionProvider>
    )
  }

  it('prefills the form; Save place sends only the new name; Discard changes sends nothing', async () => {
    renderBoard([activity(A, 'Castelo', 1, 1, GEO)])
    let dialog = await openEdit(A, 'Castelo')
    expect((within(dialog).getByLabelText('Place name') as HTMLInputElement).value).toBe('Castelo')
    expect((within(dialog).getByLabelText('Address or area (optional)') as HTMLInputElement).value).toBe('Alfama')
    expect(within(dialog).getByRole('button', { name: 'Discard changes' })).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(patches()).toEqual([])

    dialog = await openEdit(A, 'Castelo')
    fireEvent.change(within(dialog).getByLabelText('Place name'), { target: { value: 'Castelo de São Jorge' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save place' }))
    await waitFor(() => expect(patches()).toEqual([{ id: A, body: { name: 'Castelo de São Jorge' } }]))
    expect(await screen.findAllByText('Castelo de São Jorge')).not.toHaveLength(0)
  })

  it('a new address clears the cached pin locally and sends the location', async () => {
    renderBoard([activity(A, 'Castelo', 1, 1, GEO), activity(B, 'Graça', 1, 2, GEO)])
    const dialog = await openEdit(A, 'Castelo')
    fireEvent.change(within(dialog).getByLabelText('Address or area (optional)'), {
      target: { value: 'Rua de Santa Cruz do Castelo' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save place' }))
    await waitFor(() => expect(patches()).toHaveLength(1))
    expect(patches()[0].body).toEqual({ location: 'Rua de Santa Cruz do Castelo' })
    // No coordinates now: the walk cell for it reads "—" (B becomes the START).
    const row = document.querySelector(`li[data-activity-id="${A}"]`) as HTMLElement
    await waitFor(() => expect(row.querySelector('[data-walk]')?.textContent).toBe('—'))
  })
})
