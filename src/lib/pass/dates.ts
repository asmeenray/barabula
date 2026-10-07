// Calendar maths for the pass's date range (UTC days, no time zones).

export const MAX_PASS_DAYS = 30

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Days since the epoch for a real YYYY-MM-DD date, else null (rejects 2026-02-31). */
export function isoDay(value: string): number | null {
  const m = ISO_DATE.exec(value)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(y, mo - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null
  return date.getTime() / 86_400_000
}

/** Inclusive number of days from start to end, or null if either date is invalid. */
export function spanDays(start: string, end: string): number | null {
  const a = isoDay(start)
  const b = isoDay(end)
  if (a === null || b === null) return null
  return b - a + 1
}

export type RangeProblem = 'end-before-start' | 'too-long' | null

/** Why a date range can't be used, or null when it can. Copy lives with the UI. */
export function rangeProblem(start: string, end: string): RangeProblem {
  const span = spanDays(start, end)
  if (span === null) return null
  if (span < 1) return 'end-before-start'
  if (span > MAX_PASS_DAYS) return 'too-long'
  return null
}
