import { describe, it, expect } from 'vitest'
import { legacyTimeRank, legacyOrder } from '@/lib/plan/legacy-order'

describe('legacyTimeRank (the pre-phase-16 on-screen order)', () => {
  it('ranks part-of-day words 0..3, case-insensitive', () => {
    expect(legacyTimeRank('morning')).toBe(0)
    expect(legacyTimeRank('Afternoon')).toBe(1)
    expect(legacyTimeRank('evening')).toBe(2)
    expect(legacyTimeRank('NIGHT')).toBe(3)
  })

  it('ranks 12-hour clock times as minutes after midnight', () => {
    expect(legacyTimeRank('9:00 AM')).toBe(540)
    expect(legacyTimeRank('12:30 PM')).toBe(750)
    expect(legacyTimeRank('12:00 AM')).toBe(0)
    expect(legacyTimeRank('1:05 pm')).toBe(785)
    expect(legacyTimeRank('9:00AM')).toBe(540)
  })

  it('keeps the old quirk for out-of-range 12-hour hours (13:00 PM = 25h)', () => {
    expect(legacyTimeRank('13:00 PM')).toBe(1500)
  })

  it('falls back to 10 plus the leading number', () => {
    expect(legacyTimeRank('14:00')).toBe(24)
    expect(legacyTimeRank('9:30')).toBeCloseTo(19.3, 10)
    expect(legacyTimeRank('10am')).toBe(20)
    expect(legacyTimeRank('Lunch')).toBe(10)
    expect(legacyTimeRank('')).toBe(10)
    expect(legacyTimeRank(null)).toBe(10)
  })
})

describe('legacyOrder', () => {
  it('groups by day and sorts each day by legacyTimeRank, keeping input order for ties', () => {
    const rows = [
      { id: 'a', day_number: 1, time: 'Evening' },
      { id: 'b', day_number: 2, time: '9:00 AM' },
      { id: 'c', day_number: 1, time: 'morning' },
      { id: 'd', day_number: 1, time: 'Lunch' },
      { id: 'e', day_number: 1, time: null },
      { id: 'f', day_number: 2, time: '12:00 AM' },
      { id: 'g', day_number: 1, time: '' },
    ]
    const order = legacyOrder(rows)
    expect(order.get(1)).toEqual(['c', 'a', 'd', 'e', 'g'])
    expect(order.get(2)).toEqual(['f', 'b'])
    expect([...order.keys()]).toEqual([1, 2])
  })

  it('does not mutate its input', () => {
    const rows = [
      { id: 'x', day_number: 1, time: 'night' },
      { id: 'y', day_number: 1, time: 'morning' },
    ]
    legacyOrder(rows)
    expect(rows.map((r) => r.id)).toEqual(['x', 'y'])
  })
})
