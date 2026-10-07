'use client'

// Map lookups for the trip plan (16-11, D-23, D-24). Only the server-side
// Nominatim routes are called; the browser never geocodes and never talks to
// any geocoder itself (T-16-34).
// - On open (after the map is ready, owner online): POST the batch route while
//   places remain and the last call made progress. Places waiting for it read
//   "Finding on map…".
// - geocodeOne(id): the single route, after an add or an address change, and
//   for "Find on map". A failed manual retry (not found, or no address)
//   is remembered so the ticket can say "Still not on map. Add an address
//   with Edit place."

import { useCallback, useEffect, useRef, useState } from 'react'
import { OSM_GEO_SOURCE, needsGeocoding } from '@/lib/geo-cache'
import { isTempId } from './use-plan'
import type { PlanActivity } from './types'

/** Safety stop for the batch loop (20 places per call on the server). */
const MAX_BATCH_ROUNDS = 10

const EMPTY: ReadonlySet<string> = new Set()

type ExtraPatcher = (id: string, set: Record<string, unknown>, remove?: readonly string[]) => void

interface BatchAnswer {
  pins: { id: string; lat: number; lng: number }[]
  remaining: number
  not_found?: string[]
}

type OneAnswer =
  | { status: 'hit'; lat: number; lng: number }
  | { status: 'not_found' }
  | { status: 'no_location' }
  | { status: 'error' }

export interface UseGeocodeOptions {
  /** Start the batch lookup (the map has mounted). */
  start: boolean
  /** Local-only extra_data merge from usePlan. */
  patchLocalExtra: ExtraPatcher
}

/** Waiting for a lookup: has an address, not cached, not known to be missing. */
export function awaitingLookup(a: Pick<PlanActivity, 'id' | 'location' | 'extra_data'>): boolean {
  return !isTempId(a.id) && !!a.location?.trim() && needsGeocoding(a.extra_data)
}

function withIds(set: ReadonlySet<string>, ids: readonly string[], add: boolean): ReadonlySet<string> {
  const next = new Set(set)
  for (const id of ids) {
    if (add) next.add(id)
    else next.delete(id)
  }
  return next
}

export function useGeocode(
  tripId: string,
  activities: readonly PlanActivity[],
  canEdit: boolean,
  { start, patchLocalExtra }: UseGeocodeOptions
) {
  const [finding, setFinding] = useState<ReadonlySet<string>>(EMPTY)
  const [stillOff, setStillOff] = useState<ReadonlySet<string>>(EMPTY)
  const latest = useRef(activities)
  const batchRan = useRef(false)

  useEffect(() => {
    latest.current = activities
  }, [activities])

  const hit = useCallback(
    (id: string, lat: number, lng: number) =>
      patchLocalExtra(id, { lat, lng, geo_source: OSM_GEO_SOURCE }, ['geo_status']),
    [patchLocalExtra]
  )
  const miss = useCallback((id: string) => patchLocalExtra(id, { geo_status: 'not_found' }), [patchLocalExtra])

  // Batch lookup once per page, after the map is up (it never competes with it, Q46).
  useEffect(() => {
    if (!start || !canEdit || batchRan.current) return
    const ids = latest.current.filter(awaitingLookup).map((a) => a.id)
    batchRan.current = true
    if (ids.length === 0) return
    const waiting = new Set(ids)
    setFinding((prev) => withIds(prev, ids, true))

    void (async () => {
      try {
        for (let round = 0; round < MAX_BATCH_ROUNDS; round++) {
          const res = await fetch(`/api/itineraries/${encodeURIComponent(tripId)}/geocode`, { method: 'POST' })
          if (!res.ok) break
          const body = (await res.json()) as BatchAnswer
          const done: string[] = []
          for (const pin of body.pins) {
            if (!waiting.has(pin.id)) continue
            hit(pin.id, pin.lat, pin.lng)
            done.push(pin.id)
          }
          for (const id of body.not_found ?? []) {
            if (!waiting.has(id)) continue
            miss(id)
            done.push(id)
          }
          for (const id of done) waiting.delete(id)
          if (done.length > 0) setFinding((prev) => withIds(prev, done, false))
          // Stop when nothing is left, or the last call made no progress (rate limit, kill switch).
          if (body.remaining <= 0 || done.length === 0) break
        }
      } catch {
        // Offline or the server failed: the places stay as they are; a later visit retries.
      } finally {
        setFinding((prev) => withIds(prev, ids, false))
      }
    })()
  }, [start, canEdit, tripId, hit, miss])

  /**
   * Looks up one place now. `manual` = the user pressed "Find on map": a miss
   * then shows the "Still not on map" line.
   */
  const geocodeOne = useCallback(
    async (id: string, { manual = false }: { manual?: boolean } = {}) => {
      if (isTempId(id)) return
      setFinding((prev) => withIds(prev, [id], true))
      setStillOff((prev) => (prev.has(id) ? withIds(prev, [id], false) : prev))
      let answer: OneAnswer = { status: 'error' }
      try {
        const res = await fetch(`/api/activities/${encodeURIComponent(id)}/geocode`, { method: 'POST' })
        if (res.ok) answer = (await res.json()) as OneAnswer
      } catch {
        // Offline: treated like a server error (nothing changes).
      }
      if (answer.status === 'hit') hit(id, answer.lat, answer.lng)
      else if (answer.status === 'not_found') miss(id)
      if (manual && (answer.status === 'not_found' || answer.status === 'no_location')) {
        setStillOff((prev) => withIds(prev, [id], true))
      }
      setFinding((prev) => withIds(prev, [id], false))
      return answer.status
    },
    [hit, miss]
  )

  return { finding, stillOff, geocodeOne }
}
