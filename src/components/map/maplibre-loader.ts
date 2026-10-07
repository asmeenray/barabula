// Map warm-up (Q46, 6 Oct 2026). Starts the map's network work as early as
// possible and keeps the bytes down, with no visible product change:
//
// 1. MapLibre's main module is loaded natively from /maplibre/ (copied there
//    with the worker by scripts/copy-maplibre-worker.mjs), not bundled. Main
//    thread and worker then import the same /maplibre/maplibre-gl-shared.mjs
//    URL, so the ~144 KB gz shared chunk downloads once instead of twice.
// 2. The style JSON and the vector TileJSON are fetched in parallel, while the
//    MapLibre module downloads, instead of one after the other once the map
//    exists. The fresh TileJSON is inlined into the style (never stored).
// 3. Every label uses one font stack, so the map needs one set of glyph files
//    instead of three (Regular, Italic, Bold).

import type { StyleSpecification } from 'maplibre-gl'

export type MapLib = typeof import('maplibre-gl')
export type MapTheme = 'light' | 'dark'

export const MAPLIBRE_URL = '/maplibre/maplibre-gl.mjs'
export const MAPLIBRE_SHARED_URL = '/maplibre/maplibre-gl-shared.mjs'
export const MAPLIBRE_WORKER_URL = '/maplibre/maplibre-gl-worker.mjs'
export const TILE_ORIGIN = 'https://tiles.openfreemap.org'

const STYLE_URL: Record<MapTheme, string> = {
  light: `${TILE_ORIGIN}/styles/positron`,
  dark: `${TILE_ORIGIN}/styles/dark`,
}
const VECTOR_TILEJSON_URL = `${TILE_ORIGIN}/planet`
const LABEL_FONT = ['Noto Sans Regular']

let libPromise: Promise<MapLib> | null = null

/** The MapLibre module, loaded once from /maplibre/ (outside the bundle). */
export function loadMapLib(): Promise<MapLib> {
  if (!libPromise) {
    libPromise = import(/* webpackIgnore: true */ /* turbopackIgnore: true */ MAPLIBRE_URL).catch((err) => {
      libPromise = null // a Retry can try again
      throw err
    }) as Promise<MapLib>
  }
  return libPromise
}

type TileJson = { tiles?: string[]; minzoom?: number; maxzoom?: number; bounds?: number[]; attribution?: string }

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return (await res.json()) as T
}

/** Style with one label font stack and the fresh TileJSON inlined. Pure. */
export function slimStyle(style: StyleSpecification, tileJson: TileJson | null): StyleSpecification {
  const sources = { ...style.sources }
  for (const [id, source] of Object.entries(sources)) {
    if (
      tileJson?.tiles?.length &&
      source.type === 'vector' &&
      'url' in source &&
      source.url === VECTOR_TILEJSON_URL
    ) {
      const { url: _url, ...rest } = source
      void _url
      sources[id] = {
        ...rest,
        tiles: tileJson.tiles,
        ...(tileJson.minzoom !== undefined && { minzoom: tileJson.minzoom }),
        ...(tileJson.maxzoom !== undefined && { maxzoom: tileJson.maxzoom }),
        ...(tileJson.bounds?.length === 4 && { bounds: tileJson.bounds as [number, number, number, number] }),
        ...(tileJson.attribution && !rest.attribution && { attribution: tileJson.attribution }),
      }
    }
  }
  const layers = style.layers.map((layer) =>
    layer.type === 'symbol' && layer.layout?.['text-font']
      ? { ...layer, layout: { ...layer.layout, 'text-font': LABEL_FONT } }
      : layer
  )
  return { ...style, sources, layers }
}

const stylePromises = new Map<MapTheme, Promise<StyleSpecification | string>>()

/**
 * The slimmed style for a theme. Falls back to the plain style URL if the
 * fetch fails, so MapLibre reports the error through the map's own onError.
 */
export function loadStyle(theme: MapTheme): Promise<StyleSpecification | string> {
  let p = stylePromises.get(theme)
  if (!p) {
    const tileJson = fetchJson<TileJson>(VECTOR_TILEJSON_URL).catch(() => null)
    p = fetchJson<StyleSpecification>(STYLE_URL[theme])
      .then(async (style) => slimStyle(style, await tileJson))
      .catch(() => {
        stylePromises.delete(theme)
        return STYLE_URL[theme]
      })
    stylePromises.set(theme, p)
  }
  return p
}

export function currentTheme(): MapTheme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/** Kick off every map download in parallel (call once the board has mounted). */
export function warmMap(): void {
  loadMapLib().catch(() => {})
  void loadStyle(currentTheme())
}
