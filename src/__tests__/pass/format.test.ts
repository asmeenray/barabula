import { describe, it, expect } from 'vitest'
import { intoLine, passTitle, whenLine, whoLine } from '@/lib/pass/format'
import { CITY_PHOTOS } from '@/lib/photos/manifest'
import { photoFor } from '@/lib/photos/match'

// Values are sentence case; the pass shows them uppercase with CSS. The
// uppercase form is what the UI-SPEC copy table lists.
const shown = (s: string | null) => s?.toUpperCase() ?? null

const manifestCode = (stop: string) => photoFor(stop)?.iata

describe('passTitle', () => {
  it('one stop is that stop', () => {
    expect(passTitle(['Lisbon'], manifestCode)).toBe('Lisbon')
  })

  it('uses codes only when every stop has one', () => {
    // An injected lookup with codes for both stops.
    const codes: Record<string, string> = { Lisbon: 'LIS', Prague: 'PRG' }
    expect(passTitle(['Lisbon', 'Prague'], (s) => codes[s])).toBe('LIS → PRG')
  })

  it('falls back to names when a stop has no code in the manifest', () => {
    expect(CITY_PHOTOS.some((p) => p.names.includes('bordeaux'))).toBe(false)
    expect(passTitle(['Lisbon', 'Bordeaux'], manifestCode)).toBe('Lisbon → Bordeaux')
    expect(passTitle(['Lisbon', 'Prague'], manifestCode)).toBe('LIS → PRG')
  })

  it('names without a lookup, and ignores blank stops', () => {
    expect(passTitle(['Lisbon', ' ', 'Porto'])).toBe('Lisbon → Porto')
    expect(passTitle([])).toBe('')
  })
})

describe('stamp line values', () => {
  it('whenLine', () => {
    expect(shown(whenLine({ kind: 'dates', start: '2026-05-12', end: '2026-05-15' }))).toBe('12–15 MAY')
    expect(whenLine({ kind: 'dates', start: '2026-05-28', end: '2026-06-02' })).toBe('28 May – 2 Jun')
    expect(whenLine({ kind: 'dates', start: '2026-05-12', end: '2026-05-12' })).toBe('12 May')
    expect(shown(whenLine({ kind: 'length', days: 4 }))).toBe('4 DAYS')
    expect(whenLine({ kind: 'length', days: 1 })).toBe('1 day')
    expect(shown(whenLine({ kind: 'unsure' }))).toBe('NOT SURE YET')
    expect(whenLine(null)).toBeNull()
  })

  it('whoLine', () => {
    expect(shown(whoLine(2, 1))).toBe('2 ADULTS · 1 KID')
    expect(whoLine(1, 0)).toBe('1 adult')
    expect(whoLine(1, 3)).toBe('1 adult · 3 kids')
    expect(whoLine(null, null)).toBeNull()
  })

  it('intoLine', () => {
    expect(shown(intoLine(['Food', 'Views'], 'no early starts'))).toBe('FOOD · VIEWS + NOTE')
    expect(intoLine(['Food'], null)).toBe('Food')
    expect(intoLine([], 'no early starts')).toBe('Note')
    expect(intoLine([], '  ')).toBeNull()
  })
})
