// Printed values for the pass stamp lines and title (UI-SPEC Copywriting
// "Pass line labels / values"). Strings are sentence case; the pass shows them
// uppercase with CSS, so screen readers get the real words ("12–15 May"
// displays as "12–15 MAY"). Pure; safe in client components.

import { dayDate } from '@/lib/plan/board'
import type { PassWhen } from './types'

export type CodeOf = (stop: string) => string | undefined

/**
 * Title for the pass: one stop → that stop; several → joined with " → ", as
 * IATA codes only when every stop has one ("LIS → PRG"), else the names.
 */
export function passTitle(stops: readonly string[], codeOf?: CodeOf): string {
  const clean = stops.map((s) => s.trim()).filter(Boolean)
  if (clean.length <= 1) return clean[0] ?? ''
  const codes = codeOf ? clean.map((s) => codeOf(s)) : []
  if (codes.length === clean.length && codes.every(Boolean)) return codes.join(' → ')
  return clean.join(' → ')
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** "12–15 May", "28 May – 2 Jun", "4 days", "Not sure yet"; null when skipped. */
export function whenLine(when: PassWhen): string | null {
  if (!when) return null
  if (when.kind === 'unsure') return 'Not sure yet'
  if (when.kind === 'length') return plural(when.days, 'day', 'days')
  const first = dayDate(when.start, 1)
  const last = dayDate(when.end, 1)
  if (!first || !last) return null
  if (first.month !== last.month) return `${first.day} ${first.month} – ${last.day} ${last.month}`
  return first.day === last.day ? `${first.day} ${first.month}` : `${first.day}–${last.day} ${first.month}`
}

/** "2 adults · 1 kid"; null when skipped. */
export function whoLine(adults: number | null, kids: number | null): string | null {
  const parts: string[] = []
  if (adults) parts.push(plural(adults, 'adult', 'adults'))
  if (kids) parts.push(plural(kids, 'kid', 'kids'))
  return parts.length ? parts.join(' · ') : null
}

/** "Food · Views + note", "Note" for a note alone; null when nothing was chosen. */
export function intoLine(interests: readonly string[], note: string | null): string | null {
  const hasNote = !!note?.trim()
  if (interests.length === 0) return hasNote ? 'Note' : null
  return interests.join(' · ') + (hasNote ? ' + note' : '')
}
