import { describe, expect, it } from 'vitest'
import { dayCountFor, groupDays, sortActivities } from '@/lib/plan/days'

type Row = { id: string; day_number: number | null; position: number | null }

const row = (id: string, day_number: number | null, position: number | null): Row => ({
  id,
  day_number,
  position,
})

describe('sortActivities', () => {
  it('puts day 1 before day 2 and Maybe (null day) last', () => {
    const sorted = sortActivities([row('m', null, 1), row('b', 2, 1), row('a', 1, 1)])
    expect(sorted.map((r) => r.id)).toEqual(['a', 'b', 'm'])
  })

  it('orders by position within a day, null position last', () => {
    const sorted = sortActivities([row('x', 1, null), row('y', 1, 2.5), row('z', 1, 0.5)])
    expect(sorted.map((r) => r.id)).toEqual(['z', 'y', 'x'])
  })

  it('breaks ties by id', () => {
    const sorted = sortActivities([row('c', 1, 1), row('a', 1, 1), row('b', 1, 1)])
    expect(sorted.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not change the input array', () => {
    const input = [row('b', 2, 1), row('a', 1, 1)]
    sortActivities(input)
    expect(input.map((r) => r.id)).toEqual(['b', 'a'])
  })
})

describe('dayCountFor', () => {
  const undated = { start_date: null, end_date: null, extra_data: null }

  it('counts inclusive days for a dated trip', () => {
    expect(dayCountFor({ start_date: '2026-05-12', end_date: '2026-05-14', extra_data: null }, [])).toBe(3)
  })

  it('caps a 45-day range at 30', () => {
    expect(dayCountFor({ start_date: '2026-05-01', end_date: '2026-06-14', extra_data: null }, [])).toBe(30)
  })

  it('uses extra_data.day_count for an undated trip', () => {
    expect(dayCountFor({ ...undated, extra_data: { day_count: 2 } }, [{ day_number: 1 }])).toBe(2)
  })

  it('falls back to the highest day_number', () => {
    expect(dayCountFor(undated, [{ day_number: 1 }, { day_number: 4 }, { day_number: null }])).toBe(4)
  })

  it('is 1 for an empty undated trip', () => {
    expect(dayCountFor(undated, [])).toBe(1)
  })
})

describe('groupDays', () => {
  it('returns 3 day arrays and the Maybe array for a 3-day trip', () => {
    const { days, maybe } = groupDays(
      [row('d3', 3, 1), row('m', null, 1), row('d1b', 1, 2), row('d1a', 1, 1), row('d2', 2, 1)],
      3
    )
    expect(days.map((d) => d.map((r) => r.id))).toEqual([['d1a', 'd1b'], ['d2'], ['d3']])
    expect(maybe.map((r) => r.id)).toEqual(['m'])
  })

  it('keeps empty days and never hides a day beyond the count', () => {
    const { days } = groupDays([row('late', 5, 1)], 3)
    expect(days).toHaveLength(5)
    expect(days[4].map((r) => r.id)).toEqual(['late'])
    expect(days[0]).toEqual([])
  })
})
