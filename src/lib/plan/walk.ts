// Walk estimates for the trip plan board (UI-SPEC §7, discretion 13).
// Straight-line distance × 1.3 at 80 m/min, always shown with "~". No routing
// API is called. Only cached OSM coordinates count; stops without them are
// skipped by the route and show "—" in the walk column.

import { osmCoordsFrom } from '@/lib/geo-cache'
import type { ExtraData } from './types'

/** Straight line → walking distance factor. */
export const WALK_FACTOR = 1.3
/** Walking pace (4.8 km/h). */
export const WALK_METRES_PER_MIN = 80

const EARTH_RADIUS_M = 6_371_008.8

type Located = { extra_data: ExtraData }
type Coords = { lat: number; lng: number }

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function haversineMetres(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

function walkMetres(a: Coords, b: Coords): number {
  return haversineMetres(a, b) * WALK_FACTOR
}

/** Minutes on foot from a to b (at least 1), or null when either has no coordinates. */
export function walkMinutes(a: Located, b: Located): number | null {
  const from = osmCoordsFrom(a.extra_data)
  const to = osmCoordsFrom(b.extra_data)
  if (!from || !to) return null
  return Math.max(1, Math.round(walkMetres(from, to) / WALK_METRES_PER_MIN))
}

/** Walking km for a day: consecutive located stops, unlocated ones skipped, 0.1 km steps. */
export function dayKm(acts: readonly Located[]): number {
  let metres = 0
  let prev: Coords | null = null
  for (const a of acts) {
    const here = osmCoordsFrom(a.extra_data)
    if (!here) continue
    if (prev) metres += walkMetres(prev, here)
    prev = here
  }
  return Math.round(metres / 100) / 10
}

/** One walk cell per stop: 'start' for the first located stop, minutes from the
 *  previous located stop after it, null for stops without coordinates. */
export type WalkCell = 'start' | number | null

export function walkCells(acts: readonly Located[]): WalkCell[] {
  let prev: Located | null = null
  return acts.map((a) => {
    if (!osmCoordsFrom(a.extra_data)) return null
    const cell: WalkCell = prev ? walkMinutes(prev, a) : 'start'
    prev = a
    return cell
  })
}
