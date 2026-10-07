import { describe, expect, it } from 'vitest'
import type { StyleSpecification } from 'maplibre-gl'
import { slimStyle } from '@/components/map/maplibre-loader'

// Q46 byte cuts: one label font stack, and the fresh TileJSON inlined so the
// map skips one request round trip. Nothing else in the style changes.

function style(): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
      ne2_shaded: { type: 'raster', tiles: ['https://tiles.openfreemap.org/natural_earth/{z}/{x}/{y}.png'], tileSize: 256 },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#fff' } },
      {
        id: 'water-name',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'water_name',
        layout: { 'text-font': ['Noto Sans Italic'], 'text-field': '{name}' },
      },
      {
        id: 'place-city',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        layout: { 'text-font': ['Noto Sans Bold'], 'text-size': 14 },
      },
      { id: 'poi-icon', type: 'symbol', source: 'openmaptiles', 'source-layer': 'poi', layout: { 'icon-image': 'x' } },
    ],
  }
}

const tileJson = {
  tiles: ['https://tiles.openfreemap.org/planet/20261004_113936_pt/{z}/{x}/{y}.pbf'],
  minzoom: 0,
  maxzoom: 14,
  bounds: [-180, -85.05, 180, 85.05],
  attribution: 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap',
}

describe('slimStyle', () => {
  it('puts every label on one font stack and leaves other layout keys alone', () => {
    const out = slimStyle(style(), null)
    const fonts = out.layers
      .filter((l) => l.type === 'symbol' && l.layout?.['text-font'])
      .map((l) => (l.layout as Record<string, unknown>)['text-font'])
    expect(fonts).toEqual([['Noto Sans Regular'], ['Noto Sans Regular']])
    const city = out.layers.find((l) => l.id === 'place-city')
    expect((city?.layout as Record<string, unknown>)['text-size']).toBe(14)
    const icon = out.layers.find((l) => l.id === 'poi-icon')
    expect(icon?.layout).toEqual({ 'icon-image': 'x' })
  })

  it('inlines the TileJSON into the vector source', () => {
    const src = slimStyle(style(), tileJson).sources.openmaptiles as Record<string, unknown>
    expect(src.url).toBeUndefined()
    expect(src.tiles).toEqual(tileJson.tiles)
    expect(src.maxzoom).toBe(14)
    expect(src.bounds).toEqual(tileJson.bounds)
    expect(src.attribution).toBe(tileJson.attribution)
  })

  it('keeps the TileJSON url when the TileJSON is missing or empty', () => {
    for (const tj of [null, { tiles: [] }]) {
      const src = slimStyle(style(), tj).sources.openmaptiles as Record<string, unknown>
      expect(src.url).toBe('https://tiles.openfreemap.org/planet')
      expect(src.tiles).toBeUndefined()
    }
  })

  it('leaves a source with a different url untouched', () => {
    const s = style()
    s.sources.openmaptiles = { type: 'vector', url: 'https://tiles.openfreemap.org/other' }
    expect(slimStyle(s, tileJson).sources.openmaptiles).toEqual(s.sources.openmaptiles)
    expect(slimStyle(s, tileJson).sources.ne2_shaded).toEqual(s.sources.ne2_shaded)
  })

  it('does not mutate the input style', () => {
    const s = style()
    const before = JSON.stringify(s)
    slimStyle(s, tileJson)
    expect(JSON.stringify(s)).toBe(before)
  })
})
