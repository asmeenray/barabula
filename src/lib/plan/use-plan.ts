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
// Remove from trip hides the row at once and holds the DELETE until the Undo
// toast closes (D-27 pattern); if it then fails, the row comes back with the
// DELAYED line, so a failure never loses data.
// Add place (16-11, D-18) shows the row at once with a temporary id, POSTs it
// (the server picks the final position) and swaps in the saved row. Its Undo
// removes the row and DELETEs the created id; a failed POST keeps the row as
// "Not saved yet" and Retry sends it again.

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

/** A place typed into the place form (16-11). */
export interface NewPlace {
  /** null = Maybe. */
  day_number: number | null
  name: string
  location: string | null
  description: string | null
  time: string | null
  fixed_time: boolean
}

/** POST /api/activities body (mirrors ActivityCreateSchema). */
interface CreateBody {
  itinerary_id: string
  day_number: number | null
  name: string
  location: string | null
  description: string | null
  time: string | null
  extra_data?: { fixed_time: boolean }
}

const TEMP_PREFIX = 'new-'

/** Rows added on this page that the server has not confirmed yet. */
export function isTempId(id: string): boolean {
  return id.startsWith(TEMP_PREFIX)
}

let tempSeq = 0
function tempId(): string {
  tempSeq += 1
  return `${TEMP_PREFIX}${Date.now().toString(36)}-${tempSeq}`
}

/** Cached map keys in extra_data; the server drops them when the location changes (Pitfall 6). */
export const GEO_KEYS = ['lat', 'lng', 'geo_source', 'geo_status', 'geocoded_at'] as const

/** "14:30" from a stored time ("14:30" or "14:30:00"); null for anything else. */
export function clockOf(time: string | null): string | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(time?.trim() ?? '')
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}

/**
 * The PATCH for an edit: only what changed. Duration and tips are never sent
 * (the form does not edit them). A stored time is left alone unless the
 * "Set time" switch is on; turning it off only clears the fixed_time flag.
 */
export function editPatch(a: PlanActivity, place: NewPlace): ActivityUpdate {
  const patch: ActivityUpdate = {}
  if (place.name !== a.name) patch.name = place.name
  if (place.location !== (a.location?.trim() || null)) patch.location = place.location
  if (place.description !== (a.description?.trim() || null)) patch.description = place.description
  const wasFixed = a.extra_data?.fixed_time === true
  if (place.fixed_time) {
    if (place.time !== clockOf(a.time)) patch.time = place.time
    if (!wasFixed) patch.extra_data = { fixed_time: true }
  } else if (wasFixed) {
    patch.extra_data = { fixed_time: false }
  }
  return patch
}

/** Undo toast text for an add (UI-SPEC Copywriting "Undo toasts"). */
export function addedLabel(day: number | null, lastInDay: string | null): string {
  if (day === null) return 'Added to Maybe'
  return lastInDay ? `Added to day ${day}, after ${lastInDay}` : `Added to day ${day}`
}

async function sendCreate(body: CreateBody): Promise<PlanActivity | null> {
  try {
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return (await res.json()) as PlanActivity
  } catch {
    return null
  }
}

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

export function activityUrl(id: string): string {
  return `/api/activities/${encodeURIComponent(id)}`
}

/** True when the row is gone on the server (deleted now, or already missing). */
async function sendDelete(id: string): Promise<boolean> {
  try {
    const res = await fetch(activityUrl(id), { method: 'DELETE' })
    return res.ok || res.status === 404
  } catch {
    return false
  }
}

