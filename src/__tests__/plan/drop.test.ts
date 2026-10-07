import { describe, expect, it } from 'vitest'
import { bucketKey, dayOfKey, dropToPatch, moveToEnd } from '@/lib/plan/drop'
import { buildAnnouncements, DRAG_INSTRUCTIONS, type DropLocation } from '@/components/board/dnd/announcements'

const positions = { a: 1, b: 2, c: 3, x: 1, m: 1 }

describe('dropToPatch', () => {
  it('moves into another day after its last stop', () => {
    const items = { d1: ['a', 'c'], d2: ['x', 'b'], maybe: [] }
    expect(dropToPatch(items, 'b', positions)).toEqual({ day_number: 2, position: 2, index: 1 })
  })

  it('goes one before the first stop at the top of a day', () => {
    expect(dropToPatch({ d1: ['c', 'a', 'b'], d2: ['x'], maybe: [] }, 'c', positions)).toEqual({
      day_number: 1,
      position: 0,
      index: 0,
    })
  })

  it('starts an empty day at 1', () => {
    const items = { d1: ['a', 'c'], d2: ['x'], d3: ['b'], maybe: [] }
    expect(dropToPatch(items, 'b', positions)).toEqual({ day_number: 3, position: 1, index: 0 })
  })

  it('uses day_number null for Maybe', () => {
    const items = { d1: ['a', 'c'], d2: ['x'], maybe: ['m', 'b'] }
    expect(dropToPatch(items, 'b', positions)).toEqual({ day_number: null, position: 2, index: 1 })
  })

  it('takes the midpoint when reordering inside a day', () => {
    const items = { d1: ['a', 'c', 'b'], d2: ['x'], maybe: [] }
    expect(dropToPatch(items, 'c', positions)).toEqual({
      day_number: 1,
      position: 1.5,
      index: 1,
    })
    expect(items.d1).toEqual(['a', 'c', 'b'])
  })

  it('ignores the moved place’s own old position', () => {
    // b (position 2) moved between a (1) and c (3): midpoint of a and c.
    const items = { d1: ['a', 'b', 'c'], maybe: [] }
    expect(dropToPatch(items, 'b', positions)).toEqual({ day_number: 1, position: 2, index: 1 })
  })

  it('treats a neighbour without a position as missing', () => {
    const items = { d1: ['n', 'b'], maybe: [] }
    expect(dropToPatch(items, 'b', { n: null, b: 4 })).toEqual({ day_number: 1, position: 1, index: 1 })
  })

  it('returns null when the place is in no bucket', () => {
    expect(dropToPatch({ d1: ['a'], maybe: [] }, 'zz', positions)).toBeNull()
  })
})

describe('bucket keys', () => {
  it('maps days and Maybe to keys and back', () => {
    expect(bucketKey(3)).toBe('d3')
    expect(bucketKey(null)).toBe('maybe')
    expect(dayOfKey('d12')).toBe(12)
    expect(dayOfKey('maybe')).toBeNull()
  })
})

describe('moveToEnd', () => {
  it('appends the place to the end of another bucket', () => {
    const items = { d1: ['a', 'b', 'c'], d2: ['x'], maybe: [] }
    expect(moveToEnd(items, 'b', 'd2')).toEqual({ d1: ['a', 'c'], d2: ['x', 'b'], maybe: [] })
    expect(items.d1).toEqual(['a', 'b', 'c'])
  })

  it('appends into Maybe', () => {
    expect(moveToEnd({ d1: ['a'], maybe: ['m'] }, 'a', 'maybe')).toEqual({ d1: [], maybe: ['m', 'a'] })
  })

  it('leaves items alone for an unknown place or bucket', () => {
    const items = { d1: ['a'], maybe: [] }
    expect(moveToEnd(items, 'zz', 'd1')).toBe(items)
    expect(moveToEnd(items, 'a', 'd9')).toBe(items)
  })
})

describe('buildAnnouncements', () => {
  const names: Record<string, string> = { b: 'Livraria Bertrand', m: 'MAAT' }
  const nameOf = (id: string) => names[id] ?? id
  const where: Record<string, Partial<Record<string, DropLocation>>> = {
    b: { start: { day: 1, stop: 2 }, over: { day: 2, stop: 1 }, end: { day: 2, stop: 2 }, cancel: { day: 1, stop: 2 } },
    m: { start: { day: null, stop: 1 }, over: { day: null, stop: 1 }, end: { day: null, stop: 2 }, cancel: { day: null, stop: 1 } },
  }
  const locate = (id: string, when: 'start' | 'over' | 'end' | 'cancel') => where[id]?.[when] ?? null
  const { announcements, screenReaderInstructions } = buildAnnouncements(nameOf, locate)
  const ev = (id: string | null, canceled = false) => ({
    operation: { source: id === null ? null : { id }, target: null },
    canceled,
  })

  it('says where the place was picked up', () => {
    expect(announcements.dragstart(ev('b'))).toBe('Picked up Livraria Bertrand, day 1, stop 2.')
    expect(announcements.dragstart(ev('m'))).toBe('Picked up MAAT from Maybe.')
  })

  it('says where the place was dropped', () => {
    expect(announcements.dragend(ev('b'))).toBe('Livraria Bertrand moved to day 2, position 2.')
    expect(announcements.dragend(ev('m'))).toBe('MAAT moved to Maybe.')
  })

  it('says where a cancelled place is back', () => {
    expect(announcements.dragend(ev('b', true))).toBe('Move cancelled. Livraria Bertrand is back on day 1, stop 2.')
    expect(announcements.dragend(ev('m', true))).toBe('Move cancelled. MAAT is back in Maybe.')
  })

  it('says where the place would land while it moves', () => {
    expect(announcements.dragover(ev('b'))).toBe('Livraria Bertrand: day 2, stop 1.')
    expect(announcements.dragover(ev('m'))).toBe('MAAT: Maybe.')
  })

  it('says nothing without a source or a location', () => {
    expect(announcements.dragstart(ev(null))).toBeUndefined()
    expect(announcements.dragend(ev('unknown'))).toBeUndefined()
    expect(announcements.dragover(ev('unknown'))).toBeUndefined()
  })

  it('gives keyboard instructions in plain words', () => {
    expect(screenReaderInstructions.draggable).toBe(DRAG_INSTRUCTIONS)
    expect(DRAG_INSTRUCTIONS).toBe(
      'Press Space or Enter to pick up the place. Use arrow keys to move, Space or Enter to drop, Escape to cancel.'
    )
  })
})
