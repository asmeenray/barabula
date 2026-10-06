'use client'

// Trip plan map: MapLibre 6 through react-map-gl, OpenFreeMap tiles.
// Loaded only through TripMapLazy (ssr: false), so maplibre-gl never runs on
// the server or in the first JS of the page (Pitfall 3, Pitfall 15).

import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Source } from 'react-map-gl/maplibre'
import type { ErrorEvent, MapRef } from 'react-map-gl/maplibre'
import type { StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { osmCoordsFrom } from '@/lib/geo-cache'
import type { PlanActivity } from '@/lib/plan/types'
import { BoardStatusLine } from '@/components/board/BoardStatusLine'
import { MAPLIBRE_WORKER_URL, loadMapLib, loadStyle } from './maplibre-loader'

export const MAP_LOAD_MARK = 'barabula:map-load'

/** 'maybe' or a 1-based day number. */
export type DayKey = number | 'maybe'

export interface TripMapProps {
  activities: PlanActivity[]
  selectedDay: DayKey
  /** id of the map region (the floating day tabs point aria-controls at it). */
  id?: string
}

type Bounds = [[number, number], [number, number]]

interface Pin {
  id: string
  lng: number
  lat: number
  day: DayKey
}

function pinsFrom(activities: PlanActivity[]): Pin[] {
  const pins: Pin[] = []
  for (const a of activities) {
    const coords = osmCoordsFrom(a.extra_data)
    if (!coords) continue // places without OSM coordinates are not drawn
    pins.push({ id: a.id, lng: coords.lng, lat: coords.lat, day: a.day_number ?? 'maybe' })
  }
  return pins
}

function boundsOf(pins: Pin[]): Bounds | null {
  if (pins.length === 0) return null
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const p of pins) {
    minLng = Math.min(minLng, p.lng)
    minLat = Math.min(minLat, p.lat)
    maxLng = Math.max(maxLng, p.lng)
    maxLat = Math.max(maxLat, p.lat)
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}

function fitTarget(pins: Pin[], day: DayKey): Bounds | null {
  return boundsOf(pins.filter((p) => p.day === day)) ?? boundsOf(pins)
}

function readTheme(): { theme: 'light' | 'dark'; accent: string; ring: string } {
  const root = document.documentElement
  const css = getComputedStyle(root)
  return {
    theme: root.dataset.theme === 'dark' ? 'dark' : 'light',
    accent: css.getPropertyValue('--accent').trim() || '#F2A900',
    ring: css.getPropertyValue('--pin-ring').trim() || '#0B1014',
  }
}

const FIT_OPTIONS = { padding: 48, maxZoom: 15 }

export default function TripMap({ activities, selectedDay, id }: TripMapProps) {
  const [{ theme, accent, ring }] = useState(readTheme)
  const [failed, setFailed] = useState(false)
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

  const pins = useMemo(() => pinsFrom(activities), [activities])
  const dayPins = pins.filter((p) => p.day === selectedDay).length
  const dayName = selectedDay === 'maybe' ? 'Maybe' : `day ${selectedDay}`

  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: pins.map((p) => ({
        type: 'Feature' as const,
        id: p.id,
        properties: { id: p.id, selected: p.day === selectedDay ? 1 : 0 },
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      })),
    }),
    [pins, selectedDay]
  )

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
        >
          <Source id="trip-pins" type="geojson" data={geojson}>
            <Layer
              id="trip-pins-circle"
              type="circle"
              paint={{
                'circle-color': accent,
                'circle-radius': ['case', ['==', ['get', 'selected'], 1], 8, 6],
                'circle-opacity': ['case', ['==', ['get', 'selected'], 1], 1, 0.45],
                'circle-stroke-color': ring,
                'circle-stroke-width': 2,
                'circle-stroke-opacity': ['case', ['==', ['get', 'selected'], 1], 1, 0.45],
              }}
              layout={{ 'circle-sort-key': ['get', 'selected'] }}
            />
          </Source>
        </Map>
      )}
    </div>
  )
}
