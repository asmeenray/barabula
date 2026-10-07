import { describe, it, expect } from 'vitest'
import { PassCreateSchema } from '@/lib/pass/schema'
import { INTEREST_CHIPS } from '@/lib/pass/interests'
import { rangeProblem, spanDays } from '@/lib/pass/dates'

const REF = '3b241101-e2bb-4255-8caf-4136c566a962'

const valid = {
  stops: ['Lisbon'],
  when: { kind: 'length', days: 3 },
  adults: 2,
  kids: 0,
  interests: ['Food'],
  note: null,
  client_ref: REF,
}

const parse = (patch: Record<string, unknown>) => PassCreateSchema.safeParse({ ...valid, ...patch })

describe('PassCreateSchema', () => {
  it('accepts a full pass', () => {
    const r = PassCreateSchema.safeParse(valid)
    expect(r.success).toBe(true)
    expect(r.data).toEqual(valid)
  })

  it('accepts when unsure and when null', () => {
    expect(parse({ when: { kind: 'unsure' } }).success).toBe(true)
    expect(parse({ when: null }).success).toBe(true)
  })

  it('accepts a 30-day date range and fills skipped answers with null / []', () => {
    const r = PassCreateSchema.safeParse({
      stops: [' Lisbon ', 'Prague'],
      when: { kind: 'dates', start: '2026-05-01', end: '2026-05-30' },
      client_ref: REF,
    })
    expect(r.success).toBe(true)
    expect(r.data).toMatchObject({ stops: ['Lisbon', 'Prague'], adults: null, kids: null, interests: [], note: null })
  })

  it.each([
    ['0 stops', { stops: [] }],
    ['11 stops', { stops: Array.from({ length: 11 }, (_, i) => `City ${i}`) }],
    ['a blank stop', { stops: ['   '] }],
    ['a stop of 81 chars', { stops: ['x'.repeat(81)] }],
    ['length 31', { when: { kind: 'length', days: 31 } }],
    ['length 0', { when: { kind: 'length', days: 0 } }],
    ['a fractional length', { when: { kind: 'length', days: 2.5 } }],
    ['dates spanning 31 days', { when: { kind: 'dates', start: '2026-05-01', end: '2026-05-31' } }],
    ['end before start', { when: { kind: 'dates', start: '2026-05-15', end: '2026-05-12' } }],
    ['an impossible date', { when: { kind: 'dates', start: '2026-02-30', end: '2026-03-02' } }],
    ['dates and days together', { when: { kind: 'dates', start: '2026-05-12', end: '2026-05-15', days: 4 } }],
    ['adults 0', { adults: 0 }],
    ['adults 21', { adults: 21 }],
    ['kids 21', { kids: 21 }],
    ['kids -1', { kids: -1 }],
    ['an interest not in the chip list', { interests: ['Shopping'] }],
    ['a note over 5000 chars', { note: 'x'.repeat(5001) }],
    ['a non-uuid client_ref', { client_ref: 'not-a-uuid' }],
    ['an unknown key', { user_id: REF }],
    ['a "from" field (D-14)', { from: 'London' }],
  ])('rejects %s', (_name, patch) => {
    expect(parse(patch).success).toBe(false)
  })

  it('takes every chip label', () => {
    const r = parse({ interests: [...INTEREST_CHIPS] })
    expect(r.success).toBe(true)
    expect(r.data?.interests).toEqual([...INTEREST_CHIPS])
  })

  it('drops duplicate interests', () => {
    expect(parse({ interests: ['Food', 'Food', 'Views'] }).data?.interests).toEqual(['Food', 'Views'])
  })

  it('stores a blank note as null', () => {
    expect(parse({ note: '   ' }).data?.note).toBeNull()
  })
})

describe('date range helpers', () => {
  it('counts inclusive days', () => {
    expect(spanDays('2026-05-12', '2026-05-15')).toBe(4)
    expect(spanDays('2026-05-12', '2026-05-12')).toBe(1)
  })

  it('names the problem with a range', () => {
    expect(rangeProblem('2026-05-12', '2026-05-15')).toBeNull()
    expect(rangeProblem('2026-05-15', '2026-05-12')).toBe('end-before-start')
    expect(rangeProblem('2026-05-01', '2026-05-31')).toBe('too-long')
    expect(rangeProblem('2026-05-01', '2026-05-30')).toBeNull()
  })
})
