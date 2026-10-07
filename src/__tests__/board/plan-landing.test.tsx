import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PlanClient } from '@/components/board/PlanClient'
import { LiveRegionProvider } from '@/components/a11y/LiveRegion'
import { UndoProvider } from '@/components/undo/UndoProvider'
import { LIT_MS } from '@/lib/plan/use-plan'
import type { PlanActivity, TripPlan } from '@/lib/plan/types'

// Moment 2 "place lands in plan" (16-22, D-30) on the board: the new row is
// lit for 6 s, keeps its DOM element when the saved id arrives (no remount
// mid-landing), and Undo takes the light off with the row.

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

function lit(): Element[] {
  return [...document.querySelectorAll('li[data-lit]')]
}

describe('a new place lands lit', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    let release: (() => void) | null = null
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body))
        // Hold the answer until the test lets it through.
        await new Promise<void>((resolve) => {
          release = resolve
        })
        return new Response(JSON.stringify({ ...activity(NEW_ID, body.name, body.day_number, 2), ...body, id: NEW_ID }), {
          status: 201,
        })
      }
      return new Response('{}', { status: 200 })
    })
    ;(globalThis as { releasePost?: () => void }).releasePost = () => release?.()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  async function add(name: string) {
    fireEvent.click(screen.getAllByRole('button', { name: 'Add place' })[0])
    const dialog = await screen.findByRole('dialog', { name: 'Add a place' })
    fireEvent.change(within(dialog).getByLabelText('Place name'), { target: { value: name } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add place' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
  }

  it('lights the new row only, keeps its element when the saved id arrives, and turns off after 6 s', async () => {
    // Fake clock from the start (the 6 s timer is set at the add). It also runs on its own
    // (waitFor needs that), so the checks leave 1.5 s of slack for a slow machine.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderBoard([activity(A, 'Castelo', 1, 1)])
    await add('Test Café')

    expect(lit()).toHaveLength(1)
    const row = lit()[0]
    expect(row.textContent).toContain('Test Café')
    expect(row.className).toContain('color-mix(in_srgb,var(--accent)_18%,transparent)')
    expect(document.querySelector(`li[data-activity-id="${A}"]`)?.hasAttribute('data-lit')).toBe(false)

    await act(async () => {
      ;(globalThis as { releasePost?: () => void }).releasePost?.()
    })
    await waitFor(() => expect(document.querySelector(`li[data-activity-id="${NEW_ID}"]`)).not.toBeNull())
    // Same element: the row was not remounted when its id changed.
    expect(document.querySelector(`li[data-activity-id="${NEW_ID}"]`)).toBe(row)
    expect(row.hasAttribute('data-lit')).toBe(true)

    await act(async () => {
      vi.advanceTimersByTime(LIT_MS - 1500)
    })
    expect(row.hasAttribute('data-lit')).toBe(true)
    await act(async () => {
      vi.advanceTimersByTime(1600)
    })
    expect(lit()).toHaveLength(0)
  })

  it('Undo removes the row and its light', async () => {
    renderBoard([activity(A, 'Castelo', 1, 1)])
    await add('Test Café')
    await act(async () => {
      ;(globalThis as { releasePost?: () => void }).releasePost?.()
    })
    await waitFor(() => expect(document.querySelector(`li[data-activity-id="${NEW_ID}"]`)).not.toBeNull())
    fireEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(document.querySelector(`li[data-activity-id="${NEW_ID}"]`)).toBeNull())
    expect(lit()).toHaveLength(0)
  })

  it('a page load lights nothing', async () => {
    renderBoard([activity(A, 'Castelo', 1, 1)])
    expect(lit()).toHaveLength(0)
  })
})
