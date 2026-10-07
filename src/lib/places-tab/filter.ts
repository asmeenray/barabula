// Places tab data (D-28, UI-SPEC §10): every place across the user's own
// trips as one flat list, plus the filters (trip, visited, type, search) and
// the grouping the list shows. Pure; the page builds the points on the
// server and the client filters data it already has (no query is built from
// the search text, T-16-53).

import { osmCoordsFrom } from '@/lib/geo-cache'
import { compareActivities } from '@/lib/plan/days'
import type { ExtraData } from '@/lib/plan/types'

/** 'stays' = hotels; everything else is a place (UI-SPEC: only the types in the data are offered). */
export type PlaceType = 'places' | 'stays'

export const PLACE_TYPES: readonly PlaceType[] = ['places', 'stays']

export interface PlacePoint {
  id: string
  name: string
  location: string | null
  type: PlaceType
  tripId: string
  tripTitle: string
  /** null = Maybe. */
  day: number | null
  /** Plan order inside the day. */
  position: number | null
  visited: boolean
  /** Cached OSM coordinates; null = not on the map. */
  coords: { lat: number; lng: number } | null
}

/** What the list needs to order trips the way home does. */
export interface PlaceTrip {
  id: string
  title: string
  start_date: string | null
  updated_at: string | null
}

export type VisitedFilter = 'all' | 'to-visit' | 'visited'

export interface PlaceFilters {
  /** null = All trips. */
  tripId: string | null
  visited: VisitedFilter
  /** null = All types. */
  type: PlaceType | null
  q: string
}

export const NO_FILTERS: PlaceFilters = { tripId: null, visited: 'all', type: null, q: '' }

export function typeOf(a: { activity_type: string | null }): PlaceType {
  return a.activity_type === 'hotel' ? 'stays' : 'places'
}

/** The types present in the data, in filter order. */
export function availableTypes(points: readonly Pick<PlacePoint, 'type'>[]): PlaceType[] {
  const seen = new Set(points.map((p) => p.type))
  return PLACE_TYPES.filter((t) => seen.has(t))
}

/** Lower case without accents, so "belem" finds "Belém" and "karluv" finds "Karlův". */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

export function isFiltered(f: PlaceFilters): boolean {
  return f.tripId !== null || f.visited !== 'all' || f.type !== null || fold(f.q) !== ''
}

export function filterPlaces(points: readonly PlacePoint[], f: PlaceFilters): PlacePoint[] {
  const q = fold(f.q)
  return points.filter(
    (p) =>
      (f.tripId === null || p.tripId === f.tripId) &&
      (f.visited === 'all' || p.visited === (f.visited === 'visited')) &&
      (f.type === null || p.type === f.type) &&
      (q === '' || fold(p.name).includes(q) || (p.location !== null && fold(p.location).includes(q)))
  )
}

export interface TripGroup {
  trip: PlaceTrip
  places: PlacePoint[]
}

function time(iso: string | null): number {
  const t = iso ? Date.parse(iso) : Number.NaN
  return Number.isFinite(t) ? t : -Infinity
}

/** Home order: dated trips soonest first, then undated ones (most recently edited first). */
function compareTrips(a: PlaceTrip, b: PlaceTrip): number {
  if (a.start_date && b.start_date) {
    if (a.start_date !== b.start_date) return a.start_date < b.start_date ? -1 : 1
  } else if (a.start_date || b.start_date) {
    return a.start_date ? -1 : 1
  } else {
    const ta = time(a.updated_at)
    const tb = time(b.updated_at)
    if (ta !== tb) return tb > ta ? 1 : -1
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** Trips in home order with their places in plan order; trips with no places are left out. */
export function groupByTrip(points: readonly PlacePoint[], trips: readonly PlaceTrip[]): TripGroup[] {
  const byTrip = new Map<string, PlacePoint[]>()
  for (const p of points) {
    const list = byTrip.get(p.tripId)
    if (list) list.push(p)
    else byTrip.set(p.tripId, [p])
  }
  return [...trips]
    .sort(compareTrips)
    .filter((t) => byTrip.has(t.id))
    .map((trip) => ({
      trip,
      places: (byTrip.get(trip.id) ?? [])
        .map((p) => ({ p, o: { id: p.id, day_number: p.day, position: p.position } }))
        .sort((a, b) => compareActivities(a.o, b.o))
        .map(({ p }) => p),
    }))
}

/** One itinerary as the Places page reads it (RLS client, own rows only). */
export interface PlacesRow {
  id: string
  title: string
  destination: string | null
  start_date: string | null
  end_date: string | null
  updated_at: string | null
  activities:
    | {
        id: string
        name: string
        location: string | null
        activity_type: string | null
        day_number: number | null
        position: number | null
        extra_data: ExtraData
      }[]
    | null
}

export function toPlaces(rows: readonly PlacesRow[]): { trips: PlaceTrip[]; points: PlacePoint[] } {
  const trips: PlaceTrip[] = []
  const points: PlacePoint[] = []
  for (const row of rows) {
    const title = row.title?.trim() || row.destination?.trim() || 'Trip'
    trips.push({ id: row.id, title, start_date: row.start_date, updated_at: row.updated_at })
    for (const a of row.activities ?? []) {
      points.push({
        id: a.id,
        name: a.name,
        location: a.location?.trim() || null,
        type: typeOf(a),
        tripId: row.id,
        tripTitle: title,
        day: a.day_number,
        position: a.position,
        visited: a.extra_data?.visited === true,
        coords: osmCoordsFrom(a.extra_data),
      })
    }
  }
  return { trips, points }
}
