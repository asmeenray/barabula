// Now/Next pass status lines (UI-SPEC Copywriting "Now/Next status lines",
// §5). Airline voice on the cover: "Now boarding: {City}" on day 1, "Day {n} of
// {m}" later, "Gate closes tomorrow", "Gate closes in {n} days" (2–3), "Departs
// in {n} days", "Dates not set". Pure: today is passed in (computed once in
// getHomeData in the user's zone), never read during render (Pitfall 10).

import { dayCountFor, sortActivities } from '@/lib/plan/days'
import { nextStopId } from '@/lib/plan/board'
import type { ExtraData } from '@/lib/plan/types'
import { dayIndex } from './today'

export type StatusTrip = {
  destination: string | null
  title: string
  start_date: string | null
  end_date: string | null
  extra_data: ExtraData
}

export type StatusActivity = {
  id: string
  day_number: number | null
  position: number | null
  name: string
  extra_data: ExtraData
}

/** First and last calendar day (as day indexes); a start without an end is a one-day trip. */
export function tripSpan(trip: Pick<StatusTrip, 'start_date' | 'end_date'>): { start: number; end: number } | null {
  const start = dayIndex(trip.start_date) ?? dayIndex(trip.end_date)
  const end = dayIndex(trip.end_date) ?? start
  if (start === null || end === null) return null
  return { start, end: Math.max(start, end) }
}

/** Which day of the trip today is (1-based), or null when today is outside it or it has no dates. */
export function tripDayToday(trip: Pick<StatusTrip, 'start_date' | 'end_date'>, today: string): number | null {
  const span = tripSpan(trip)
  const t = dayIndex(today)
  if (!span || t === null || t < span.start || t > span.end) return null
  return t - span.start + 1
}

/** The cover status line, or null for a trip that has already ended. */
export function statusLine(trip: StatusTrip, today: string): string | null {
  const span = tripSpan(trip)
  if (!span) return 'Dates not set'
  const t = dayIndex(today)
  if (t === null) return null
  if (t > span.end) return null
  if (t >= span.start) {
    const n = t - span.start + 1
    if (n === 1) return `Now boarding: ${trip.destination || trip.title}`
    const m = dayCountFor(trip, [])
    return `Day ${n} of ${Math.max(m, n)}`
  }
  const until = span.start - t
  if (until === 1) return 'Gate closes tomorrow'
  if (until <= 3) return `Gate closes in ${until} days`
  return `Departs in ${until} days`
}

/** "Next: {Place}" on an in-progress trip: the first not-visited place of today's day. */
export function nextPlaceFor(trip: StatusTrip, activities: readonly StatusActivity[], today: string): string | null {
  const day = tripDayToday(trip, today)
  if (day === null) return null
  const todays = sortActivities(activities.filter((a) => a.day_number === day))
  const id = nextStopId(todays)
  return todays.find((a) => a.id === id)?.name ?? null
}
