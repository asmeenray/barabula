import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { PlanClient } from '@/components/board/PlanClient'
import { LiveRegionProvider } from '@/components/a11y/LiveRegion'
import { UndoProvider } from '@/components/undo/UndoProvider'
import { DragSession, type PlanDndProps } from '@/components/board/dnd/PlanDnd'
import { DndElements } from '@/components/board/dnd/elements'
import type { PlanActivity, TripPlan } from '@/lib/plan/types'

// Drag and drop on the plan (16-14, D-22). The board half: the drag layer
// loads only when the owner can edit, rows get a named grip, the board shows
// the drag order while dragging, and a drop is one PATCH with a silent toast.
// The drag half (DragSession): drops on rows, on day tabs / headers, cancel.

vi.mock('@/components/map/TripMapLazy', () => ({ TripMapLazy: () => null }))

// @dnd-kit/dom creates a ResizeObserver when it loads; jsdom has none.
vi.hoisted(() => {
  if (!('ResizeObserver' in globalThis)) {
    ;(globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
})

// The real PlanDnd binds dnd-kit to DOM geometry jsdom does not have; the board
// test drives it through the props it hands over.
let dndProps: PlanDndProps | null = null
vi.mock('@/components/board/dnd/PlanDnd', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/components/board/dnd/PlanDnd')>()
  return {
    ...real,
    default: (props: PlanDndProps) => {
      dndProps = props
      return null
    },
  }
})

const TRIP_ID = '11111111-1111-4111-8111-111111111111'
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

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

const ROWS = () => [activity(A, 'Time Out Market', 1, 1), activity(B, 'Belém Tower', 1, 2), activity(C, 'LX Factory', 2, 5)]

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

const fetchMock = vi.fn()

function patches(): { id: string; body: Record<string, unknown> }[] {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'PATCH')
    .map(([url, init]) => ({ id: String(url).split('/').pop() as string, body: JSON.parse(init.body) }))
}

