import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PlanClient, toNewPlace } from '@/components/board/PlanClient'
import { LiveRegionProvider } from '@/components/a11y/LiveRegion'
import { UndoProvider } from '@/components/undo/UndoProvider'
import { addedLabel } from '@/lib/plan/use-plan'
import type { PlanActivity, TripPlan } from '@/lib/plan/types'

// Add place by hand (16-11, D-18): the row shows at once, POST saves it, the
// toast names where it landed, Undo deletes the created id. A failed POST keeps
// the row as "Not saved yet" with the DELAYED line.

vi.mock('@/components/map/TripMapLazy', () => ({ TripMapLazy: () => null }))

const TRIP_ID = '11111111-1111-4111-8111-111111111111'
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const NEW_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

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

const fetchMock = vi.fn()

function renderBoard(activities: PlanActivity[]) {
  return render(
    <LiveRegionProvider>
      <UndoProvider>
        <PlanClient plan={plan(activities)} />
      </UndoProvider>
    </LiveRegionProvider>
  )
}

function calls(method: string) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === method)
}

async function openForm() {
  // The phone FAB (jsdom has no matchMedia, so the phone layout renders).
  fireEvent.click(screen.getAllByRole('button', { name: 'Add place' })[0])
  return screen.findByRole('dialog', { name: 'Add a place' })
}

describe('addedLabel', () => {
  it('names where the place landed', () => {
    expect(addedLabel(2, 'Castelo')).toBe('Added to day 2, after Castelo')
    expect(addedLabel(3, null)).toBe('Added to day 3')
    expect(addedLabel(null, 'Anything')).toBe('Added to Maybe')
  })
})

describe('toNewPlace', () => {
  it('trims, stores blanks as null and keeps a time only with the switch on', () => {
    expect(
      toNewPlace({ name: '  Café ', day: 2, location: ' ', fixedTime: false, time: '10:00', note: '' })
    ).toEqual({ day_number: 2, name: 'Café', location: null, description: null, time: null, fixed_time: false })
    expect(
      toNewPlace({ name: 'Show', day: null, location: 'Baixa', fixedTime: true, time: '19:30', note: 'Row 3' })
    ).toEqual({ day_number: null, name: 'Show', location: 'Baixa', description: 'Row 3', time: '19:30', fixed_time: true })
    expect(toNewPlace({ name: 'X', day: 1, location: '', fixedTime: true, time: '', note: '' }).fixed_time).toBe(false)
  })
})

describe('add a place', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requires a place name', async () => {
    renderBoard([activity(A, 'Castelo', 1, 1)])
    const dialog = await openForm()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add place' }))
    expect(await within(dialog).findByText('Add a place name.')).toBeTruthy()
    expect(calls('POST')).toHaveLength(0)
  })

  it('shows the row at once, POSTs it, toasts where it landed; Undo deletes the created id', async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body))
        return new Response(JSON.stringify({ ...activity(NEW_ID, body.name, body.day_number, 2), ...body, id: NEW_ID }), {
          status: 201,
        })
      }
      return new Response('{}', { status: 200 })
    })
    renderBoard([activity(A, 'Castelo', 1, 1)])
    const dialog = await openForm()
    fireEvent.change(within(dialog).getByLabelText('Place name'), { target: { value: 'Test Café' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add place' }))

    await waitFor(() => expect(calls('POST')).toHaveLength(1))
    expect(JSON.parse(String(calls('POST')[0][1].body))).toEqual({
      itinerary_id: TRIP_ID,
      day_number: 1,
      name: 'Test Café',
      location: null,
      description: null,
      time: null,
    })
    expect(await screen.findByText('Added to day 1, after Castelo')).toBeTruthy()
    await waitFor(() => expect(document.querySelector(`li[data-activity-id="${NEW_ID}"]`)).not.toBeNull())

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(calls('DELETE')).toHaveLength(1))
    expect(String(calls('DELETE')[0][0])).toBe(`/api/activities/${NEW_ID}`)
    expect(document.querySelector(`li[data-activity-id="${NEW_ID}"]`)).toBeNull()
  })

  it('keeps a failed add as Not saved yet with the DELAYED line', async () => {
    fetchMock.mockImplementation(async () => new Response('{}', { status: 500 }))
    renderBoard([activity(A, 'Castelo', 1, 1)])
    const dialog = await openForm()
    fireEvent.change(within(dialog).getByLabelText('Place name'), { target: { value: 'Test Café' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add place' }))

    expect(await screen.findByText('Not saved yet')).toBeTruthy()
    expect(screen.getByText("Couldn't save.")).toBeTruthy()
    expect(screen.getByText('Test Café')).toBeTruthy()
  })
})
