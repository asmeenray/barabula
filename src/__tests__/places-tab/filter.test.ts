import { describe, expect, it } from 'vitest'
import {
  availableTypes,
  filterPlaces,
  groupByTrip,
  isFiltered,
  NO_FILTERS,
  toPlaces,
  typeOf,
  type PlacePoint,
  type PlaceTrip,
} from '@/lib/places-tab/filter'
import { TRIP_COLORS, tripColor } from '@/lib/places-tab/colors'

// Places tab helpers (16-18, D-28): every place across the user's trips,
// filtered by trip, visited, type and a search box, grouped by trip.

function point(id: string, over: Partial<PlacePoint> = {}): PlacePoint {
  return {
    id,
    name: id,
    location: null,
    type: 'places',
    tripId: 'lisbon',
    tripTitle: 'Lisbon',
    day: 1,
    position: 1,
    visited: false,
    coords: null,
    ...over,
  }
}

function trip(id: string, start: string | null, updated: string | null = null): PlaceTrip {
  return { id, title: id, start_date: start, updated_at: updated }
}

describe('typeOf', () => {
  it('reads hotels as stays and everything else as places', () => {
    expect(typeOf({ activity_type: 'hotel' })).toBe('stays')
    expect(typeOf({ activity_type: 'activity' })).toBe('places')
    expect(typeOf({ activity_type: 'restaurant' })).toBe('places')
    expect(typeOf({ activity_type: null })).toBe('places')
  })
})

describe('availableTypes', () => {
  it('lists only the types present, places first', () => {
    expect(availableTypes([point('a')])).toEqual(['places'])
    expect(availableTypes([point('a', { type: 'stays' })])).toEqual(['stays'])
    expect(availableTypes([point('a', { type: 'stays' }), point('b')])).toEqual(['places', 'stays'])
    expect(availableTypes([])).toEqual([])
  })
})

describe('filterPlaces', () => {
  const all = [
    point('Praça do Comércio', { location: 'Baixa' }),
    point('Time Out Market', { location: 'Cais do Sodré', visited: true }),
    point('Pastéis de Belém', { location: 'Belém' }),
    point('Hotel Avenida', { type: 'stays', location: 'Avenida' }),
    point('Karlův most', { tripId: 'prague', tripTitle: 'Prague', location: 'Staré Město' }),
  ]
  const names = (ps: PlacePoint[]) => ps.map((p) => p.name)

  it('returns everything with no filters', () => {
    expect(filterPlaces(all, NO_FILTERS)).toHaveLength(5)
  })

  it('filters by trip', () => {
    expect(names(filterPlaces(all, { ...NO_FILTERS, tripId: 'prague' }))).toEqual(['Karlův most'])
  })

  it('filters by visited', () => {
    expect(names(filterPlaces(all, { ...NO_FILTERS, visited: 'visited' }))).toEqual(['Time Out Market'])
    expect(filterPlaces(all, { ...NO_FILTERS, visited: 'to-visit' })).toHaveLength(4)
  })

  it('filters by type', () => {
    expect(names(filterPlaces(all, { ...NO_FILTERS, type: 'stays' }))).toEqual(['Hotel Avenida'])
    expect(filterPlaces(all, { ...NO_FILTERS, type: 'places' })).toHaveLength(4)
  })

  it('searches name or location, ignoring case and accents', () => {
    expect(names(filterPlaces(all, { ...NO_FILTERS, q: 'time out' }))).toEqual(['Time Out Market'])
    expect(names(filterPlaces(all, { ...NO_FILTERS, q: 'BELEM' }))).toEqual(['Pastéis de Belém'])
    expect(names(filterPlaces(all, { ...NO_FILTERS, q: 'sodre' }))).toEqual(['Time Out Market'])
    expect(names(filterPlaces(all, { ...NO_FILTERS, q: 'karluv' }))).toEqual(['Karlův most'])
    expect(names(filterPlaces(all, { ...NO_FILTERS, q: 'stare mesto' }))).toEqual(['Karlův most'])
    expect(filterPlaces(all, { ...NO_FILTERS, q: '   ' })).toHaveLength(5)
    expect(filterPlaces(all, { ...NO_FILTERS, q: 'nowhere' })).toEqual([])
  })

  it('combines filters', () => {
    expect(filterPlaces(all, { tripId: 'lisbon', visited: 'to-visit', type: 'places', q: 'bel' })).toHaveLength(1)
    expect(filterPlaces(all, { tripId: 'prague', visited: 'visited', type: null, q: '' })).toEqual([])
  })

  it('knows when any filter is set', () => {
    expect(isFiltered(NO_FILTERS)).toBe(false)
    expect(isFiltered({ ...NO_FILTERS, q: ' ' })).toBe(false)
    expect(isFiltered({ ...NO_FILTERS, q: 'x' })).toBe(true)
    expect(isFiltered({ ...NO_FILTERS, visited: 'visited' })).toBe(true)
  })
})

