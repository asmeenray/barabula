'use client'

// Places tab map (D-28, UI-SPEC §10 and "Color: Places pins and clusters"):
// every located place across the user's trips in one clustered GeoJSON
// source, drawn by GPU layers. Pins are 16 px circles in their trip's colour
// with a 2 px ring; visited pins are hollow. Clusters are ink discs with a
// Geist Mono count (canvas images through the missing-image resolver, as the
// plan map's tag pins). Same MapLibre setup as TripMap (worker from
// /maplibre/, OpenFreeMap style). Loaded only through PlacesMapLazy.

import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Source } from 'react-map-gl/maplibre'
import type { ErrorEvent, MapRef } from 'react-map-gl/maplibre'
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { PlacePoint } from '@/lib/places-tab/filter'
import { BoardStatusLine } from '@/components/board/BoardStatusLine'
import { MAPLIBRE_WORKER_URL, loadMapLib, loadStyle } from './maplibre-loader'
import { drawCluster, loadClusterFont, parseClusterImageId } from './clusterImages'
import type { PinTheme } from './pinImages'

export const PLACES_MAP_LOAD_MARK = 'barabula:places-map-load'

export interface PlacesMapProps {
  /** The filtered places that have coordinates. */
  points: PlacePoint[]
  /** Trip id → trip colour (TRIP_COLORS, home order). */
  colors: ReadonlyMap<string, string>
  selectedId: string | null
  onSelect: (id: string) => void
  /** Pixels covered by floating controls (phone: filters on top, the sheet's peek below). */
  inset?: { top: number; bottom: number }
}

type Bounds = [[number, number], [number, number]]

const SOURCE = 'places'
const CLUSTERS = 'places-clusters'
const PINS = 'places-pins'
const HALO = 'places-selected'
const LAYERS = [CLUSTERS, PINS]

/** Pin surfaces per theme: the hollow (visited) fill and the 2 px ring (UI-SPEC). */
const PIN_SURFACE = { light: '#FFFFFF', dark: '#151B21' } as const
const PIN_RING = { light: '#0B1014', dark: '#E6E8EB' } as const
/** The plan map's selected-pin outline colours (pinImages PIN_COLOURS.outline). */
const SELECTED_OUTLINE = { light: '#0B1014', dark: '#FFFFFF' } as const

function boundsOf(points: PlacePoint[]): Bounds | null {
  const located = points.filter((p) => p.coords)
  if (located.length === 0) return null
  const lngs = located.map((p) => p.coords!.lng)
  const lats = located.map((p) => p.coords!.lat)
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}

let fontReady: Promise<unknown> | null = null

