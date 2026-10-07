import { describe, it, expect } from 'vitest'
import { readDescription, readingToAnswers, firstMissingStep, type Reading } from '@/lib/pass/describe'
import { KNOWN_CITIES, knownCities } from '@/lib/pass/cities'
import { CITY_PHOTOS } from '@/lib/photos/manifest'

// The phase 16 describe reader (D-11): plain keyword reading, no AI. It never
// invents a city: a stop is read only when a known name or alias is in the text.

const TODAY = '2026-10-07'
const read = (text: string, today: string | null = TODAY) => readDescription(text, KNOWN_CITIES, today)

describe('readDescription — the four UI-SPEC example prompts', () => {
  it('"A long weekend in Lisbon for food and views"', () => {
    const r = read('A long weekend in Lisbon for food and views')
    expect(r.stops).toEqual(['Lisbon'])
    expect(r.when).toEqual({ kind: 'length', days: 3 })
    expect(r.interests).toEqual(['Food', 'Views'])
    expect(r.noCity).toBe(false)
  })

  it('"A family week in Rome with 2 kids"', () => {
    const r = read('A family week in Rome with 2 kids')
    expect(r.stops).toEqual(['Rome'])
    expect(r.when).toEqual({ kind: 'length', days: 7 })
    expect(r.kids).toBe(2)
    expect(r.adults).toBe(2)
    expect(r.interests).toContain('Kid-friendly')
  })

  it('"Paris then Prague, 6 days, museums and architecture"', () => {
    const r = read('Paris then Prague, 6 days, museums and architecture')
    expect(r.stops).toEqual(['Paris', 'Prague'])
    expect(r.when).toEqual({ kind: 'length', days: 6 })
    expect(r.interests).toEqual(['Museums', 'Architecture'])
  })

  it('"Kyoto in April with my partner, slow pace"', () => {
    const r = read('Kyoto in April with my partner, slow pace')
    expect(r.stops).toEqual(['Kyoto'])
    expect(r.month).toBe(4)
    // A month alone does not answer When? (D-13).
    expect(r.when).toBeNull()
    expect(r.adults).toBe(2)
    expect(r.interests).toEqual(['Slow pace'])
  })
})

describe('readDescription — cities', () => {
  it('no city: noCity, and the month is still read', () => {
    const r = read('somewhere warm in March')
    expect(r.stops).toEqual([])
    expect(r.noCity).toBe(true)
    expect(r.month).toBe(3)
    expect(r.climate).toContain('warm')
  })

  it('reads an alias as the display name', () => {
    const r = read('Lisboa for 4 days solo')
    expect(r.stops).toEqual(['Lisbon'])
    expect(r.when).toEqual({ kind: 'length', days: 4 })
    expect(r.adults).toBe(1)
  })

  it('never invents a city from a capitalised word', () => {
    expect(read('Visit Gotham').stops).toEqual([])
    expect(read('Visit Gotham').noCity).toBe(true)
    expect(read('').stops).toEqual([])
  })

  it('keeps text order, drops repeats, and prefers the longest name', () => {
    expect(read('Prague, then back to Paris, then Prague again').stops).toEqual(['Prague', 'Paris'])
    expect(read('New York and then Mexico City').stops).toEqual(['New York', 'Mexico City'])
    expect(read('NYC for a week').stops).toEqual(['New York'])
  })

  it('folds accents and case', () => {
    expect(read('MÜNCHEN und Köln').stops).toEqual(['Munich', 'Cologne'])
    expect(read('københavn').stops).toEqual(['Copenhagen'])
  })

  it('only matches whole words', () => {
    expect(read('a romantic trip').stops).toEqual([])
    expect(read('parisian cafes').stops).toEqual([])
  })

  it('uses the city list it is given', () => {
    const list = knownCities([{ name: 'Gotham', names: ['gotham'] }])
    expect(readDescription('Visit Gotham', list, TODAY).stops).toEqual(['Gotham'])
  })
})

