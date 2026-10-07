// Pure helpers for the trip plan: ordering, day count and day grouping.
// Order rule (D-21): day_number ascending (null = Maybe, last), then position
// ascending (null last), then id. Nothing orders activities by time.

import type { PlanActivity, PlanTrip } from './types'

export const MAX_TRIP_DAYS = 30

type Orderable = Pick<PlanActivity, 'id' | 'day_number' | 'position'>

function compareNullableNumber(a: number | null, b: number | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a - b
}

export function compareActivities(a: Orderable, b: Orderable): number {
  return (
    compareNullableNumber(a.day_number, b.day_number) ||
    compareNullableNumber(a.position, b.position) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  )
}

/** Returns a new array in plan order; the input is not changed. */
export function sortActivities<T extends Orderable>(activities: readonly T[]): T[] {
  return [...activities].sort(compareActivities)
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/

function utcDay(iso: string): number | null {
  const m = ISO_DATE.exec(iso)
  if (!m) return null
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isFinite(t) ? t / 86_400_000 : null
}

function positiveInt(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  const i = Math.floor(n)
  return i >= 1 ? i : null
}

/**
 * Number of days the board shows.
 * Dated trips: inclusive days between start_date and end_date, capped at 30.
 * Undated: extra_data.day_count, else the highest day_number, else 1.
 */
export function dayCountFor(
  trip: Pick<PlanTrip, 'start_date' | 'end_date' | 'extra_data'>,
  activities: readonly Pick<PlanActivity, 'day_number'>[]
): number {
  if (trip.start_date && trip.end_date) {
    const start = utcDay(trip.start_date)
    const end = utcDay(trip.end_date)
    if (start !== null && end !== null && end >= start) {
      return Math.min(end - start + 1, MAX_TRIP_DAYS)
    }
  }
  const stored = positiveInt(trip.extra_data?.day_count)
  if (stored !== null) return Math.min(stored, MAX_TRIP_DAYS)
  let highest = 0
  for (const a of activities) {
    if (a.day_number !== null && a.day_number > highest) highest = a.day_number
  }
  return highest >= 1 ? highest : 1
}

/**
 * Splits sorted activities into day arrays (index 0 = day 1) and the Maybe
 * bucket. A day_number above dayCount keeps its own day index so nothing is
 * hidden (the board then shows more days than the dates cover).
 */
export function groupDays<T extends Orderable>(
  activities: readonly T[],
  dayCount: number
): { days: T[][]; maybe: T[] } {
  let total = Math.max(1, Math.floor(dayCount))
  for (const a of activities) {
    if (a.day_number !== null && a.day_number > total) total = a.day_number
  }
  const days: T[][] = Array.from({ length: total }, () => [])
  const maybe: T[] = []
  for (const a of sortActivities(activities)) {
    if (a.day_number === null || a.day_number < 1) {
      maybe.push(a)
    } else {
      days[a.day_number - 1].push(a)
    }
  }
  return { days, maybe }
}
