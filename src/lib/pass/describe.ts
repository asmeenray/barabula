// "Describe your whole trip" (D-11): the phase 16 reader is plain keyword
// reading, no AI and no network (AI reading arrives in 16.1). It reads cities,
// a length or a date range, a month, people and interests from one sentence.
//
// It never invents a city: a stop is read only when a known name or alias is in
// the text as whole words, in text order. Everything here is pure and linear in
// the text length (T-16-37): one token scan for cities and interests, and a few
// regexes with bounded quantifiers and no nested repetition.

import { MAX_PASS_DAYS, isoDay, rangeProblem } from './dates'
import { foldName, KNOWN_CITIES, type KnownCity } from './cities'
import { INTEREST_CHIPS, type Interest } from './interests'
import type { PassAnswers, PassWhen } from './types'

/** When? as the reader sees it: a date range or a length. A month alone stays a month (D-13). */
export type ReadWhen = Extract<PassWhen, { kind: 'dates' } | { kind: 'length' }> | null

export type Reading = {
  /** Display names of the known cities found in the text, in text order, no repeats. */
  stops: string[]
  when: ReadWhen
  /** 1–12 from a month name or a date range; feeds "Cities that fit", never When? on its own. */
  month: number | null
  adults: number | null
  kids: number | null
  /** Interest chips, in chip order. */
  interests: Interest[]
  /** Climate words read (warm, sunny, cold, snow, mild, tropical), for "Cities that fit". */
  climate: string[]
  noCity: boolean
}

// --- text folding -------------------------------------------------------------

/** Lowercase, accent-free, dashes kept as "-", everything else but letters and digits to one space. */
function softFold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[‐-―−]/g, '-')
    .replace(/[^a-z0-9-]+/g, ' ')
    .trim()
}

// --- cities -------------------------------------------------------------------

type Candidate = { tokens: string[]; name: string }
const indexes = new WeakMap<readonly KnownCity[], Map<string, Candidate[]>>()

/** First folded word → the names starting with it (built once per list). */
function indexOf(cities: readonly KnownCity[]): Map<string, Candidate[]> {
  let index = indexes.get(cities)
  if (index) return index
  index = new Map()
  for (const city of cities) {
    for (const alias of city.names) {
      const tokens = foldName(alias).split(' ').filter(Boolean)
      if (!tokens.length) continue
      const list = index.get(tokens[0]) ?? []
      list.push({ tokens, name: city.name })
      index.set(tokens[0], list)
    }
  }
  indexes.set(cities, index)
  return index
}

function readStops(tokens: string[], cities: readonly KnownCity[]): string[] {
  const index = indexOf(cities)
  const stops: string[] = []
  let i = 0
  while (i < tokens.length) {
    let best: Candidate | null = null
    for (const cand of index.get(tokens[i]) ?? []) {
      if (best && cand.tokens.length <= best.tokens.length) continue
      if (cand.tokens.every((t, k) => tokens[i + k] === t)) best = cand
    }
    if (best) {
      if (!stops.includes(best.name)) stops.push(best.name)
      i += best.tokens.length
    } else i += 1
  }
  return stops
}

// --- when -----------------------------------------------------------------------

const MONTH = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const monthOf = (word: string) => MONTH_KEYS.indexOf(word.slice(0, 3)) + 1
const DAY = '(\\d{1,2})(?:st|nd|rd|th)?'
const TO = ' ?(?:-|to) ?'

// "28 dec - 2 jan", "12-15 may", "may 12 to 15"
const RANGE_TWO_MONTHS = new RegExp(`\\b${DAY} ${MONTH}${TO}${DAY} ${MONTH}\\b`)
const RANGE_DAYS_MONTH = new RegExp(`\\b${DAY}${TO}${DAY} (?:of )?${MONTH}\\b`)
const RANGE_MONTH_DAYS = new RegExp(`\\b${MONTH} ${DAY}${TO}${DAY}\\b`)
// Month names alone: full names only; "may" only after a time word, so "we may go" is not May.
const MONTH_ALONE = /\b(january|february|march|april|june|july|august|september|october|november|december)\b|\b(?:in|early|mid|late|this|next|of|during|until|through|by|from) (may)\b/

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
}
const NUM = '(\\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen)'
const toNumber = (word: string) => (/^\d+$/.test(word) ? Number(word) : (NUMBER_WORDS[word] ?? 0))

