import { describe, expect, it } from 'vitest'
import { WALK_FACTOR, WALK_METRES_PER_MIN, dayKm, walkCells, walkMinutes } from '@/lib/plan/walk'

// Points on the equator: 0.01° of longitude ≈ 1,112 m straight line,
// so one leg ≈ 1,445 m on foot (× 1.3) ≈ 18 min at 80 m/min.
const at = (lng: number, lat = 0) => ({
  extra_data: { lat, lng, geo_source: 'osm_nominatim' },
})
const nowhere = { extra_data: { geo_status: 'not_found' } }
const noExtra = { extra_data: null }

describe('walk constants', () => {
  it('uses straight line × 1.3 at 80 m/min', () => {
    expect(WALK_FACTOR).toBe(1.3)
    expect(WALK_METRES_PER_MIN).toBe(80)
  })
})

describe('walkMinutes', () => {
  it('rounds straight-line metres × 1.3 / 80', () => {
    expect(walkMinutes(at(0), at(0.01))).toBe(18)
  })

  it('is at least 1 minute', () => {
    expect(walkMinutes(at(0), at(0))).toBe(1)
    expect(walkMinutes(at(0), at(0.0001))).toBe(1)
  })

  it('returns null when either stop has no coordinates', () => {
    expect(walkMinutes(at(0), nowhere)).toBeNull()
    expect(walkMinutes(noExtra, at(0))).toBeNull()
    expect(walkMinutes(noExtra, nowhere)).toBeNull()
  })

  it('ignores coordinates that did not come from OSM', () => {
    expect(walkMinutes(at(0), { extra_data: { lat: 0, lng: 0.01 } })).toBeNull()
  })
})

describe('dayKm', () => {
  it('is 0 for an empty day', () => {
    expect(dayKm([])).toBe(0)
  })

  it('is 0 for a single located stop', () => {
    expect(dayKm([at(0)])).toBe(0)
  })

  it('sums consecutive legs × 1.3, rounded to 0.1 km', () => {
    expect(dayKm([at(0), at(0.01), at(0.02)])).toBe(2.9)
  })

  it('skips stops without coordinates', () => {
    expect(dayKm([at(0), nowhere, at(0.01), noExtra, at(0.02)])).toBe(2.9)
  })
})

describe('walkCells', () => {
  it('marks the first located stop START and later ones with minutes from the previous located stop', () => {
    expect(walkCells([at(0), at(0.01), at(0.02)])).toEqual(['start', 18, 18])
  })

  it('shows nothing for unlocated stops and walks past them', () => {
    expect(walkCells([nowhere, at(0), noExtra, at(0.01)])).toEqual([null, 'start', null, 18])
  })

  it('is empty for an empty day', () => {
    expect(walkCells([])).toEqual([])
  })
})
