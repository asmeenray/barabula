// "Today" for the Trips home, in the user's own time zone (Pitfall 9: Vercel
// functions run in UTC). The zone comes from the tz cookie the head script in
// src/app/layout.tsx writes. The cookie is untrusted (T-16-35): it is only ever
// handed to Intl inside try/catch, never echoed into HTML or a query, and
// anything Intl rejects falls back to UTC (also the very first visit, before
// the cookie exists). Dates are calendar days (YYYY-MM-DD), no time-of-day maths.

// IANA names are short ("America/Argentina/ComodRivadavia" is the longest).
const MAX_ZONE_LENGTH = 64

function zoneOf(tz: string | null | undefined): string {
  if (!tz || tz.length > MAX_ZONE_LENGTH * 3) return 'UTC'
  let zone = tz
  try {
    zone = decodeURIComponent(tz)
  } catch {
    return 'UTC'
  }
  return zone.length > 0 && zone.length <= MAX_ZONE_LENGTH ? zone : 'UTC'
}

function isoIn(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** The YYYY-MM-DD date at `now` in the given IANA zone; UTC when the zone is missing or invalid. */
export function todayInZone(tz: string | null | undefined, now: Date): string {
  try {
    return isoIn(zoneOf(tz), now)
  } catch {
    return isoIn('UTC', now)
  }
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/

/** Days since 1970-01-01 for a YYYY-MM-DD date; null when it doesn't parse. */
export function dayIndex(iso: string | null | undefined): number | null {
  const m = iso ? ISO_DATE.exec(iso) : null
  if (!m) return null
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isFinite(t) ? Math.round(t / 86_400_000) : null
}

/** Calendar days from `from` to `to` (negative when `to` is earlier); NaN when either doesn't parse. */
export function daysBetween(from: string, to: string): number {
  const a = dayIndex(from)
  const b = dayIndex(to)
  return a === null || b === null ? Number.NaN : b - a
}
