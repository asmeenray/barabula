// Moment 4 "trip opens from its pass" (16-22, D-30, UI-SPEC Motion): names
// and the one bit of state the pass → plan morph needs.
//
// The pass cover and the plan header strip share the view-transition name
// trip-cover-{id} (React <ViewTransition share="morph">). Names are built from
// the trip's uuid only, never from user text (T-16-60).
//
// The plan holds its header photo until the map is up (Q46 map budget). When
// the plan was opened from a pass, that photo is already in the browser, and
// holding it would make the morph end on the blur; markTripOpen lets the plan
// show it at once. Client memory only: a direct load never sees it.

import { isUuid } from '@/lib/uuid'

/** Transition type on the pass links and Start planning (Link transitionTypes / router.push). */
export const TRIP_OPEN = 'trip-open'

/** The shared view-transition name for a trip's cover; undefined for anything that isn't a uuid. */
export function coverTransitionName(id: string): string | undefined {
  return isUuid(id) ? `trip-cover-${id.toLowerCase()}` : undefined
}

let opening: string | null = null

/** A pass for this trip was just tapped (or Start planning created it). */
export function markTripOpen(id: string): void {
  opening = id
}

/** Whether this trip's plan is being opened from its pass. False on the server. */
export function openedFromPass(id: string): boolean {
  return typeof window !== 'undefined' && opening === id
}
