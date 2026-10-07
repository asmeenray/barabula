import { describe, expect, it } from 'vitest'
import { needsRenumber, positionBetween, renumberDay } from '@/lib/plan/ordering'

describe('positionBetween', () => {
  it('starts an empty bucket at 1', () => {
    expect(positionBetween(null, null)).toBe(1)
  })
  it('goes one before the first item', () => {
    expect(positionBetween(null, 3)).toBe(2)
  })
  it('goes one after the last item', () => {
    expect(positionBetween(4, null)).toBe(5)
  })
  it('takes the midpoint between two neighbours', () => {
    expect(positionBetween(1, 2)).toBe(1.5)
  })
})

describe('needsRenumber', () => {
  it('is true when the gap is too small to split', () => {
    expect(needsRenumber(1, 1.0000001)).toBe(true)
  })
  it('is false for a normal gap', () => {
    expect(needsRenumber(1, 2)).toBe(false)
  })
})

describe('renumberDay', () => {
  it('numbers ids 1…n in the given order', () => {
    expect(renumberDay(['c', 'a', 'b'])).toEqual([
      { id: 'c', position: 1 },
      { id: 'a', position: 2 },
      { id: 'b', position: 3 },
    ])
  })
  it('returns an empty list for an empty day', () => {
    expect(renumberDay([])).toEqual([])
  })
})
