import { describe, it, expect } from 'vitest'
import { sectionTrips } from '@/lib/home/sections'

// Test dates only. "today" is 2026-05-12 throughout.
const TODAY = '2026-05-12'

type T = { id: string; start_date: string | null; end_date: string | null; updated_at: string | null }

function t(id: string, start: string | null, end: string | null, updated = '2026-01-01T00:00:00Z'): T {
  return { id, start_date: start, end_date: end, updated_at: updated }
}

const ids = (list: T[]) => list.map((x) => x.id)

describe('sectionTrips', () => {
  it('a trip with start ≤ today ≤ end is now; upcoming keeps the rest, soonest first', () => {
    const s = sectionTrips(
      [
        t('later', '2026-06-01', '2026-06-03'),
        t('current', '2026-05-11', '2026-05-13'),
        t('soon', '2026-05-20', '2026-05-22'),
      ],
      TODAY
    )
    expect(s.now?.id).toBe('current')
    expect(s.next).toBeNull()
    expect(ids(s.upcoming)).toEqual(['soon', 'later'])
    expect(s.past).toEqual([])
  })

  it('start and end days both count as during the trip', () => {
    expect(sectionTrips([t('a', '2026-05-12', '2026-05-14')], TODAY).now?.id).toBe('a')
    expect(sectionTrips([t('b', '2026-05-10', '2026-05-12')], TODAY).now?.id).toBe('b')
  })

  it('without a current trip, next is the soonest dated upcoming trip', () => {
    const s = sectionTrips(
      [t('later', '2026-06-01', '2026-06-03'), t('soon', '2026-05-13', '2026-05-15'), t('undated', null, null, '2026-05-11T00:00:00Z')],
      TODAY
    )
    expect(s.now).toBeNull()
    expect(s.next?.id).toBe('soon')
    expect(ids(s.upcoming)).toEqual(['later', 'undated'])
  })

  it('with no dated upcoming trip, next is the most recently updated undated trip', () => {
    const s = sectionTrips(
      [t('old', null, null, '2026-03-01T00:00:00Z'), t('fresh', null, null, '2026-05-01T00:00:00Z'), t('gone', '2026-04-01', '2026-04-03')],
      TODAY
    )
    expect(s.next?.id).toBe('fresh')
    expect(ids(s.upcoming)).toEqual(['old'])
    expect(ids(s.past)).toEqual(['gone'])
  })

  it('upcoming: dated soonest first, then undated by updated_at desc (null last)', () => {
    const s = sectionTrips(
      [
        t('u-null', null, null, null as unknown as string),
        t('u-old', null, null, '2026-02-01T00:00:00Z'),
        t('d-30', '2026-06-11', '2026-06-12'),
        t('u-new', null, null, '2026-04-01T00:00:00Z'),
        t('d-20', '2026-06-01', '2026-06-03'),
        t('current', '2026-05-12', '2026-05-12'),
      ],
      TODAY
    )
    expect(s.now?.id).toBe('current')
    expect(ids(s.upcoming)).toEqual(['d-20', 'd-30', 'u-new', 'u-old', 'u-null'])
  })

  it('past = end < today, latest end first', () => {
    const s = sectionTrips(
      [t('jan', '2026-01-01', '2026-01-05'), t('apr', '2026-04-01', '2026-04-03'), t('yesterday', '2026-05-09', '2026-05-11')],
      TODAY
    )
    expect(ids(s.past)).toEqual(['yesterday', 'apr', 'jan'])
    expect(s.now).toBeNull()
    expect(s.next).toBeNull()
    expect(s.upcoming).toEqual([])
  })

  it('two trips at once: the earlier start is now, the other stays in upcoming', () => {
    const s = sectionTrips([t('b', '2026-05-12', '2026-05-20'), t('a', '2026-05-10', '2026-05-13')], TODAY)
    expect(s.now?.id).toBe('a')
    expect(ids(s.upcoming)).toEqual(['b'])
  })

  it('a start date without an end date is a one-day trip', () => {
    expect(sectionTrips([t('x', '2026-05-12', null)], TODAY).now?.id).toBe('x')
    expect(ids(sectionTrips([t('y', '2026-05-11', null)], TODAY).past)).toEqual(['y'])
  })

  it('no trips: everything empty', () => {
    expect(sectionTrips([], TODAY)).toEqual({ now: null, next: null, upcoming: [], past: [] })
  })

  it('does not change the input array', () => {
    const list = [t('b', '2026-06-01', '2026-06-02'), t('a', '2026-05-20', '2026-05-21')]
    sectionTrips(list, TODAY)
    expect(ids(list)).toEqual(['b', 'a'])
  })
})
