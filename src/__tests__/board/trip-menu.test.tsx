import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { UndoProvider, useUndo } from '@/components/undo/UndoProvider'
import { TripMenu } from '@/components/board/TripMenu'
import { HideWhenPending } from '@/components/pass/HideWhenPending'
import { TripDeleteStatus } from '@/components/pass/TripDeleteStatus'
import { deleteTrip, resetTripDeletes } from '@/lib/plan/delete-trip'

// Delete trip (16-17, D-27): Trip actions → Delete trip goes back to Trips, the
// pass hides at once, and the DELETE is sent only when the Undo op commits.
// Undo keeps the trip; a failed DELETE brings it back with DELAYED + Retry.
// No confirm dialog anywhere.

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
}))

const LISBON = '11111111-1111-4111-8111-111111111111'
const PORTO = '22222222-2222-4222-8222-222222222222'

const fetchMock = vi.fn()
const deletes = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE').map(([url, init]) => ({ url, keepalive: !!init?.keepalive }))

/** Exposes run() so a test can start "the next undoable action". */
const handle: { run: ReturnType<typeof useUndo>['run'] } = { run: () => {} }
function Grab() {
  const { run } = useUndo()
  useEffect(() => {
    handle.run = run
  }, [run])
  return null
}
const runOp: ReturnType<typeof useUndo>['run'] = (op) => handle.run(op)

function renderHome() {
  return render(
    <UndoProvider>
      <Grab />
      <TripMenu tripId={LISBON} city="Lisbon" />
      <TripDeleteStatus />
      <HideWhenPending id={LISBON}>
        <a href={`/itinerary/${LISBON}`}>Lisbon pass</a>
      </HideWhenPending>
      <HideWhenPending id={PORTO}>
        <a href={`/itinerary/${PORTO}`}>Porto pass</a>
      </HideWhenPending>
    </UndoProvider>
  )
}

async function chooseDelete() {
  fireEvent.click(screen.getByRole('button', { name: 'Trip actions' }))
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete trip' }))
}

describe('delete trip with a 10 s Undo', () => {
  beforeEach(() => {
    resetTripDeletes()
    push.mockReset()
    refresh.mockReset()
    fetchMock.mockReset()
    fetchMock.mockImplementation(async () => new Response('{"success":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('confirm', vi.fn(() => true))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('goes back to Trips, hides the pass, toasts, sends nothing yet; Undo brings it back', async () => {
    renderHome()
    await chooseDelete()
    expect(push).toHaveBeenCalledWith('/')
    expect(screen.queryByText('Lisbon pass')).toBeNull()
    expect(screen.getByText('Porto pass')).toBeTruthy()
    expect(await screen.findByText('Deleted your Lisbon trip')).toBeTruthy()
    expect(deletes()).toEqual([])
    expect(window.confirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('Lisbon pass')).toBeTruthy()
    await new Promise((r) => setTimeout(r, 20))
    expect(deletes()).toEqual([])
  })

  it('the next undoable action commits it: one DELETE, the pass stays gone', async () => {
    renderHome()
    await chooseDelete()
    act(() => runOp({ id: 'other', label: 'Something else', commit: () => {}, undo: () => {} }))
    await waitFor(() => expect(deletes()).toEqual([{ url: `/api/itineraries/${LISBON}`, keepalive: false }]))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(screen.queryByText('Lisbon pass')).toBeNull()
  })

  it('leaving the page sends the DELETE with keepalive', async () => {
    renderHome()
    await chooseDelete()
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(deletes()).toEqual([{ url: `/api/itineraries/${LISBON}`, keepalive: true }])
  })

  it('a failed DELETE brings the trip back with DELAYED and Retry', async () => {
    fetchMock.mockImplementation(async () => new Response('{}', { status: 500 }))
    renderHome()
    await chooseDelete()
    act(() => runOp({ id: 'other', label: 'Something else', commit: () => {}, undo: () => {} }))
    expect(await screen.findByText("Couldn't delete Lisbon. It's back on your list.")).toBeTruthy()
    expect(screen.getByText('Lisbon pass')).toBeTruthy()
    expect(screen.getByText('Delayed')).toBeTruthy()

    // Retry deletes again with a new Undo window.
    fetchMock.mockImplementation(async () => new Response('{"success":true}', { status: 200 }))
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(screen.queryByText('Lisbon pass')).toBeNull()
    expect(screen.queryByText("Couldn't delete Lisbon. It's back on your list.")).toBeNull()
    expect(await screen.findByText('Deleted your Lisbon trip')).toBeTruthy()
  })

  it('a 404 counts as gone', async () => {
    fetchMock.mockImplementation(async () => new Response('{}', { status: 404 }))
    renderHome()
    act(() => deleteTrip({ id: PORTO, city: 'Porto', run: runOp, refresh }))
    act(() => runOp({ id: 'other', label: 'Something else', commit: () => {}, undo: () => {} }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(screen.queryByText('Porto pass')).toBeNull()
    expect(screen.queryByText(/Couldn't delete/)).toBeNull()
  })
})
