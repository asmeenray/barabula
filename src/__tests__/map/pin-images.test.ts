import { describe, expect, it } from 'vitest'
import { dayRoute, parsePinImageId, pinFeatures, pinImageId } from '@/components/map/pinImages'
import type { PlanActivity } from '@/lib/plan/types'

// Trip-plan tag pins (16-16, D-02): image ids carry state × number × theme so
// MapLibre's missing-image resolver can draw any pin on demand.

describe('pinImageId', () => {
  it('builds state, zero-padded number and theme', () => {
    expect(pinImageId({ state: 'day', num: 3, theme: 'light' })).toBe('pin-day-03-light')
    expect(pinImageId({ state: 'selected', num: 12, theme: 'dark' })).toBe('pin-selected-12-dark')
    expect(pinImageId({ state: 'visited', num: 0, theme: 'dark' })).toBe('pin-visited-00-dark')
  })

  it('keeps numbers inside 0–99', () => {
    expect(pinImageId({ state: 'day', num: 140, theme: 'light' })).toBe('pin-day-99-light')
    expect(pinImageId({ state: 'day', num: -2, theme: 'light' })).toBe('pin-day-00-light')
  })
})

describe('parsePinImageId', () => {
  it('reads an id back', () => {
    expect(parsePinImageId('pin-visited-00-dark')).toEqual({ state: 'visited', num: 0, theme: 'dark' })
    expect(parsePinImageId('pin-day-03-light')).toEqual({ state: 'day', num: 3, theme: 'light' })
    expect(parsePinImageId('pin-selected-42-light')).toEqual({ state: 'selected', num: 42, theme: 'light' })
  })

  it('round-trips every state and theme', () => {
    for (const state of ['day', 'visited', 'selected'] as const) {
      for (const theme of ['light', 'dark'] as const) {
        const spec = { state, num: 7, theme }
        expect(parsePinImageId(pinImageId(spec))).toEqual(spec)
      }
    }
  })

  it('returns null for ids it did not make', () => {
    for (const id of ['other', 'pin-day-3-light', 'pin-foo-03-light', 'pin-day-03-blue', 'pin-day-03-light-x', '']) {
      expect(parsePinImageId(id)).toBeNull()
    }
  })
})

function act(id: string, day: number | null, position: number, extra: Record<string, unknown> | null): PlanActivity {
  return {
    id,
    itinerary_id: 't',
    day_number: day,
    position,
    name: id,
    time: null,
    description: null,
    location: 'Somewhere',
    activity_type: 'activity',
    extra_data: extra,
    duration: null,
    tips: null,
  }
}

const at = (lng: number, lat: number, more: Record<string, unknown> = {}) => ({
  lat,
  lng,
  geo_source: 'osm_nominatim',
  ...more,
})

const ACTS: PlanActivity[] = [
  // Deliberately out of order: the board order is day, then position.
  act('d2-b', 2, 2, null),
  act('d1-a', 1, 1, at(-9.13, 38.7)),
  act('d1-b', 1, 2, at(-9.14, 38.71, { visited: true })),
  act('d2-a', 2, 1, at(-9.12, 38.72)),
  act('d2-c', 2, 3, at(-9.11, 38.73)),
  act('maybe', null, 1, at(-9.2, 38.69)),
  // Coordinates from another source do not count as cached OSM ones.
  act('d1-c', 1, 3, { lat: 38.7, lng: -9.1, geo_source: 'mapbox' }),
]

describe('pinFeatures', () => {
  const features = pinFeatures(ACTS, 'light')
  const byId = Object.fromEntries(features.map((f) => [f.properties.id, f]))

  it('pins only located places with a day (Maybe and unlocated places are left out)', () => {
    expect(features.map((f) => f.properties.id).sort()).toEqual(['d1-a', 'd1-b', 'd2-a', 'd2-c'])
  })

  it('numbers each pin by its stop in the day, counting unlocated stops like the board does', () => {
    expect(byId['d1-a'].properties.num).toBe(1)
    expect(byId['d2-a'].properties.num).toBe(1)
    expect(byId['d2-c'].properties.num).toBe(3)
    expect(byId['d2-c'].properties.day).toBe(2)
  })

  it('names the day, visited and selected images for the theme', () => {
    expect(byId['d2-c'].properties.img).toBe('pin-day-03-light')
    expect(byId['d2-c'].properties.sel).toBe('pin-selected-03-light')
    expect(byId['d1-b'].properties.state).toBe('visited')
    expect(byId['d1-b'].properties.img).toBe('pin-visited-00-light')
    expect(byId['d1-b'].properties.sel).toBe('pin-selected-00-light')
    expect(pinFeatures(ACTS, 'dark')[0].properties.img).toMatch(/-dark$/)
  })

  it('places the point at [lng, lat]', () => {
    expect(byId['d1-a'].geometry.coordinates).toEqual([-9.13, 38.7])
  })
})

describe('dayRoute', () => {
  const features = pinFeatures(ACTS, 'light')

  it('runs through the selected day’s located stops in board order', () => {
    expect(dayRoute(features, 2)).toEqual([
      [-9.12, 38.72],
      [-9.11, 38.73],
    ])
  })

  it('is empty with fewer than two located stops, and for Maybe', () => {
    expect(dayRoute(pinFeatures(ACTS.filter((a) => a.id !== 'd1-b'), 'light'), 1)).toEqual([])
    expect(dayRoute(features, 'maybe')).toEqual([])
    expect(dayRoute(features, 5)).toEqual([])
  })
})
