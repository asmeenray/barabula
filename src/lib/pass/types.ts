import type { Interest } from './interests'

/**
 * When? on the pass (D-13): exact dates, a length, or "Not sure yet" — never
 * dates and days together. null = the question was skipped (prints nothing).
 * Dates are YYYY-MM-DD, inclusive.
 */
export type PassWhen =
  | { kind: 'dates'; start: string; end: string }
  | { kind: 'length'; days: number }
  | { kind: 'unsure' }
  | null

/** The four answers on the blank pass. null / empty = skipped. */
export type PassAnswers = {
  /** City names in order (D-12); the first is the trip's destination. */
  stops: string[]
  when: PassWhen
  adults: number | null
  kids: number | null
  interests: Interest[]
  note: string | null
}

/** A curated city the "Where to?" list offers first (from the photo manifest). */
export type PassCity = {
  name: string
  /** Lowercase, accent-free names a typed stop can match (see normalizeCity). */
  names: readonly string[]
  /** Real IATA code, only when the manifest has one. */
  code?: string
}