describe('readDescription — when', () => {
  it('days, nights, weeks and weekends', () => {
    expect(read('Lisbon 5 nights').when).toEqual({ kind: 'length', days: 6 })
    expect(read('Rome for two weeks').when).toEqual({ kind: 'length', days: 14 })
    expect(read('Rome for a week').when).toEqual({ kind: 'length', days: 7 })
    expect(read('one week in Rome').when).toEqual({ kind: 'length', days: 7 })
    expect(read('a weekend in Rome').when).toEqual({ kind: 'length', days: 2 })
    expect(read('a 10-day trip to Rome').when).toEqual({ kind: 'length', days: 10 })
    expect(read('three days in Rome').when).toEqual({ kind: 'length', days: 3 })
  })

  it('caps the length at 30 days and ignores 0', () => {
    expect(read('Rome for 45 days').when).toEqual({ kind: 'length', days: 30 })
    expect(read('Rome for 0 days').when).toBeNull()
  })

  it('"next week" is timing, not a length', () => {
    expect(read('Rome next week').when).toBeNull()
  })

  it('a date range in the next such month on or after today', () => {
    expect(read('12-15 May in Lisbon').when).toEqual({ kind: 'dates', start: '2027-05-12', end: '2027-05-15' })
    expect(read('12–15 May in Lisbon').when).toEqual({ kind: 'dates', start: '2027-05-12', end: '2027-05-15' })
    expect(read('Lisbon 20-23 October').when).toEqual({ kind: 'dates', start: '2026-10-20', end: '2026-10-23' })
    expect(read('Lisbon Dec 28 - 2 Jan').when).toBeNull()
    expect(read('Lisbon 28 Dec - 2 Jan').when).toEqual({ kind: 'dates', start: '2026-12-28', end: '2027-01-02' })
    expect(read('Lisbon May 12 to 15').when).toEqual({ kind: 'dates', start: '2027-05-12', end: '2027-05-15' })
    expect(read('12-15 May in Lisbon').month).toBe(5)
  })

  it('refuses impossible or too-long ranges', () => {
    expect(read('30-31 February').when).toBeNull()
    expect(read('15-12 May').when).toBeNull()
    expect(read('1 May - 15 Jun').when).toBeNull()
  })

  it('without today, a range is read as its month only', () => {
    const r = read('12-15 May in Lisbon', null)
    expect(r.when).toBeNull()
    expect(r.month).toBe(5)
  })

  it('"may" as a verb is not a month', () => {
    expect(read('we may go to Rome').month).toBeNull()
    expect(read('Rome in May').month).toBe(5)
    expect(read('Rome in early May').month).toBe(5)
  })

  it('a length wins over a month for When?, and the month is kept', () => {
    const r = read('a week in Rome in June')
    expect(r.when).toEqual({ kind: 'length', days: 7 })
    expect(r.month).toBe(6)
  })
})

describe('readDescription — people and interests', () => {
  it('counts people', () => {
    expect(read('Rome with 3 friends')).toMatchObject({ adults: 3, kids: null })
    expect(read('Rome, 4 adults and 1 child')).toMatchObject({ adults: 4, kids: 1 })
    expect(read('Rome by myself')).toMatchObject({ adults: 1 })
    expect(read('Rome as a couple')).toMatchObject({ adults: 2 })
    expect(read('Rome family trip, 3 adults')).toMatchObject({ adults: 3 })
    expect(read('Rome')).toMatchObject({ adults: null, kids: null })
  })

  it('maps keywords to the interest chips, in chip order', () => {
    expect(read('bars, beaches, hiking trails, coffee and markets').interests).toEqual([
      'Coffee',
      'Markets',
      'Nightlife',
      'Hiking',
      'Beaches',
    ])
    expect(read('sunset viewpoints and great restaurants, relaxed').interests).toEqual(['Food', 'Views', 'Slow pace'])
    expect(read('art galleries').interests).toEqual(['Museums'])
  })

  it('stays fast and linear on very long text (T-16-37)', () => {
    const long = 'Paris then Prague, 6 days, museums. '.repeat(5000) + 'a'.repeat(100_000)
    const t0 = performance.now()
    const r = read(long)
    expect(performance.now() - t0).toBeLessThan(1000)
    expect(r.stops).toEqual(['Paris', 'Prague'])
  })
})

describe('readingToAnswers and firstMissingStep', () => {
  const base: Reading = read('Paris then Prague, 6 days, museums and architecture')

  it('fills the pass answers from a reading', () => {
    expect(readingToAnswers(base)).toEqual({
      stops: ['Paris', 'Prague'],
      when: { kind: 'length', days: 6 },
      adults: null,
      kids: null,
      interests: ['Museums', 'Architecture'],
    })
  })

  it('a chosen city chip stands in when no city was read', () => {
    const r = read('somewhere warm in March')
    expect(readingToAnswers(r, 'Lisbon').stops).toEqual(['Lisbon'])
    expect(readingToAnswers(r).stops).toEqual([])
  })

  it('kids without adults keeps adults unanswered', () => {
    expect(readingToAnswers(read('Rome with 2 kids'))).toMatchObject({ adults: null, kids: 2 })
  })

  it('the first unanswered question', () => {
    const answers = { stops: ['Paris'], when: null, adults: null, kids: null, interests: [], note: null }
    expect(firstMissingStep(answers)).toBe(2)
    expect(firstMissingStep({ ...answers, when: { kind: 'length', days: 6 } })).toBe(3)
    expect(firstMissingStep({ ...answers, when: { kind: 'length', days: 6 }, adults: 2 })).toBe(4)
    expect(firstMissingStep({ ...answers, when: { kind: 'length', days: 6 }, adults: 2, interests: ['Food'] })).toBe('ready')
    expect(firstMissingStep({ ...answers, stops: [] })).toBe(1)
  })
})

describe('KNOWN_CITIES', () => {
  it('names only, unique, folded aliases', () => {
    const names = KNOWN_CITIES.map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
    for (const c of KNOWN_CITIES) {
      expect(Object.keys(c).sort()).toEqual(['name', 'names'])
      for (const n of c.names) expect(n).toMatch(/^[a-z0-9 ]+$/)
    }
    for (const city of ['Lisbon', 'Rome', 'Paris', 'Prague', 'Kyoto']) expect(names).toContain(city)
  })

  it('knownCities puts every curated city first, then the rest without repeats', () => {
    const curated = CITY_PHOTOS.map((p) => ({ name: p.city, names: p.names }))
    const list = knownCities(curated)
    expect(list.slice(0, curated.length).map((c) => c.name)).toEqual(curated.map((c) => c.name))
    const names = list.map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
