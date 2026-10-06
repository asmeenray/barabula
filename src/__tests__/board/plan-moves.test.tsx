import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PlanClient } from '@/components/board/PlanClient'
import { LiveRegionProvider } from '@/components/a11y/LiveRegion'
import { UndoProvider } from '@/components/undo/UndoProvider'
import type { PlanActivity, TripPlan } from '@/lib/plan/types'

// Moves from the row menu through usePlan (16-09, D-21, D-22): one PATCH of
// { day_number, position } between the new neighbours, one Undo that PATCHes
// back, and a renumbered bucket when the gap is too small.

vi.mock('@/components/map/TripMapLazy', () => ({ TripMapLazy: () => null }))

const TRIP_ID = '11111111-1111-4111-8111-111111111111'
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const D = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

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

function idsIn(day: string): string[] {
  return [...document.querySelectorAll(`[data-day="${day}"] li[data-activity-id]`)].map(
    (el) => el.getAttribute('data-activity-id') ?? ''
  )
}

function row(id: string): HTMLElement {
  return document.querySelector(`li[data-activity-id="${id}"]`) as HTMLElement
}

/** Opens the row's laptop "⋯" menu (the same RowMenu the ticket renders). */
async function openMenu(id: string, name: string) {
  fireEvent.click(within(row(id)).getByRole('button', { name: `Actions for ${name}` }))
  return screen.findByRole('menu')
}

function patches(): { id: string; body: Record<string, unknown> }[] {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'PATCH')
    .map(([url, init]) => ({ id: String(url).split('/').pop() as string, body: JSON.parse(init.body) }))
}

describe('moves from the row menu', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockImplementation(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('Move to day… → Day 2 sends one PATCH appended after day 2, toast names the place', async () => {
    renderBoard([activity(A, 'Time Out Market', 1, 1), activity(B, 'Belém Tower', 1, 2), activity(C, 'LX Factory', 2, 5)])
    const menu = await openMenu(A, 'Time Out Market')
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Move to day…' }))
    await waitFor(() => expect(screen.getAllByRole('menu')).toHaveLength(2))
    fireEvent.click(within(screen.getAllByRole('menu')[1]).getByRole('menuitem', { name: 'Day 2' }))

    await waitFor(() => expect(patches()).toEqual([{ id: A, body: { day_number: 2, position: 6 } }]))
    expect(idsIn('2')).toEqual([C, A])
    expect(screen.getByText('Moved Time Out Market to day 2')).toBeTruthy()
    // The toast is the announcement (Pitfall 11): the app live region stays quiet.
    await new Promise((r) => setTimeout(r, 80))
    expect(screen.getByTestId('live-region').textContent).toBe('')
  })

  it('Undo PATCHes the old day and position back and announces once', async () => {
    renderBoard([activity(A, 'Time Out Market', 1, 1), activity(B, 'Belém Tower', 1, 2)])
    const menu = await openMenu(A, 'Time Out Market')
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Move to Maybe' }))
    await waitFor(() => expect(patches()).toHaveLength(1))
    expect(patches()[0].body).toEqual({ day_number: null, position: 1 })
    expect(idsIn('maybe')).toEqual([A])

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(patches()).toHaveLength(2))
    expect(patches()[1]).toEqual({ id: A, body: { day_number: 1, position: 1 } })
    expect(idsIn('1')).toEqual([A, B])
    await waitFor(() =>
      expect(screen.getByTestId('live-region').textContent).toBe('Undone. Time Out Market is back on day 1.')
    )
  })

  it('Move down goes between the next two neighbours; disabled at the end of the day', async () => {
    renderBoard([activity(A, 'Time Out Market', 1, 1), activity(B, 'Belém Tower', 1, 2), activity(C, 'LX Factory', 1, 4)])
    let menu = await openMenu(A, 'Time Out Market')
    expect(within(menu).getByRole('menuitem', { name: 'Move up' }).getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Move down' }))
    await waitFor(() => expect(patches()).toEqual([{ id: A, body: { day_number: 1, position: 3 } }]))
    expect(idsIn('1')).toEqual([B, A, C])

    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    menu = await openMenu(C, 'LX Factory')
    expect(within(menu).getByRole('menuitem', { name: 'Move down' }).getAttribute('aria-disabled')).toBe('true')
  })

  it('renumbers the day first when the gap is too small, and Undo restores every position', async () => {
    renderBoard([
      activity(A, 'Time Out Market', 1, 1),
      activity(B, 'Belém Tower', 1, 2),
      activity(C, 'LX Factory', 1, 2.0000001),
      activity(D, 'MAAT', 1, 3),
    ])
    const menu = await openMenu(A, 'Time Out Market')
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Move down' }))
    // B and C are 1e-7 apart: the day (without A) becomes B=1, C=2, D=3, then A goes to 1.5.
    await waitFor(() => expect(patches()).toHaveLength(3))
    expect(patches()).toEqual([
      { id: B, body: { position: 1 } },
      { id: C, body: { position: 2 } },
      { id: A, body: { day_number: 1, position: 1.5 } },
    ])
    expect(idsIn('1')).toEqual([B, A, C, D])

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(patches()).toHaveLength(6))
    expect(patches().slice(3)).toEqual([
      { id: B, body: { position: 2 } },
      { id: C, body: { position: 2.0000001 } },
      { id: A, body: { day_number: 1, position: 1 } },
    ])
    expect(idsIn('1')).toEqual([A, B, C, D])
  })
})
