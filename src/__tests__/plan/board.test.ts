import { describe, expect, it } from 'vitest'
import { chipFor, dayDate, dayTitle, nextStopId, stopsLabel } from '@/lib/plan/board'

const stop = (id: string, visited?: unknown, day_number: number | null = 1) => ({
  id,
  day_number,
  extra_data: visited === undefined ? {} : { visited },
})

describe('nextStopId', () => {
  it('is the first stop that is not visited', () => {
    expect(nextStopId([stop('a', true), stop('b'), stop('c')])).toBe('b')
  })

  it('is the first stop when nothing is visited', () => {
    expect(nextStopId([stop('a'), stop('b')])).toBe('a')
  })

  it('only treats visited === true as visited', () => {
    expect(nextStopId([stop('a', 'true'), stop('b')])).toBe('a')
    expect(nextStopId([{ id: 'x', day_number: 1, extra_data: null }])).toBe('x')
  })

  it('is null when every stop is visited', () => {
    expect(nextStopId([stop('a', true), stop('b', true)])).toBeNull()
  })

  it('is null for an empty day', () => {
    expect(nextStopId([])).toBeNull()
  })
})

describe('chipFor', () => {
  it('is MAYBE for a place without a day, even when visited', () => {
    expect(chipFor(stop('m', undefined, null), 'm')).toBe('MAYBE')
    expect(chipFor(stop('m', true, null), null)).toBe('MAYBE')
  })

  it('is VISITED for a visited stop', () => {
    expect(chipFor(stop('a', true), 'b')).toBe('VISITED')
  })

  it('is NEXT for the next stop', () => {
    expect(chipFor(stop('b'), 'b')).toBe('NEXT')
  })

  it('is LATER for any other stop', () => {
    expect(chipFor(stop('c'), 'b')).toBe('LATER')
    expect(chipFor(stop('c'), null)).toBe('LATER')
  })
})

describe('dayDate / dayTitle', () => {
  it('counts days from the start date as calendar dates', () => {
    expect(dayTitle('2026-05-12', 1)).toBe('Tue 12 May')
    expect(dayTitle('2026-05-31', 2)).toBe('Mon 1 Jun')
  })

  it('reads only the date part of the string', () => {
    expect(dayDate('2026-12-31T23:30:00-05:00', 1)).toEqual({ weekday: 'Thu', day: 31, month: 'Dec' })
  })

  it('falls back to Day {n} for undated trips', () => {
    expect(dayDate(null, 2)).toBeNull()
    expect(dayTitle(null, 2)).toBe('Day 2')
  })
})

describe('stopsLabel', () => {
  it('uses the singular for one stop', () => {
    expect(stopsLabel(1)).toBe('1 stop')
    expect(stopsLabel(0)).toBe('0 stops')
    expect(stopsLabel(4)).toBe('4 stops')
  })
})
