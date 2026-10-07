'use client'

// Trip plan map: MapLibre 6 through react-map-gl, OpenFreeMap tiles.
// Loaded only through TripMapLazy (ssr: false), so maplibre-gl never runs on
// the server or in the first JS of the page (Pitfall 3, Pitfall 15).

import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Source } from 'react-map-gl/maplibre'
import type { ErrorEvent, MapRef } from 'react-map-gl/maplibre'
import type { ExpressionSpecification, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { PlanActivity } from '@/lib/plan/types'
import { LAPTOP_QUERY, useMediaQuery } from '@/lib/client/use-media'
import { BoardStatusLine } from '@/components/board/BoardStatusLine'
import { useResolvedTheme } from '@/lib/theme/use-theme'
import { MAPLIBRE_WORKER_URL, loadMapLib, loadStyle } from './maplibre-loader'
import { dayRoute, drawPin, loadPinFont, parsePinImageId, pinFeatures, PIN_COLOURS, type PinFeature, type PinTheme } from './pinImages'

export const MAP_LOAD_MARK = 'barabula:map-load'

/** 'maybe' or a 1-based day number. */
export type DayKey = number | 'maybe'

export interface TripMapProps {
  activities: PlanActivity[]
  selectedDay: DayKey
  /** id of the map region (the floating day tabs point aria-controls at it). */
  id?: string
  /** Laptop: the row under the pointer; its pin grows (UI-SPEC §8). */
  hoveredId?: string | null
  /** The place whose ticket is open; its pin is drawn selected. */
  selectedId?: string | null
  /** Pointer over a pin (laptop), or off every pin. */
  onPinHover?: (id: string | null) => void
  /** A pin was clicked or tapped. */
  onPinSelect?: (id: string) => void
}

type Bounds = [[number, number], [number, number]]

function boundsOf(pins: PinFeature[]): Bounds | null {
  if (pins.length === 0) return null
  const lngs = pins.map((p) => p.geometry.coordinates[0])
  const lats = pins.map((p) => p.geometry.coordinates[1])
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}

function fitTarget(pins: PinFeature[], day: DayKey): Bounds | null {
  return boundsOf(pins.filter((p) => p.properties.day === day)) ?? boundsOf(pins)
}

const FIT_OPTIONS = { padding: 48, maxZoom: 15 }

const PINS_LAYER = 'trip-pins'
/** Hovered and selected pins, drawn on top with the 'selected' image. */
const TOP_LAYER = 'trip-pins-top'
const PIN_LAYERS = [PINS_LAYER, TOP_LAYER]

// Pin images wait for Geist Mono (started once, when the map chunk first mounts).
let fontReady: Promise<unknown> | null = null

/** Draws tag pins on demand; MapLibre keeps the resolver across style reloads. */
function registerPins(map: MapLibreMap) {
  map.setMissingStyleImageResolver(async (imageId) => {
    const spec = parsePinImageId(imageId)
    if (!spec) return
    await (fontReady ??= loadPinFont())
    const ratio = window.devicePixelRatio || 1
    if (!map.hasImage(imageId)) map.addImage(imageId, drawPin(spec, ratio), { pixelRatio: ratio })
  })
}

export default function TripMap({
  activities,
  selectedDay,
  id,
  hoveredId = null,
  selectedId = null,
  onPinHover,
  onPinSelect,
}: TripMapProps) {
  // Follows html data-theme live (D-03): a change swaps the OpenFreeMap style
  // (setStyle); react-map-gl re-adds the Source/Layer children and the pin
  // resolver stays on the map across the swap (A1, checked in e2e/you.spec.ts).
  const theme: PinTheme = useResolvedTheme()
  const isLaptop = useMediaQuery(LAPTOP_QUERY)
  const [failed, setFailed] = useState(false)
  /** The pin resolver is registered on this map; pin layers can mount. */
  const [ready, setReady] = useState(false)
  useEffect(() => {
    fontReady ??= loadPinFont()
  }, [])
  const [attempt, setAttempt] = useState(0)
  // Fetched (and slimmed) by maplibre-loader, usually already in flight from
  // the board's warm-up by the time this chunk runs.
  const [mapStyle, setMapStyle] = useState<StyleSpecification | string | null>(null)
  useEffect(() => {
    let live = true
    loadStyle(theme).then((style) => {
      if (live) setMapStyle(style)
    })
    return () => {
      live = false
    }
  }, [theme, attempt])
  const mapRef = useRef<MapRef>(null)
  const loadedRef = useRef(false)

  // Maybe places are not pinned on the plan map (they show on Places, 16-18).
  const pins = useMemo(() => pinFeatures(activities, theme), [activities, theme])
  const dayPins = pins.filter((p) => p.properties.day === selectedDay).length
  const dayName = selectedDay === 'maybe' ? 'Maybe' : `day ${selectedDay}`
  const geojson = useMemo(() => ({ type: 'FeatureCollection' as const, features: pins }), [pins])

  // Phone shows only the selected day's pins; laptop dims the other days (45%, 0.8).
  const onDay: ExpressionSpecification = ['==', ['get', 'day'], selectedDay === 'maybe' ? -1 : selectedDay]
  const top = [hoveredId, selectedId].filter((x): x is string => x !== null)
  const onTop: ExpressionSpecification = ['in', ['get', 'id'], ['literal', top]]
  const selectedPin = selectedId !== null && pins.some((p) => p.properties.id === selectedId) ? selectedId : undefined

  // The selected day's route through its located stops (unlocated ones skipped).
  // lineMetrics is on for the moment-2 line-progress draw (16-22); static here.
  const route = useMemo(() => {
    const line = dayRoute(pins, selectedDay)
    return {
      type: 'FeatureCollection' as const,
      features: line.length
        ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: line } }]
        : [],
    }
  }, [pins, selectedDay])
  const lineLayout = { 'line-join': 'round', 'line-cap': 'round' } as const
  // Pins never hide each other; map labels under a pin give way to it.
  const pinLayout = { 'icon-anchor': 'bottom', 'icon-allow-overlap': true } as const
  const hoverRef = useRef<string | null>(null)
  function hoverPin(map: MapLibreMap, next: string | null) {
    if (hoverRef.current === next) return
    hoverRef.current = next
    map.getCanvas().style.cursor = next ? 'pointer' : ''
    onPinHover?.(next)
  }

  /** Test observability: how many of the selected day's pins are on screen. */
  function countPins(map: MapLibreMap) {
    const region = map.getContainer().closest<HTMLElement>('[role=region]')
    if (!region || !map.getLayer(PINS_LAYER)) return
    const ids = new Set<unknown>()
    for (const f of map.queryRenderedFeatures({ layers: PIN_LAYERS })) {
      if (f.properties.day === selectedDay) ids.add(f.properties.id)
    }
    region.dataset.pinsRendered = String(ids.size)
  }

  // The first fit comes from initialViewState; later day changes refit at once
  // (the animated board flip is moment 3, a later plan).
  const firstFit = useRef(true)
  useEffect(() => {
    if (firstFit.current) {
      firstFit.current = false
      return
    }
    const target = fitTarget(pins, selectedDay)
    if (target && loadedRef.current) mapRef.current?.fitBounds(target, { ...FIT_OPTIONS, duration: 0 })
  }, [pins, selectedDay])

  function handleError(e: ErrorEvent) {
    // Tile hiccups after the map is up are not fatal; the next pan retries.
    const tileError = 'tile' in e || 'sourceId' in e
    if (loadedRef.current || tileError) {
      console.warn('Map error', e.error?.message)
      return
    }
    setFailed(true)
  }

  function retry() {
    loadedRef.current = false
    setReady(false)
    firstFit.current = true
    setFailed(false)
    setAttempt((n) => n + 1)
  }

  const initialBounds = fitTarget(pins, selectedDay)

  return (
    <div
      id={id}
      role="region"
      aria-label={`Map, ${dayName}, ${dayPins} ${dayPins === 1 ? 'place' : 'places'}`}
      data-selected-pin={selectedPin}
      className="relative h-full w-full overscroll-none bg-surface-2"
    >
      {failed ? (
        <div className="flex h-full items-start bg-board p-4">
          <BoardStatusLine message="Map didn't load. Your plan still works." onRetry={retry} />
        </div>
      ) : mapStyle === null ? null : (
        <Map
          key={attempt}
          ref={mapRef}
          mapLib={loadMapLib()}
          workerUrl={MAPLIBRE_WORKER_URL /* /maplibre/maplibre-gl-worker.mjs */}
          mapStyle={mapStyle}
          initialViewState={
            initialBounds
              ? { bounds: initialBounds, fitBoundsOptions: FIT_OPTIONS }
              : { longitude: 0, latitude: 20, zoom: 1 }
          }
          style={{ width: '100%', height: '100%' }}
          dragRotate={false}
          pitchWithRotate={false}
          touchPitch={false}
          attributionControl={{ compact: true }}
          onLoad={(e) => {
            loadedRef.current = true
            registerPins(e.target)
            setReady(true)
            // Compact attribution opens itself on load and covers a third of the
            // phone strip; start it folded (the (i) button shows it again).
            e.target
              .getContainer()
              .querySelector('.maplibregl-ctrl-attrib.maplibregl-compact-show')
              ?.classList.remove('maplibregl-compact-show')
            if (performance.getEntriesByName(MAP_LOAD_MARK).length === 0) {
              performance.mark(MAP_LOAD_MARK)
            }
          }}
          onError={handleError}
          onIdle={(e) => countPins(e.target)}
          interactiveLayerIds={ready ? PIN_LAYERS : undefined}
          onMouseMove={(e) => hoverPin(e.target, (e.features?.[0]?.properties.id as string | undefined) ?? null)}
          onMouseLeave={(e) => hoverPin(e.target, null)}
          onClick={(e) => {
            const pin = e.features?.[0]?.properties.id
            if (typeof pin === 'string') onPinSelect?.(pin)
          }}
        >
          {ready && (
            <Source id="trip-route" type="geojson" lineMetrics data={route}>
              {/* Light theme: a 7 px ink casing under the yellow line (yellow on Positron is 1.8:1). */}
              {theme === 'light' && (
                <Layer
                  id="trip-route-casing"
                  type="line"
                  layout={lineLayout}
                  paint={{ 'line-color': PIN_COLOURS.light.ring, 'line-width': 7 }}
                />
              )}
              <Layer
                id="trip-route"
                type="line"
                layout={lineLayout}
                paint={{ 'line-color': PIN_COLOURS[theme].accent, 'line-width': 4 }}
              />
            </Source>
          )}
          {ready && (
            <Source id="trip-pins" type="geojson" data={geojson}>
              <Layer
                id={PINS_LAYER}
                type="symbol"
                filter={['all', isLaptop ? true : onDay, ['!', onTop]]}
                layout={{
                  ...pinLayout,
                  'icon-image': ['get', 'img'],
                  'icon-size': isLaptop ? ['case', onDay, 1, 0.8] : 1,
                  // The selected day on top, then lower stop numbers over higher ones.
                  'symbol-sort-key': ['-', ['case', onDay, 200, 0], ['get', 'num']],
                }}
                paint={{ 'icon-opacity': isLaptop ? ['case', onDay, 1, 0.45] : 1 }}
              />
              <Layer
                id={TOP_LAYER}
                type="symbol"
                filter={isLaptop ? onTop : ['all', onDay, onTop]}
                layout={{ ...pinLayout, 'icon-image': ['get', 'sel'] }}
              />
            </Source>
          )}
        </Map>
      )}
    </div>
  )
}