const DAYS = new RegExp(`\\b${NUM}[ -]?(days?|nights?)\\b`)
const WEEKS = /\b(\d{1,2}|a|an|one|two|three|four)[ -]?weeks?\b/
const BARE_WEEK = /(?<!\b(?:next|this|last|every|per) )\bweek\b/

const pad = (n: number) => String(n).padStart(2, '0')

function resolveRange(today: string, d1: number, m1: number, d2: number, m2: number): ReadWhen {
  const year = Number(today.slice(0, 4))
  let y = year
  let start = `${y}-${pad(m1)}-${pad(d1)}`
  if (start < today) {
    y += 1
    start = `${y}-${pad(m1)}-${pad(d1)}`
  }
  const end = `${m2 < m1 ? y + 1 : y}-${pad(m2)}-${pad(d2)}`
  if (isoDay(start) === null || isoDay(end) === null || rangeProblem(start, end)) return null
  return { kind: 'dates', start, end }
}

function readWhen(t: string, today: string | null): { when: ReadWhen; month: number | null } {
  let range: [number, number, number, number] | null = null
  let m = RANGE_TWO_MONTHS.exec(t)
  if (m) range = [Number(m[1]), monthOf(m[2]), Number(m[3]), monthOf(m[4])]
  else if ((m = RANGE_DAYS_MONTH.exec(t))) range = [Number(m[1]), monthOf(m[3]), Number(m[2]), monthOf(m[3])]
  else if ((m = RANGE_MONTH_DAYS.exec(t))) range = [Number(m[2]), monthOf(m[1]), Number(m[3]), monthOf(m[1])]

  let month: number | null = range ? range[1] : null
  if (month === null) {
    const alone = MONTH_ALONE.exec(t)
    if (alone) month = monthOf(alone[1] ?? alone[2])
  }

  if (range) {
    const dates = today ? resolveRange(today, ...range) : null
    if (dates) return { when: dates, month }
  }

  const length = readLength(t)
  return { when: length ? { kind: 'length', days: length } : null, month }
}

function readLength(t: string): number | null {
  const cap = (n: number) => (n >= 1 ? Math.min(n, MAX_PASS_DAYS) : null)
  const days = DAYS.exec(t)
  if (days) {
    const n = toNumber(days[1])
    return cap(days[2].startsWith('night') && n > 0 ? n + 1 : n)
  }
  const weeks = WEEKS.exec(t)
  if (weeks) return cap(toNumber(weeks[1]) * 7)
  if (/\bfortnight\b/.test(t)) return 14
  if (/\blong weekend\b/.test(t)) return 3
  if (/\bweekend\b/.test(t)) return 2
  if (BARE_WEEK.test(t)) return 7
  return null
}

// --- people -----------------------------------------------------------------------

const ADULT_COUNT = new RegExp(`\\b${NUM} (?:adults?|people|persons|friends|grown ups|of us)\\b`)
const KID_COUNT = new RegExp(`\\b(${NUM.slice(1, -1)}|a|an) (?:kids?|children|child|toddlers?|teens|teenagers)\\b`)
const COUPLE = /\b(?:with my (?:partner|wife|husband|girlfriend|boyfriend|fiance|fiancee)|couple|honeymoon|the two of us|both of us)\b/
const SOLO = /\b(?:solo|alone|by myself|on my own|just me)\b/

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

