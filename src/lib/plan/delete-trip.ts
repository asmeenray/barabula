'use client'

// Delete trip with a 10 s Undo and no confirm dialog (16-17, D-27, UI-SPEC §9).
// The trip is hidden at once (HideWhenPending on the home passes) and the
// DELETE goes out only from the Undo op's commit: when the toast closes, when
// the next undoable action starts, or with keepalive when the page is left.
// Undo before then keeps the trip. A failed DELETE brings the trip back with
// "DELAYED · Couldn't delete {City}. It's back on your list." and Retry
// (TripDeleteStatus on the home). This module-level store outlives the plan
// page, because the op commits after the user has been sent back to Trips.

import { useSyncExternalStore } from 'react'
import type { UndoOp } from '@/components/undo/UndoProvider'

export interface FailedDelete {
  id: string
  city: string
}

interface State {
  /** Trips hidden from the home: waiting out the Undo window, or deleted this visit. */
  hidden: ReadonlySet<string>
  /** Deletes that failed after the window; shown with Retry. */
  failed: readonly FailedDelete[]
}

let state: State = { hidden: new Set(), failed: [] }
const listeners = new Set<() => void>()

function set(next: Partial<State>) {
  state = { ...state, ...next }
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const EMPTY: State = { hidden: new Set(), failed: [] }

/** The current hidden ids and failed deletes (server render: none). */
export function useTripDeletes(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY
  )
}

function hide(id: string, hidden: boolean) {
  const next = new Set(state.hidden)
  if (hidden) next.add(id)
  else next.delete(id)
  set({ hidden: next })
}

function setFailed(id: string, city: string | null) {
  const rest = state.failed.filter((f) => f.id !== id)
  set({ failed: city === null ? rest : [...rest, { id, city }] })
}

export function tripDeleteUrl(id: string): string {
  return `/api/itineraries/${encodeURIComponent(id)}`
}

/** True when the trip is gone on the server (deleted now, or already missing). */
async function sendDelete(id: string): Promise<boolean> {
  try {
    const res = await fetch(tripDeleteUrl(id), { method: 'DELETE' })
    return res.ok || res.status === 404
  } catch {
    return false
  }
}

export function deletedLabel(city: string): string {
  return `Deleted your ${city} trip`
}

export function failedDeleteMessage(city: string): string {
  return `Couldn't delete ${city}. It's back on your list.`
}

/**
 * Hides the trip and starts its Undo op. `refresh` re-reads the server page
 * once the outcome is known (router.refresh). No confirm dialog of any kind.
 */
export function deleteTrip(opts: {
  id: string
  city: string
  run: (op: UndoOp) => void
  refresh: () => void
}) {
  const { id, city, run, refresh } = opts
  setFailed(id, null)
  hide(id, true)
  run({
    id,
    label: deletedLabel(city),
    deferred: true,
    keepaliveRequest: { url: tripDeleteUrl(id), method: 'DELETE' },
    commit: async () => {
      if (await sendDelete(id)) {
        // Stays hidden until the refreshed home no longer lists it.
        refresh()
        return
      }
      // Safe direction (T-16-49): the trip comes back, explained by DELAYED.
      hide(id, false)
      setFailed(id, city)
      refresh()
    },
    // Nothing was sent; the trip only has to show again.
    undo: () => hide(id, false),
  })
}

/** Test seam: forget hidden and failed trips. */
export function resetTripDeletes() {
  set({ hidden: new Set(), failed: [] })
}