/** Draws cluster discs on demand; MapLibre keeps the resolver across style reloads. */
function registerClusters(map: MapLibreMap) {
  map.setMissingStyleImageResolver(async (imageId) => {
    const spec = parseClusterImageId(imageId)
    if (!spec) return
    await (fontReady ??= loadClusterFont())
    const ratio = window.devicePixelRatio || 1
    if (!map.hasImage(imageId)) map.addImage(imageId, drawCluster(spec, ratio), { pixelRatio: ratio })
  })
}

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function PlacesMap({ points, colors, selectedId, onSelect, inset }: PlacesMapProps) {
  // Theme at mount; live switching lands with the theme setting (16-19).
  const [theme] = useState<PinTheme>(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'))
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [mapStyle, setMapStyle] = useState<StyleSpecification | string | null>(null)
  useEffect(() => {
    fontReady ??= loadClusterFont()
  }, [])
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

  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: points
        .filter((p) => p.coords)
        .map((p) => ({
          type: 'Feature' as const,
          properties: { id: p.id, c: colors.get(p.tripId) ?? PIN_RING[theme], v: p.visited ? 1 : 0 },
          geometry: { type: 'Point' as const, coordinates: [p.coords!.lng, p.coords!.lat] },
        })),
    }),
    [points, colors, theme]
  )

  const top = inset?.top ?? 48
  const bottom = inset?.bottom ?? 48
  const fit = useMemo(
    () => ({ padding: { top, bottom, left: 48, right: 48 }, maxZoom: 15 }),
    [top, bottom]
  )

  // Refit when the set of filtered places changes (not when one is marked visited).
  const idsKey = points.map((p) => p.id).join(',')
  const firstFit = useRef(true)
  useEffect(() => {
    if (firstFit.current) {
      firstFit.current = false
      return
    }
    const target = boundsOf(points)
    if (target && loadedRef.current) mapRef.current?.fitBounds(target, { ...fit, duration: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refit on the id set only
  }, [idsKey])

  // A place picked in the list: bring its pin into the part of the map the user can see.
  useEffect(() => {
    const map = mapRef.current
    const p = points.find((x) => x.id === selectedId)
    if (!map || !p?.coords || !loadedRef.current) return
    const el = map.getContainer()
    const h = el.clientHeight
    const w = el.clientWidth
    // Phone: the sheet sits at 50% while a card is open.
    const visibleBottom = inset ? h * 0.5 : h
    const at = map.project([p.coords.lng, p.coords.lat])
    if (at.x >= 24 && at.x <= w - 24 && at.y >= top && at.y <= visibleBottom - 24) return
    const offset: [number, number] = [0, inset ? (top + visibleBottom) / 2 - h / 2 : 0]
    map.easeTo({ center: [p.coords.lng, p.coords.lat], offset, duration: reducedMotion() ? 0 : 300 })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the selection changes
  }, [selectedId])

  function handleError(e: ErrorEvent) {
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

  const hoverRef = useRef(false)
  const initialBounds = boundsOf(points)
  const isVisited: ExpressionSpecification = ['==', ['get', 'v'], 1]
  const selectedPin = selectedId !== null && points.some((p) => p.id === selectedId) ? selectedId : undefined

  return (
    <div
      role="region"
      aria-label="Map of your places"
      data-located={points.length}
      data-selected-pin={selectedPin}
      className="relative h-full w-full overscroll-none bg-surface-2"
    >
      {failed ? (
        <div className="flex h-full items-start bg-board p-4" style={{ paddingTop: inset ? top : undefined }}>
          <BoardStatusLine message="Map didn't load." onRetry={retry} />
        </div>
      ) : mapStyle === null ? null : (
        <Map
          key={attempt}
          ref={mapRef}
          mapLib={loadMapLib()}
          workerUrl={MAPLIBRE_WORKER_URL}
          mapStyle={mapStyle}
          initialViewState={
            initialBounds ? { bounds: initialBounds, fitBoundsOptions: fit } : { longitude: 0, latitude: 20, zoom: 1 }
          }
          style={{ width: '100%', height: '100%' }}
          dragRotate={false}
          pitchWithRotate={false}
          touchPitch={false}
          attributionControl={{ compact: true }}
          onLoad={(e) => {
            loadedRef.current = true
            registerClusters(e.target)
            setReady(true)
            e.target
              .getContainer()
              .querySelector('.maplibregl-ctrl-attrib.maplibregl-compact-show')
              ?.classList.remove('maplibregl-compact-show')
            if (performance.getEntriesByName(PLACES_MAP_LOAD_MARK).length === 0) {
              performance.mark(PLACES_MAP_LOAD_MARK)
            }
          }}
          onError={handleError}
          interactiveLayerIds={ready ? LAYERS : undefined}
          onMouseMove={(e) => {
            const over = (e.features?.length ?? 0) > 0
            if (over === hoverRef.current) return
            hoverRef.current = over
            e.target.getCanvas().style.cursor = over ? 'pointer' : ''
          }}
          onClick={(e) => {
            const f = e.features?.[0]
            if (!f) return
            const props = f.properties as Record<string, unknown>
            if (typeof props.cluster_id === 'number' && f.geometry.type === 'Point') {
              // Tap a cluster: zoom to where it splits.
              const center = f.geometry.coordinates as [number, number]
              const source = e.target.getSource(SOURCE) as GeoJSONSource | undefined
              source
                ?.getClusterExpansionZoom(props.cluster_id)
                .then((zoom) => e.target.easeTo({ center, zoom, duration: reducedMotion() ? 0 : 300 }))
                .catch(() => {})
              return
            }
            if (typeof props.id === 'string') onSelect(props.id)
          }}
        >
          {ready && (
            <Source id={SOURCE} type="geojson" data={geojson} cluster clusterRadius={50} clusterMaxZoom={14}>
              <Layer
                id={CLUSTERS}
                type="symbol"
                filter={['has', 'point_count']}
                layout={{
                  'icon-image': [
                    'concat',
                    'cluster-',
                    ['to-string', ['min', ['get', 'point_count'], 1000]],
                    `-${theme}`,
                  ],
                  'icon-allow-overlap': true,
                }}
              />
              <Layer
                id={PINS}
                type="circle"
                filter={['!', ['has', 'point_count']]}
                paint={{
                  // 16 px overall: radius + ring (MapLibre draws the stroke outside the radius).
                  'circle-radius': ['case', isVisited, 5, 6],
                  'circle-color': ['case', isVisited, PIN_SURFACE[theme], ['get', 'c']],
                  'circle-stroke-width': ['case', isVisited, 3, 2],
                  'circle-stroke-color': ['case', isVisited, ['get', 'c'], PIN_RING[theme]],
                }}
              />
              {/* The open card's pin: a 2 px outline ring around it. */}
              <Layer
                id={HALO}
                type="circle"
                filter={['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], selectedPin ?? '']]}
                paint={{
                  'circle-radius': 11,
                  'circle-color': 'rgba(0,0,0,0)',
                  'circle-stroke-width': 2,
                  'circle-stroke-color': SELECTED_OUTLINE[theme],
                }}
              />
            </Source>
          )}
        </Map>
      )}
    </div>
  )
}
