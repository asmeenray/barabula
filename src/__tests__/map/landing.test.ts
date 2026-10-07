import { describe, expect, it } from 'vitest'
import { drawnTo, drawProgress, landedAfter, landingSegment, PIN_DROP } from '@/components/map/landing'
import type { PinFeature } from '@/components/map/pinImages'

// Moment 2 on the map (16-22, D-30): which segment draws, the line-gradient
// step that draws it, and the drop timings from the UI-SPEC.

function pin(id: string, day: number, num: number, lng: number, lat: number): PinFeature {
  return {
    type: 'Feature',
    properties: { id, day, num, img: `pin-${id}`, sel: `sel-${id}` },
    geometry: { type: 'Point', coordinates: [lng, lat] },
  }
}

const pins = [pin('a', 1, 1, -9.1, 38.7), pin('b', 1, 2, -9.2, 38.71), pin('c', 2, 1, -9.3, 38.72), pin('d', 1, 3, -9.15, 38.69)]

describe('landingSegment', () => {
  it('runs from the stop before to the new last stop of its day', () => {
    expect(landingSegment(pins, 'd')).toEqual([
      [-9.2, 38.71],
      [-9.15, 38.69],
    ])
  })

  it('draws nothing for a first stop, a stop mid-route or an unknown id', () => {
    expect(landingSegment(pins, 'a')).toBeNull()
    expect(landingSegment(pins, 'b')).toBeNull()
    expect(landingSegment(pins, 'c')).toBeNull()
    expect(landingSegment(pins, 'x')).toBeNull()
  })
})

describe('drawnTo', () => {
  it('colours the line up to the progress and nothing after it', () => {
    expect(drawnTo(0.4, '#F2A900')).toEqual(['step', ['line-progress'], '#F2A900', 0.4, 'rgba(0, 0, 0, 0)'])
  })

  it('leaves the whole line coloured when done, and nothing at the start', () => {
    expect(drawnTo(1, '#F2A900')[3]).toBeGreaterThan(1)
    expect(drawnTo(-1, '#F2A900')[3]).toBe(0)
  })
})

describe('timings (UI-SPEC signature moment 2)', () => {
  it('drops after 420 ms over 520 ms, draws the route over 400 ms, fades in 150 ms when reduced', () => {
    expect(PIN_DROP.delayMs).toBe(420)
    expect(PIN_DROP.dropMs).toBe(520)
    expect(PIN_DROP.ringMs).toBe(520)
    expect(PIN_DROP.drawMs).toBe(400)
    expect(landedAfter(false)).toBe(940)
    expect(landedAfter(true)).toBe(150)
  })

  it('draw progress eases out from 0 to 1 and clamps', () => {
    expect(drawProgress(-10)).toBe(0)
    expect(drawProgress(0)).toBe(0)
    expect(drawProgress(200)).toBeGreaterThan(0.5)
    expect(drawProgress(400)).toBe(1)
    expect(drawProgress(900)).toBe(1)
  })
})