describe('groupByTrip', () => {
  const trips = [
    trip('porto', null, '2026-10-01T00:00:00Z'),
    trip('prague', '2026-08-01'),
    trip('lisbon', '2026-10-20'),
    trip('madrid', '2026-10-06'),
    trip('faro', null, '2026-10-05T00:00:00Z'),
    trip('rome', '2026-11-01'),
  ]

  it('orders trips dated soonest first, then undated (newest edit first), and skips empty trips', () => {
    const groups = groupByTrip(
      [
        point('a', { tripId: 'porto' }),
        point('b', { tripId: 'lisbon' }),
        point('c', { tripId: 'prague' }),
        point('d', { tripId: 'faro' }),
        point('e', { tripId: 'madrid' }),
      ],
      trips
    )
    expect(groups.map((g) => g.trip.id)).toEqual(['prague', 'madrid', 'lisbon', 'faro', 'porto'])
  })

  it('keeps places in plan order (day, then position; Maybe last)', () => {
    const [g] = groupByTrip(
      [
        point('maybe', { day: null, position: 1 }),
        point('d2', { day: 2, position: 1 }),
        point('d1b', { day: 1, position: 2 }),
        point('d1a', { day: 1, position: 1 }),
      ],
      trips
    )
    expect(g.places.map((p) => p.id)).toEqual(['d1a', 'd1b', 'd2', 'maybe'])
  })

  it('returns no groups for no places', () => {
    expect(groupByTrip([], trips)).toEqual([])
  })
})

describe('toPlaces', () => {
  it('builds trips and points from the rows the page reads', () => {
    const { trips, points } = toPlaces([
      {
        id: 't1',
        title: '',
        destination: 'Lisbon',
        start_date: '2026-10-20',
        end_date: '2026-10-22',
        updated_at: null,
        activities: [
          {
            id: 'a1',
            name: 'Time Out Market',
            location: 'Cais do Sodré',
            activity_type: 'activity',
            day_number: 1,
            position: 4,
            extra_data: { lat: 38.7, lng: -9.14, geo_source: 'osm_nominatim', visited: true },
          },
          {
            id: 'a2',
            name: 'Hotel',
            location: null,
            activity_type: 'hotel',
            day_number: null,
            position: 1,
            extra_data: { geo_status: 'not_found' },
          },
        ],
      },
      { id: 't2', title: 'Rome', destination: null, start_date: null, end_date: null, updated_at: null, activities: null },
    ])
    expect(trips.map((t) => t.title)).toEqual(['Lisbon', 'Rome'])
    expect(points).toEqual([
      {
        id: 'a1',
        name: 'Time Out Market',
        location: 'Cais do Sodré',
        type: 'places',
        tripId: 't1',
        tripTitle: 'Lisbon',
        day: 1,
        position: 4,
        visited: true,
        coords: { lat: 38.7, lng: -9.14 },
      },
      {
        id: 'a2',
        name: 'Hotel',
        location: null,
        type: 'stays',
        tripId: 't1',
        tripTitle: 'Lisbon',
        day: null,
        position: 1,
        visited: false,
        coords: null,
      },
    ])
  })
})

describe('tripColor', () => {
  it('cycles the six UI-SPEC colours in order', () => {
    expect(TRIP_COLORS).toEqual(['#D55E00', '#CC79A7', '#009E73', '#8C510A', '#7B3294', '#3A444F'])
    expect([0, 1, 2, 3, 4, 5].map(tripColor)).toEqual([...TRIP_COLORS])
    expect(tripColor(6)).toBe('#D55E00')
    expect(tripColor(13)).toBe('#CC79A7')
  })
})