function readPeople(t: string, words: Set<string>): { adults: number | null; kids: number | null } {
  let adults: number | null = null
  const count = ADULT_COUNT.exec(t)
  if (count && toNumber(count[1]) > 0) adults = clamp(toNumber(count[1]), 1, 20)
  else if (COUPLE.test(t)) adults = 2
  else if (SOLO.test(t)) adults = 1
  else if (words.has('family')) adults = 2

  const kidCount = KID_COUNT.exec(t)
  const kids = kidCount ? clamp(toNumber(kidCount[1]), 0, 20) : null
  return { adults, kids }
}

// --- interests and climate ------------------------------------------------------------

const INTEREST_WORDS: Record<Interest, readonly string[]> = {
  Food: ['food', 'foodie', 'foodies', 'eat', 'eating', 'restaurant', 'restaurants', 'cuisine', 'dining'],
  Coffee: ['coffee', 'cafe', 'cafes', 'espresso'],
  Views: ['view', 'views', 'viewpoint', 'viewpoints', 'sunset', 'sunsets', 'panorama', 'panoramic'],
  Museums: ['museum', 'museums', 'gallery', 'galleries', 'art'],
  Architecture: ['architecture', 'architectural'],
  Markets: ['market', 'markets'],
  Nightlife: ['nightlife', 'bar', 'bars', 'club', 'clubs', 'clubbing', 'cocktails'],
  Hiking: ['hiking', 'hike', 'hikes', 'trail', 'trails', 'trek', 'trekking'],
  Beaches: ['beach', 'beaches', 'seaside'],
  'Slow pace': ['slow', 'relaxed', 'relaxing', 'chill', 'unhurried', 'leisurely'],
  'Kid-friendly': ['kid', 'kids', 'family', 'children', 'child', 'toddler', 'toddlers'],
}

const CLIMATE_WORDS: Record<string, string> = {
  warm: 'warm',
  hot: 'warm',
  sunny: 'sunny',
  sun: 'sunny',
  sunshine: 'sunny',
  cold: 'cold',
  chilly: 'cold',
  snow: 'snow',
  snowy: 'snow',
  mild: 'mild',
  tropical: 'tropical',
}

// --- the reader ---------------------------------------------------------------------

/**
 * Reads one trip sentence. Pure: `today` (YYYY-MM-DD, the user's day) places a
 * date range in its next occurrence; without it a range is read as its month.
 */
export function readDescription(text: string, cities: readonly KnownCity[] = KNOWN_CITIES, today: string | null = null): Reading {
  const t = softFold(text)
  const tokens = foldName(text).split(' ').filter(Boolean)
  const words = new Set(tokens)

  const stops = readStops(tokens, cities)
  const { when, month } = readWhen(t, today)
  const { adults, kids } = readPeople(t, words)
  const interests = INTEREST_CHIPS.filter((chip) => INTEREST_WORDS[chip].some((w) => words.has(w)))
  const climate = [...new Set(tokens.flatMap((w) => (CLIMATE_WORDS[w] ? [CLIMATE_WORDS[w]] : [])))]

  return { stops, when, month, adults, kids, interests, climate, noCity: stops.length === 0 }
}

/** The pass answers "Use this" writes. A chosen "Cities that fit" chip stands in when no city was read. */
export function readingToAnswers(
  reading: Reading,
  chosenCity?: string | null
): Pick<PassAnswers, 'stops' | 'when' | 'adults' | 'kids' | 'interests'> {
  const stops = reading.stops.length ? reading.stops : chosenCity ? [chosenCity] : []
  return {
    stops,
    when: reading.when,
    adults: reading.adults,
    // Adults read without kids means no kids; kids alone leave Who's going? open.
    kids: reading.kids ?? (reading.adults ? 0 : null),
    interests: reading.interests,
  }
}

/** The first question the pass still needs (1 Where to? … 4 What are you into?), else the ready pass. */
export function firstMissingStep(answers: PassAnswers): 1 | 2 | 3 | 4 | 'ready' {
  if (answers.stops.length === 0) return 1
  if (answers.when === null) return 2
  if (answers.adults === null) return 3
  if (answers.interests.length === 0 && !answers.note?.trim()) return 4
  return 'ready'
}
