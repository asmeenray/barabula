'use client'

// Client state for the trip plan board (16-07). Edits apply at once
// (optimistic) and are sent to PATCH /api/activities/{id}. A failed save keeps
// the local change, marks the row "Not saved yet" and raises one DELAYED line
// whose Retry resends every unsaved patch (UI-SPEC Interaction States, D-33).
// Saves for the same place go out in order, so a quick double toggle can't
// land out of order on the server.
// Moves (16-09, D-22) are one PATCH { day_number, position } with the position
// halfway between the new neighbours, and one Undo toast; the toast is the
// announcement (Pitfall 11), so only Undo writes to the live region.

import { useCallback, useMemo, useRef, useState } from 'react'
import { useAnnounce } from '@/components/a11y/LiveRegion'
import { useUndo } from '@/components/undo/UndoProvider'
import { sortActivities } from './days'
import { needsRenumber, positionBetween, renumberDay } from './ordering'
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

/** One local + server change; a move may carry several (a renumbered bucket). */
interface Change {
  id: string
  update: ActivityUpdate
}

/** Rows of one bucket (a day, or Maybe when day is null) in plan order. */
function bucketOf(activities: readonly PlanActivity[], day: number | null, exceptId?: string): PlanActivity[] {
  return sortActivities(activities.filter((a) => a.day_number === day && a.id !== exceptId))
}

/**
 * Where a row lands at index `at` of `bucket` (which does not contain it).
 * When the gap is too small, or a neighbour has no position, the bucket is
 * renumbered 1…n first; those changes go out before the move.
 */
function placeAt(bucket: readonly PlanActivity[], at: number): { position: number; renumber: Change[] } {
  const i = Math.max(0, Math.min(at, bucket.length))
  const prev = bucket[i - 1]
  const next = bucket[i]
  const broken =
    (prev !== undefined && prev.position === null) ||
    (next !== undefined && next.position === null) ||
    (prev?.position != null && next?.position != null && needsRenumber(prev.position, next.position))
  if (!broken) return { position: positionBetween(prev?.position ?? null, next?.position ?? null), renumber: [] }

  const numbered = renumberDay(bucket.map((a) => a.id))
  const renumber = numbered
    .filter((n, k) => bucket[k].position !== n.position)
    .map((n) => ({ id: n.id, update: { position: n.position } }))
  return {
    position: positionBetween(numbered[i - 1]?.position ?? null, numbered[i]?.position ?? null),
    renumber,
  }
}

function where(day: number | null): string {
  return day === null ? 'in Maybe' : `on day ${day}`
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
  const undo = useUndo()
  const announce = useAnnounce()
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

  /** Applies several changes locally at once, then saves them one after another. */
  const applyChanges = useCallback(
    async (changes: readonly Change[]): Promise<boolean> => {
      const byId = new Map(changes.map((c) => [c.id, c.update]))
      setActivities((prev) =>
        sortActivities(prev.map((a) => (byId.has(a.id) ? applyUpdate(a, byId.get(a.id) as ActivityUpdate) : a)))
      )
      let allSaved = true
      for (const c of changes) {
        if (!(await save(c.id, c.update))) allSaved = false
      }
      if (!allSaved) setFailed(true)
      else if (pending.current.size === 0) setFailed(false)
      return allSaved
    },
    [save]
  )

  /**
   * Moves a place to a day (1…n) or to Maybe (null), at `toIndex` in that
   * bucket (appended when omitted). One Undo toast puts it back exactly.
   */
  const moveActivity = useCallback(
    (id: string, toDay: number | null, toIndex?: number) => {
      const a = activities.find((x) => x.id === id)
      if (!a) return
      const sameBucket = a.day_number === toDay
      if (sameBucket && toIndex === undefined) return

      const target = bucketOf(activities, toDay, id)
      const at = toIndex ?? target.length
      if (sameBucket && bucketOf(activities, toDay).findIndex((x) => x.id === id) === at) return

      const { position, renumber } = placeAt(target, at)
      const changes: Change[] = [...renumber, { id, update: { day_number: toDay, position } }]
      const before = new Map(activities.map((x) => [x.id, { day_number: x.day_number, position: x.position }]))
      const inverse: Change[] = changes.map((c) => {
        const b = before.get(c.id) as { day_number: number | null; position: number | null }
        // A stored null position can't be sent back (positions are finite); the
        // bucket's last slot keeps it at the end, where null sorts.
        const position = b.position ?? (bucketOf(activities, b.day_number).at(-1)?.position ?? 0) + 1
        return { id: c.id, update: c.id === id ? { day_number: b.day_number, position } : { position } }
      })

      void applyChanges(changes)
      undo.run({
        id,
        label: toDay === null ? `Moved ${a.name} to Maybe` : `Moved ${a.name} to day ${toDay}`,
        commit: () => {},
        undo: () => {
          void applyChanges(inverse)
          announce(`Undone. ${a.name} is back ${where(a.day_number)}.`)
        },
      })
    },
    [activities, applyChanges, undo, announce]
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

  return { activities, updateActivity, moveActivity, unsaved, error }
}
