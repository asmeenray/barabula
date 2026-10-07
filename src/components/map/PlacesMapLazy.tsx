'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { preconnect } from 'react-dom'
import type { PlacesMapProps } from './PlacesMap'
import { TILE_ORIGIN, warmMap } from './maplibre-loader'

// ssr: false keeps MapLibre out of the server render and the route's first JS;
// the Places map mounts after the list has painted (as TripMapLazy).
const PlacesMap = dynamic(() => import('./PlacesMap'), {
  ssr: false,
  loading: () => <div aria-hidden className="h-full w-full bg-surface-2" />,
})

export function PlacesMapLazy(props: PlacesMapProps) {
  preconnect(TILE_ORIGIN, { crossOrigin: 'anonymous' })
  useEffect(() => {
    warmMap()
  }, [])
  return <PlacesMap {...props} />
}
