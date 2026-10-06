'use client'

// Client state for the trip plan board (16-07). Edits apply at once
// (optimistic) and are sent to PATCH /api/activities/{id}. A failed save keeps
// the local change, marks the row "Not saved yet" and raises one DELAYED line
// whose Retry resends every unsaved patch (UI-SPEC Interaction States, D-33).
// Saves for the same place go out in order, so a quick double toggle can't
// land out of order on the server.

import { useCallback, useMemo, useRef, useState } from 'react'
import { sortActivities } from './days'
import type { PlanActivity, TripPlan } from './types'

/** What the client may change on an activity (mirrors ActivityPatchSchema). */
export interface ActivityUpdate {
  name?: string
  time?: string | null
  description?: string | null
  location?: string | null
  day_number?: number | null
  position?: number
  duration?: string | null
  tips?: string | null
  extra_data?: { visited?: boolean; fixed_time?: boolean }
}

export interface PlanError {
  message: string
  retry: () => void
}

export const SAVE_ERROR = "Couldn't save."

function mergeUpdates(a: ActivityUpdate | undefined, b: ActivityUpdate): ActivityUpdate {
  if (!a) return b
  const merged: ActivityUpdate = { ...a, ...b }
  if (a.extra_data || b.extra_data) merged.extra_data = { ...a.extra_data, ...b.extra_data }
  return merged
}

function applyUpdate(activity: PlanActivity, update: ActivityUpdate): PlanActivity {
  const { extra_data, ...columns } = update
  const next: PlanActivity = { ...activity, ...columns }
  if (extra_data) next.extra_data = { ...(activity.extra_data ?? {}), ...extra_data }
  return next
}

async function sendUpdate(id: string, update: ActivityUpdate): Promise<boolean> {
  try {
    const res = await fetch(`/api/activities/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
    return res.ok
  } catch {
    return false
  }
}

export function usePlan(initial: TripPlan) {
  const [activities, setActivities] = useState<PlanActivity[]>(() => sortActivities(initial.activities))
  const [unsaved, setUnsaved] = useState<ReadonlySet<string>>(() => new Set())
  const [failed, setFailed] = useState(false)

  /** Patches that failed to save, per activity id (merged, latest wins). */
  const pending = useRef(new Map<string, ActivityUpdate>())
  /** Last save in flight per id; the next save for that id waits for it. */
  const queue = useRef(new Map<string, Promise<unknown>>())

  const markUnsaved = useCallback((id: string, saved: boolean) => {
    setUnsaved((prev) => {
      if (prev.has(id) === !saved) return prev
      const next = new Set(prev)
      if (saved) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  /** Sends one id's patch after any earlier save for it; returns whether it saved. */
  const save = useCallback(
    (id: string, update: ActivityUpdate): Promise<boolean> => {
      const before = queue.current.get(id) ?? Promise.resolve()
      const run = before.then(async () => {
        // Anything still unsaved for this id goes along, so no earlier change is lost.
        const body = mergeUpdates(pending.current.get(id), update)
        const ok = await sendUpdate(id, body)
        if (ok) pending.current.delete(id)
        else pending.current.set(id, body)
        markUnsaved(id, ok)
        return ok
      })
      queue.current.set(id, run)
      return run
    },
    [markUnsaved]
  )

  const updateActivity = useCallback(
    async (id: string, update: ActivityUpdate): Promise<boolean> => {
      setActivities((prev) => sortActivities(prev.map((a) => (a.id === id ? applyUpdate(a, update) : a))))
      const ok = await save(id, update)
      if (!ok) setFailed(true)
      else if (pending.current.size === 0) setFailed(false)
      return ok
    },
    [save]
  )

  const retry = useCallback(async () => {
    const entries = [...pending.current.entries()]
    // Retrying an entry merges it with itself; pass an empty update.
    const results = await Promise.all(entries.map(([id]) => save(id, {})))
    setFailed(results.some((ok) => !ok) || pending.current.size > 0)
  }, [save])

  const error: PlanError | null = useMemo(
    () => (failed ? { message: SAVE_ERROR, retry: () => void retry() } : null),
    [failed, retry]
  )

  return { activities, updateActivity, unsaved, error }
}
