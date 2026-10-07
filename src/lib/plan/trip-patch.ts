// Trip-details edits (16-17, D-20): the pass answers a sheet saved → the PATCH
// for /api/itineraries/{id} (mirrors TripPatchSchema), applied locally at once
// and undone with the inverse patch. Pure; safe in client components.

import { passTitle } from '@/lib/pass/format'
import { INTEREST_CHIPS, type Interest } from '@/lib/pass/interests'
import { spanDays } from '@/lib/pass/dates'
import { storedPass, tripStops } from '@/lib/pass/trip-values'
import type { PassAnswers, PassWhen } from '@/lib/pass/types'
import type { PlanTrip } from './types'

/** What the client may change on a trip (mirrors TripPatchSchema). */
export interface TripUpdate {
  title?: string
  destination?: string | null
  start_date?: string | null
  end_date?: string | null
  extra_data?: {
    pass?: Partial<PassAnswers>
    day_count?: number
  }
}

/** The four editable lines on the plan header (UI-SPEC §7 items 1–2). */
export type TripLine = 'to' | 'when' | 'who' | 'into'

function count(value: unknown, min: number): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= min ? value : null
}

function storedWhen(value: unknown): PassWhen {
  if (!value || typeof value !== 'object') return null
  const w = value as { kind?: unknown; start?: unknown; end?: unknown; days?: unknown }
  if (w.kind === 'unsure') return { kind: 'unsure' }
  if (w.kind === 'length') {
    const days = count(w.days, 1)
    return days ? { kind: 'length', days } : null
  }
  if (w.kind === 'dates' && typeof w.start === 'string' && typeof w.end === 'string') {
    return { kind: 'dates', start: w.start, end: w.end }
  }
  return null
}

/** The pass answers a trip-details sheet starts from: the trip's own dates win over the stored pass. */
export function tripAnswers(trip: PlanTrip): PassAnswers {
  const pass = storedPass(trip)
  const stops = tripStops(trip)
  const city = trip.destination?.trim() || trip.title.trim()
  const when: PassWhen =
    trip.start_date && trip.end_date
      ? { kind: 'dates', start: trip.start_date, end: trip.end_date }
      : (() => {
          const w = storedWhen(pass?.when)
          // Stored dates the trip no longer has are not offered again.
          return w?.kind === 'dates' ? null : w
        })()
  const interests = Array.isArray(pass?.interests)
    ? INTEREST_CHIPS.filter((c) => (pass.interests as unknown[]).includes(c))
    : []
  return {
    stops: stops.length ? stops : city ? [city] : [],
    when,
    adults: count(pass?.adults, 1),
    kids: count(pass?.kids, 0),
    interests: interests as Interest[],
    note: typeof pass?.note === 'string' && pass.note.trim() ? pass.note : null,
  }
}

/**
 * The PATCH for a saved line. Title and destination follow the stops
 * (passTitle / first stop). WHEN sets the dates (or clears them) and the day
 * count: the span for dates, the length for "Number of days", and the board's
 * current count for "Not sure yet" (nothing is moved to Maybe).
 */
export function tripUpdateFor(answers: Partial<PassAnswers>, dayCount: number): TripUpdate {
  const update: TripUpdate = { extra_data: { pass: { ...answers } } }
  if (answers.stops) {
    update.title = passTitle(answers.stops)
    update.destination = answers.stops[0] ?? null
  }
  if (answers.when !== undefined) {
    const when = answers.when
    if (when?.kind === 'dates') {
      update.start_date = when.start
      update.end_date = when.end
      update.extra_data!.day_count = spanDays(when.start, when.end) ?? dayCount
    } else {
      update.start_date = null
      update.end_date = null
      update.extra_data!.day_count = when?.kind === 'length' ? when.days : dayCount
    }
  }
  return update
}

/** The board's day count after an update (unchanged unless it sets day_count). */
export function dayCountAfter(update: TripUpdate, dayCount: number): number {
  return update.extra_data?.day_count ?? dayCount
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

/** The trip as it looks once the server has merged the update (local, optimistic). */
export function applyTripUpdate(trip: PlanTrip, update: TripUpdate): PlanTrip {
  const { extra_data, ...columns } = update
  const next: PlanTrip = { ...trip, ...columns }
  if (extra_data) {
    const extra = { ...record(trip.extra_data) }
    if (extra_data.pass) extra.pass = { ...record(extra.pass), v: 1, ...extra_data.pass }
    if (extra_data.day_count !== undefined) extra.day_count = extra_data.day_count
    next.extra_data = extra
  }
  return next
}

/**
 * The update that puts back what `update` changed, read from the trip before
 * it. A pass answer the trip did not have goes back as null (skipped).
 */
export function inverseTripUpdate(trip: PlanTrip, update: TripUpdate, dayCount: number): TripUpdate {
  const inverse: TripUpdate = {}
  if (update.title !== undefined) inverse.title = trip.title
  if (update.destination !== undefined) inverse.destination = trip.destination
  if (update.start_date !== undefined || update.end_date !== undefined) {
    // Both or neither (TripPatchSchema); a half-dated trip goes back undated.
    const dated = !!(trip.start_date && trip.end_date)
    inverse.start_date = dated ? trip.start_date : null
    inverse.end_date = dated ? trip.end_date : null
  }
  if (update.extra_data) {
    const before = tripAnswers(trip)
    const stored = record(storedPass(trip))
    const extra: NonNullable<TripUpdate['extra_data']> = {}
    if (update.extra_data.pass) {
      const pass: Partial<PassAnswers> = {}
      for (const key of Object.keys(update.extra_data.pass) as (keyof PassAnswers)[]) {
        if (key === 'stops') {
          // Trips made before the pass get their city as the one stop.
          if (before.stops.length && before.stops.every((s) => s.length <= 80)) pass.stops = before.stops
        } else if (key === 'when') pass.when = storedWhen(stored.when)
        else if (key === 'adults') pass.adults = before.adults
        else if (key === 'kids') pass.kids = before.kids
        else if (key === 'interests') pass.interests = before.interests
        else if (key === 'note') pass.note = before.note
      }
      extra.pass = pass
    }
    if (update.extra_data.day_count !== undefined) {
      extra.day_count = count(trip.extra_data?.day_count, 1) ?? dayCount
    }
    inverse.extra_data = extra
  }
  return inverse
}

/** Two pending updates as one (later wins; pass answers merge key by key). */
export function mergeTripUpdates(a: TripUpdate | undefined, b: TripUpdate): TripUpdate {
  if (!a) return b
  const merged: TripUpdate = { ...a, ...b }
  if (a.extra_data || b.extra_data) {
    merged.extra_data = { ...a.extra_data, ...b.extra_data }
    if (a.extra_data?.pass || b.extra_data?.pass) {
      merged.extra_data.pass = { ...a.extra_data?.pass, ...b.extra_data?.pass }
    }
  }
  return merged
}

/** "{n} places moved to Maybe" (UI-SPEC Undo toasts), singular for one. */
export function movedToMaybeLabel(n: number): string {
  return `${n} ${n === 1 ? 'place' : 'places'} moved to Maybe`
}
