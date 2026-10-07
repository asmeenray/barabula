// Splits the user's trips into the Trips home sections (UI-SPEC §2, D-07):
// now (today between start and end), else next (soonest dated upcoming trip,
// else the most recently edited undated trip), upcoming (the rest: dated
// soonest first, then undated by updated_at, newest first) and past (ended
// before today, latest end first). Pure; today is a YYYY-MM-DD string in the
// user's zone, compared as calendar days.

import { tripSpan } from './status'
import { dayIndex } from './today'

export type SectionInput = {
  id: string
  start_date: string | null
  end_date: string | null
  updated_at: string | null
}

export type Sections<T> = {
  /** The trip happening today; when set, next is null. */
  now: T | null
  next: T | null
  upcoming: T[]
  past: T[]
}

function updatedDesc(a: SectionInput, b: SectionInput): number {
  const ta = a.updated_at ? Date.parse(a.updated_at) : Number.NaN
  const tb = b.updated_at ? Date.parse(b.updated_at) : Number.NaN
  const va = Number.isFinite(ta) ? ta : -Infinity
  const vb = Number.isFinite(tb) ? tb : -Infinity
  if (va !== vb) return vb - va
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

export function sectionTrips<T extends SectionInput>(trips: readonly T[], today: string): Sections<T> {
  const t = dayIndex(today) ?? 0
  const current: { trip: T; start: number; end: number }[] = []
  const dated: { trip: T; start: number; end: number }[] = []
  const undated: T[] = []
  const past: { trip: T; end: number }[] = []

  for (const trip of trips) {
    const span = tripSpan(trip)
    if (!span) undated.push(trip)
    else if (span.end < t) past.push({ trip, end: span.end })
    else if (span.start <= t) current.push({ trip, ...span })
    else dated.push({ trip, ...span })
  }

  const bySoonest = (a: { trip: T; start: number }, b: { trip: T; start: number }) =>
    a.start - b.start || updatedDesc(a.trip, b.trip)
  current.sort(bySoonest)
  dated.sort(bySoonest)
  undated.sort(updatedDesc)
  past.sort((a, b) => b.end - a.end || updatedDesc(a.trip, b.trip))

  // Other trips running today (overlaps) stay at the top of Upcoming.
  const [nowEntry, ...alsoNow] = current
  const upcomingDated = [...alsoNow, ...dated].map((d) => d.trip)
  let next: T | null = null
  if (!nowEntry) next = upcomingDated.shift() ?? undated.shift() ?? null

  return {
    now: nowEntry?.trip ?? null,
    next,
    upcoming: [...upcomingDated, ...undated],
    past: past.map((p) => p.trip),
  }
}