async function sendUpdate(id: string, update: ActivityUpdate): Promise<boolean> {
  try {
    const res = await fetch(activityUrl(id), {
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
  /** Rows removed on screen whose DELETE is held for the Undo window. */
  const removed = useRef(new Map<string, PlanActivity>())
  /** Removals whose DELETE failed; Retry removes them again (with Undo). */
  const failedRemovals = useRef(new Set<string>())
  /** Adds whose POST failed, by temporary id; Retry sends them again. */
  const failedCreates = useRef(new Map<string, CreateBody>())
  /** Adds undone before their POST answered; the created row is deleted. */
  const cancelledCreates = useRef(new Set<string>())
  /** Saved rows per temporary id, so an Undo after the save deletes the real id. */
  const createdRows = useRef(new Map<string, PlanActivity>())

  const settled = useCallback(
    () => pending.current.size === 0 && failedRemovals.current.size === 0 && failedCreates.current.size === 0,
    []
  )

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
      else if (settled()) setFailed(false)
      return ok
    },
    [save, settled]
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
      else if (settled()) setFailed(false)
      return allSaved
    },
    [save, settled]
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

  /** One step up / down inside the place's own bucket; no-op at the ends. */
  const moveBy = useCallback(
    (id: string, step: -1 | 1) => {
      const a = activities.find((x) => x.id === id)
      if (!a) return
      const bucket = bucketOf(activities, a.day_number)
      const index = bucket.findIndex((x) => x.id === id)
      const to = index + step
      if (index < 0 || to < 0 || to >= bucket.length) return
      moveActivity(id, a.day_number, to)
    },
    [activities, moveActivity]
  )
  const moveUp = useCallback((id: string) => moveBy(id, -1), [moveBy])
  const moveDown = useCallback((id: string) => moveBy(id, 1), [moveBy])

  /** Puts a removed row back on the board. */
  const restore = useCallback((id: string) => {
    const row = removed.current.get(id)
    if (!row) return
    removed.current.delete(id)
    setActivities((prev) => (prev.some((a) => a.id === id) ? prev : sortActivities([...prev, row])))
  }, [])

  /** Hides the place now; the DELETE goes out when the Undo toast closes. */
  const removeActivity = useCallback(
    (id: string) => {
      const a = activities.find((x) => x.id === id)
      if (!a) return
      removed.current.set(id, a)
      failedRemovals.current.delete(id)
      setActivities((prev) => prev.filter((x) => x.id !== id))
      undo.run({
        id,
        label: `Removed ${a.name}`,
        deferred: true,
        keepaliveRequest: { url: activityUrl(id), method: 'DELETE' },
        commit: async () => {
          if (await sendDelete(id)) {
            removed.current.delete(id)
            return
          }
          // Safe direction (T-16-25): the place comes back, explained by DELAYED.
          restore(id)
          failedRemovals.current.add(id)
          setFailed(true)
        },
        undo: () => {
          restore(id)
          announce(`Undone. ${a.name} is back ${where(a.day_number)}.`)
        },
      })
    },
    [activities, undo, restore, announce]
  )

  /** POSTs an add; swaps the temporary row for the saved one, or marks it unsaved. */
  const create = useCallback(
    (temp: string, body: CreateBody): Promise<PlanActivity | null> => {
      const run = sendCreate(body).then((row) => {
        if (cancelledCreates.current.has(temp)) {
          cancelledCreates.current.delete(temp)
          // Undone while the POST was in flight: remove what was created.
          if (row) void sendDelete(row.id)
          return null
        }
        if (!row) {
          failedCreates.current.set(temp, body)
          markUnsaved(temp, false)
          setFailed(true)
          return null
        }
        createdRows.current.set(temp, row)
        failedCreates.current.delete(temp)
        markUnsaved(temp, true)
        setActivities((prev) => sortActivities(prev.map((a) => (a.id === temp ? row : a))))
        if (settled()) setFailed(false)
        return row
      })
      return run
    },
    [markUnsaved, settled]
  )

  /**
   * Adds a place at the end of its day (or Maybe) at once and saves it.
   * One Undo toast removes it again. Resolves with the saved row, or null
   * when the save failed or was undone.
   */
  const addActivity = useCallback(
    (place: NewPlace): Promise<PlanActivity | null> => {
      const bucket = bucketOf(activities, place.day_number)
      const last = bucket.at(-1)
      const temp = tempId()
      const fixed = place.fixed_time && place.time !== null
      const row: PlanActivity = {
        id: temp,
        itinerary_id: initial.trip.id,
        day_number: place.day_number,
        position: (last?.position ?? bucket.length) + 1,
        name: place.name,
        time: place.time,
        description: place.description,
        location: place.location,
        activity_type: null,
        extra_data: fixed ? { fixed_time: true } : {},
        duration: null,
        tips: null,
      }
      const body: CreateBody = {
        itinerary_id: initial.trip.id,
        day_number: place.day_number,
        name: place.name,
        location: place.location,
        description: place.description,
        time: place.time,
        ...(fixed ? { extra_data: { fixed_time: true } } : {}),
      }
      setActivities((prev) => sortActivities([...prev, row]))
      const saved = create(temp, body)

      undo.run({
        id: temp,
        label: addedLabel(place.day_number, last?.name ?? null),
        commit: () => {},
        undo: () => {
          // Hide it now; whatever the POST does next, the add is cancelled.
          const wasFailed = failedCreates.current.delete(temp)
          markUnsaved(temp, true)
          setActivities((prev) => prev.filter((a) => a.id !== temp))
          if (settled()) setFailed(false)
          const created = createdRows.current.get(temp)
          if (!created) {
            // Still in flight: create deletes it when it answers. Failed: nothing to delete.
            if (!wasFailed) cancelledCreates.current.add(temp)
            return
          }
          createdRows.current.delete(temp)
          setActivities((prev) => prev.filter((a) => a.id !== created.id))
          void sendDelete(created.id).then((gone) => {
            if (gone) return
            // Safe direction: the place comes back, explained by DELAYED; Retry removes it.
            setActivities((prev) => (prev.some((a) => a.id === created.id) ? prev : sortActivities([...prev, created])))
            failedRemovals.current.add(created.id)
            setFailed(true)
          })
        },
      })
      return saved
    },
    [activities, initial.trip.id, create, undo, markUnsaved, settled]
  )

  /** Local-only extra_data change (map lookups, cleared geo keys); nothing is sent. */
  const patchLocalExtra = useCallback(
    (id: string, set: Record<string, unknown>, remove: readonly string[] = []) => {
      setActivities((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a
          const extra: Record<string, unknown> = { ...(a.extra_data ?? {}), ...set }
          for (const key of remove) delete extra[key]
          return { ...a, extra_data: extra }
        })
      )
    },
    []
  )

  /**
   * Saves the place form in edit mode (one PATCH of what changed; a new day
   * appends the place to that day's end). No Undo toast: Discard changes is
   * the way back before saving. A changed address clears the cached
   * coordinates here too, so the place is looked up again.
   */
  const editActivity = useCallback(
    async (id: string, place: NewPlace): Promise<{ saved: boolean; locationChanged: boolean }> => {
      const a = activities.find((x) => x.id === id)
      if (!a) return { saved: false, locationChanged: false }
      const update = editPatch(a, place)
      const changes: Change[] = []
      if (place.day_number !== a.day_number) {
        const target = bucketOf(activities, place.day_number, id)
        const { position, renumber } = placeAt(target, target.length)
        changes.push(...renumber)
        update.day_number = place.day_number
        update.position = position
      }
      const locationChanged = update.location !== undefined
      if (Object.keys(update).length === 0) return { saved: true, locationChanged: false }
      changes.push({ id, update })
      if (locationChanged) patchLocalExtra(id, {}, GEO_KEYS)
      const saved = await applyChanges(changes)
      return { saved, locationChanged }
    },
    [activities, applyChanges, patchLocalExtra]
  )

  const retry = useCallback(async () => {
    // Adds that failed are sent again.
    for (const [temp, body] of [...failedCreates.current.entries()]) {
      failedCreates.current.delete(temp)
      void create(temp, body)
    }
    // A removal that failed is offered again, with its own Undo.
    const removals = [...failedRemovals.current]
    failedRemovals.current.clear()
    for (const id of removals) removeActivity(id)
    const entries = [...pending.current.entries()]
    // Retrying an entry merges it with itself; pass an empty update.
    const results = await Promise.all(entries.map(([id]) => save(id, {})))
    setFailed(results.some((ok) => !ok) || !settled())
  }, [save, removeActivity, create, settled])

  const error: PlanError | null = useMemo(
    () => (failed ? { message: SAVE_ERROR, retry: () => void retry() } : null),
    [failed, retry]
  )

  return {
    activities,
    addActivity,
    editActivity,
    patchLocalExtra,
    updateActivity,
    moveActivity,
    moveUp,
    moveDown,
    removeActivity,
    unsaved,
    error,
  }
}
