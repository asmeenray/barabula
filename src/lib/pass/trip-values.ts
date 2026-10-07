// Printed values for a saved trip (plan header cells, home passes): WHEN from
// the dates or the pass length, WHO and INTO from the stored pass answers.
// Sentence case; CSS sets the uppercase. Pure, no client-only imports, so the
// server home data and the client plan header share it.

import { dayDate } from '@/lib/plan/board'
import type { PlanTrip } from '@/lib/plan/types'

type TripLike = Pick<PlanTrip, 'start_date' | 'end_date' | 'extra_data'>

type StoredPass = {
  stops?: unknown
  when?: unknown
  adults?: unknown
  kids?: unknown
  interests?: unknown
  note?: unknown
}

export function storedPass(trip: Pick<PlanTrip, 'extra_data'>): StoredPass | null {
  const pass = trip.extra_data?.pass
  return pass && typeof pass === 'object' ? (pass as StoredPass) : null
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}

/** "12–15 May" / "28 May – 2 Jun" from the trip dates; null when undated. */
export function tripDates(trip: Pick<PlanTrip, 'start_date' | 'end_date'>): string | null {
  const first = dayDate(trip.start_date, 1)
  const last = dayDate(trip.end_date ?? trip.start_date, 1)
  if (!first || !last) return null
  if (first.month !== last.month) return `${first.day} ${first.month} – ${last.day} ${last.month}`
  return first.day === last.day ? `${first.day} ${first.month}` : `${first.day}–${last.day} ${first.month}`
}

/** Dates, else the pass length ("4 days"); null when neither is set. */
export function tripWhen(trip: TripLike): string | null {
  const dates = tripDates(trip)
  if (dates) return dates
  const when = storedPass(trip)?.when as { kind?: unknown; days?: unknown } | null | undefined
  const days = when?.kind === 'length' ? count(when.days) : null
  return days ? `${days} ${days === 1 ? 'day' : 'days'}` : null
}

/** "2 adults · 1 kid"; null when the pass has no travellers. */
export function tripWho(trip: Pick<PlanTrip, 'extra_data'>): string | null {
  const pass = storedPass(trip)
  const adults = count(pass?.adults)
  const kids = count(pass?.kids)
  const parts: string[] = []
  if (adults) parts.push(`${adults} ${adults === 1 ? 'adult' : 'adults'}`)
  if (kids) parts.push(`${kids} ${kids === 1 ? 'kid' : 'kids'}`)
  return parts.length ? parts.join(' · ') : null
}

/** "Food · Views", "+ note" when a note exists, "Note" alone; null when nothing was chosen. */
export function tripInto(trip: Pick<PlanTrip, 'extra_data'>): string | null {
  const pass = storedPass(trip)
  const interests = Array.isArray(pass?.interests)
    ? pass.interests.filter((i): i is string => typeof i === 'string' && i.trim() !== '')
    : []
  const note = typeof pass?.note === 'string' && pass.note.trim() !== ''
  if (interests.length === 0) return note ? 'Note' : null
  return interests.join(' · ') + (note ? ' + note' : '')
}

/** The stops the pass recorded, in order; empty for trips made another way. */
export function tripStops(trip: Pick<PlanTrip, 'extra_data'>): string[] {
  const stops = storedPass(trip)?.stops
  return Array.isArray(stops) ? stops.filter((s): s is string => typeof s === 'string' && s.trim() !== '') : []
}
