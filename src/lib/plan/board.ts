// Board status logic (UI-SPEC §7, "Accent reserved for" 1).
// NEXT = first not-visited stop of the selected day; visited is the
// extra_data.visited flag (written from 16-07); Maybe = day_number null.

import type { ExtraData, PlanActivity } from './types'

export type Chip = 'NEXT' | 'LATER' | 'VISITED' | 'MAYBE'

type Stop = Pick<PlanActivity, 'id'> & { extra_data: ExtraData }

export function isVisited(a: { extra_data: ExtraData }): boolean {
  return a.extra_data?.visited === true
}

/** Id of the first stop of a day that is not visited; null when all are or the day is empty. */
export function nextStopId<T extends Stop>(dayActs: readonly T[]): string | null {
  return dayActs.find((a) => !isVisited(a))?.id ?? null
}

export function chipFor(activity: Stop & Pick<PlanActivity, 'day_number'>, nextId: string | null): Chip {
  if (activity.day_number === null) return 'MAYBE'
  if (isVisited(activity)) return 'VISITED'
  if (activity.id === nextId) return 'NEXT'
  return 'LATER'
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface CalendarDay {
  weekday: string
  day: number
  month: string
}

/** Calendar date of day n (1-based) from a YYYY-MM-DD start date, without time-zone shifts. */
export function dayDate(startDate: string | null, n: number): CalendarDay | null {
  const m = startDate ? /^(\d{4})-(\d{2})-(\d{2})/.exec(startDate) : null
  if (!m) return null
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n - 1))
  if (!Number.isFinite(d.getTime())) return null
  return { weekday: WEEKDAYS[d.getUTCDay()], day: d.getUTCDate(), month: MONTHS[d.getUTCMonth()] }
}

/** "Tue 12 May" (shown uppercase by CSS), or "Day {n}" for undated trips. */
export function dayTitle(startDate: string | null, n: number): string {
  const d = dayDate(startDate, n)
  return d ? `${d.weekday} ${d.day} ${d.month}` : `Day ${n}`
}

/** "1 stop" / "{n} stops". */
export function stopsLabel(n: number): string {
  return `${n} ${n === 1 ? 'stop' : 'stops'}`
}
