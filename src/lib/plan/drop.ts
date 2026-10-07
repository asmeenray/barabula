// Drop maths for drag and drop on the plan (16-14, D-22). Pure: the drag
// layer keeps the board as Record<bucketKey, activityId[]> (keys d1…dN and
// maybe) while a place is dragged; on drop this turns the place's new slot
// into the one PATCH { day_number, position } a menu move would send.

import { positionBetween } from './ordering'

/** Buckets in the drag layer: 'd1'…'dN' and 'maybe', each a list of activity ids in board order. */
export type DropItems = Record<string, string[]>

/** Where a dropped place lands. index = its stop index in the new bucket (0-based). */
export interface DropPatch {
  day_number: number | null
  position: number
  index: number
}

export function bucketKey(day: number | null): string {
  return day === null ? 'maybe' : `d${day}`
}

/** 'd3' → 3, 'maybe' → null. */
export function dayOfKey(key: string): number | null {
  return key === 'maybe' ? null : Number(key.slice(1))
}

/** The bucket key holding this id, or null. */
export function bucketOfId(items: DropItems, id: string): string | null {
  for (const [key, ids] of Object.entries(items)) {
    if (ids.includes(id)) return key
  }
  return null
}

/**
 * The PATCH for a place at its slot in `items`: its bucket's day (Maybe = null)
 * and a position halfway between its new neighbours (Research Pattern 5).
 * A neighbour without a stored position counts as missing; usePlan renumbers
 * the bucket in that case before it saves. Null when the id is in no bucket.
 */
export function dropToPatch(
  items: DropItems,
  activeId: string,
  positions: Record<string, number | null | undefined>
): DropPatch | null {
  const key = bucketOfId(items, activeId)
  if (key === null) return null
  const ids = items[key]
  const index = ids.indexOf(activeId)
  const prev = index > 0 ? (positions[ids[index - 1]] ?? null) : null
  const next = index < ids.length - 1 ? (positions[ids[index + 1]] ?? null) : null
  return { day_number: dayOfKey(key), position: positionBetween(prev, next), index }
}

/** The place taken out of its bucket and appended to `to` (a drop on a day tab or header). */
export function moveToEnd(items: DropItems, activeId: string, to: string): DropItems {
  const from = bucketOfId(items, activeId)
  if (from === null || !(to in items)) return items
  const next: DropItems = { ...items, [from]: items[from].filter((id) => id !== activeId) }
  next[to] = [...next[to].filter((id) => id !== activeId), activeId]
  return next
}
