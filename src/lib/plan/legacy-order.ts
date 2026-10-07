// The pre-phase-16 on-screen order of activities (groupByDay/timeRank in the
// old itinerary page). Kept ONLY as the oracle for the position backfill in
// supabase/migrations/20261006000000_activities_position_maybe.sql and its
// local parity test. Nothing else may order activities by time (D-21): readers
// sort by day_number (nulls = Maybe, last), then position (nulls last), then id.

const TIME_ORDER: Record<string, number> = { morning: 0, afternoon: 1, evening: 2, night: 3 }

const TWELVE_HOUR = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i

// Mirrors the old timeRank exactly, including its quirks:
// - "13:00 PM" ranks as 25h (hours above 12 are not wrapped)
// - anything else is 10 + the leading number parseFloat reads ("10am" -> 20, "14:00" -> 24)
// One deliberate difference: the word lookup uses Object.hasOwn, so text such as
// "constructor" falls through to the number rule instead of producing NaN.
export function legacyTimeRank(time: string | null): number {
  const t = time ?? ''
  const lower = t.toLowerCase()
  if (Object.hasOwn(TIME_ORDER, lower)) return TIME_ORDER[lower]
  const match = t.match(TWELVE_HOUR)
  if (match) {
    let hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const period = match[3].toUpperCase()
    if (period === 'AM' && hours === 12) hours = 0
    if (period === 'PM' && hours !== 12) hours += 12
    return hours * 60 + minutes
  }
  return 10 + (parseFloat(t.replace(':', '.')) || 0)
}

export interface LegacyOrderRow {
  id: string
  day_number: number
  time: string | null
}

// Groups rows by day (in first-seen order) and returns each day's ids sorted by
// legacyTimeRank. Array.prototype.sort is stable, so ties keep the input order,
// which on the old page was the order the rows were fetched in.
export function legacyOrder(rows: readonly LegacyOrderRow[]): Map<number, string[]> {
  const byDay = new Map<number, LegacyOrderRow[]>()
  for (const row of rows) {
    const list = byDay.get(row.day_number) ?? []
    list.push(row)
    byDay.set(row.day_number, list)
  }
  const result = new Map<number, string[]>()
  for (const [day, list] of byDay) {
    const sorted = [...list].sort((a, b) => legacyTimeRank(a.time) - legacyTimeRank(b.time))
    result.set(day, sorted.map((r) => r.id))
  }
  return result
}