describe('drag layer on the board', () => {
  beforeEach(() => {
    dndProps = null
    fetchMock.mockReset()
    fetchMock.mockImplementation(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    // The layer waits for the map; mark it as up.
    performance.mark('barabula:map-load')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    performance.clearMarks('barabula:map-load')
  })

  it('loads after the map is up and gives every row a named grip', async () => {
    renderBoard(ROWS())
    // Before it loads, rows render as before: no grip.
    expect(screen.queryByRole('button', { name: 'Drag Time Out Market to reorder' })).toBeNull()
    await waitFor(() => expect(dndProps).not.toBeNull())
    expect(screen.getByRole('button', { name: 'Drag Time Out Market to reorder' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Drag LX Factory to reorder' })).toBeTruthy()
    expect(dndProps?.items).toEqual({ d1: [A, B], d2: [C], maybe: [] })
    expect(dndProps?.enabled).toBe(true)
    expect(dndProps?.nameOf(B)).toBe('Belém Tower')
    expect(dndProps?.positions).toEqual({ [A]: 1, [B]: 2, [C]: 5 })
  })

  it('never loads while offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    renderBoard(ROWS())
    await new Promise((r) => setTimeout(r, 400))
    expect(dndProps).toBeNull()
    expect(screen.queryByRole('button', { name: /^Drag / })).toBeNull()
  })

  it('shows the drag order while dragging and the stored order after', async () => {
    renderBoard(ROWS())
    await waitFor(() => expect(dndProps).not.toBeNull())
    act(() => dndProps?.onOrder({ d1: [B], d2: [A, C], maybe: [] }))
    expect(idsIn('1')).toEqual([B])
    expect(idsIn('2')).toEqual([A, C])
    act(() => dndProps?.onOrder(null))
    expect(idsIn('1')).toEqual([A, B])
    expect(idsIn('2')).toEqual([C])
    expect(patches()).toEqual([])
  })

  it('a drop is one PATCH between the new neighbours, with a silent Undo toast', async () => {
    renderBoard(ROWS())
    await waitFor(() => expect(dndProps).not.toBeNull())
    act(() => dndProps?.onDrop(A, 2, 0))
    await waitFor(() => expect(patches()).toEqual([{ id: A, body: { day_number: 2, position: 4 } }]))
    expect(idsIn('2')).toEqual([A, C])
    expect(await screen.findByText('Moved Time Out Market to day 2')).toBeTruthy()
    // dnd-kit announced the drop; the toast is not read out again (Pitfall 11).
    expect(screen.getByLabelText('Notifications').getAttribute('aria-live')).toBe('off')
  })
})

// --- DragSession: the drag maths behind the dnd-kit handlers -------------------

type Target = { id: string; type: string; shape?: undefined } | null

function event(source: string | null, target: Target, canceled = false) {
  return {
    operation: {
      source:
        source === null
          ? null
          : { id: source, manager: { dragOperation: { shape: null, position: { current: { x: 0, y: 0 } } } } },
      target,
    },
    canceled,
    preventDefault: () => {},
  } as never
}

const row = (id: string): Target => ({ id, type: 'place' })
const day = (bucket: string): Target => ({ id: `tab-${bucket}`, type: 'day' })

function session(items: Record<string, string[]>) {
  const onOrder = vi.fn()
  const onDrop = vi.fn()
  const names: Record<string, string> = { a: 'Time Out Market', b: 'Belém Tower', c: 'LX Factory', m: 'MAAT' }
  const props: PlanDndProps = {
    items,
    layout: 'laptop',
    visible: 'd1',
    elements: new DndElements(),
    nameOf: (id) => names[id] ?? id,
    positions: { a: 1, b: 2, c: 1, m: 1 },
    enabled: true,
    locked: () => false,
    onOrder,
    onDrop,
  }
  const s = new DragSession(props)
  const handlers = s as unknown as {
    onDragStart: (e: unknown) => void
    onDragOver: (e: unknown) => void
    onDragEnd: (e: unknown) => void
  }
  return { s, handlers, onOrder, onDrop }
}

describe('DragSession', () => {
  it('reorders inside a day and drops at the new stop', () => {
    const { handlers, onOrder, onDrop } = session({ d1: ['a', 'b'], d2: ['c'], maybe: [] })
    handlers.onDragStart(event('a', null))
    handlers.onDragOver(event('a', row('b')))
    expect(onOrder).toHaveBeenLastCalledWith({ d1: ['b', 'a'], d2: ['c'], maybe: [] })
    handlers.onDragEnd(event('a', row('a')))
    expect(onOrder).toHaveBeenLastCalledWith(null)
    expect(onDrop).toHaveBeenCalledWith('a', 1, 1)
  })

  it('a drop on another day’s tab or header appends it to that day', () => {
    const { handlers, onOrder, onDrop } = session({ d1: ['a', 'b'], d2: ['c'], maybe: ['m'] })
    handlers.onDragStart(event('a', null))
    // Over the tab: highlighted only, the board order does not change yet.
    handlers.onDragOver(event('a', day('d2')))
    expect(onOrder).not.toHaveBeenCalled()
    handlers.onDragEnd(event('a', day('d2')))
    expect(onDrop).toHaveBeenCalledWith('a', 2, 1)
  })

  it('a drop on MAYBE appends to Maybe', () => {
    const { handlers, onDrop } = session({ d1: ['a', 'b'], d2: ['c'], maybe: ['m'] })
    handlers.onDragStart(event('b', null))
    handlers.onDragEnd(event('b', day('maybe')))
    expect(onDrop).toHaveBeenCalledWith('b', null, 1)
  })

  it('its own day’s header keeps the new stop instead of sending it to the end', () => {
    const { handlers, onDrop } = session({ d1: ['a', 'b'], d2: ['c'], maybe: [] })
    handlers.onDragStart(event('b', null))
    handlers.onDragOver(event('b', row('a')))
    handlers.onDragEnd(event('b', day('d1')))
    expect(onDrop).toHaveBeenCalledWith('b', 1, 0)
  })

  it('cancel puts the order back and sends nothing', () => {
    const { handlers, onOrder, onDrop } = session({ d1: ['a', 'b'], d2: ['c'], maybe: [] })
    handlers.onDragStart(event('a', null))
    handlers.onDragOver(event('a', row('b')))
    handlers.onDragEnd(event('a', row('a'), true))
    expect(onOrder).toHaveBeenLastCalledWith(null)
    expect(onDrop).not.toHaveBeenCalled()
  })

  it('a drop back where it started sends nothing', () => {
    const { handlers, onDrop } = session({ d1: ['a', 'b'], d2: ['c'], maybe: [] })
    handlers.onDragStart(event('a', null))
    handlers.onDragEnd(event('a', row('a')))
    expect(onDrop).not.toHaveBeenCalled()
  })

  it('announces pick-up, landing and cancel in place words', () => {
    const { s, handlers } = session({ d1: ['a', 'b'], d2: ['c'], maybe: [] })
    // The Accessibility plugin config built once in the constructor.
    const descriptor = (s.plugins as (d: unknown[]) => { options?: { announcements: Record<string, (e: unknown) => string> } }[])([])
    const { announcements } = descriptor.find((p) => p.options?.announcements)?.options ?? { announcements: {} }
    expect(announcements.dragstart(event('b', null))).toBe('Picked up Belém Tower, day 1, stop 2.')
    handlers.onDragStart(event('b', null))
    expect(announcements.dragover(event('b', day('d2')))).toBe('Belém Tower: day 2, stop 2.')
    expect(announcements.dragend(event('b', day('d2')))).toBe('Belém Tower moved to day 2, position 2.')
    expect(announcements.dragend(event('b', day('d2'), true))).toBe('Move cancelled. Belém Tower is back on day 1, stop 2.')
    expect(announcements.dragend(event('b', day('maybe')))).toBe('Belém Tower moved to Maybe.')
  })
})
