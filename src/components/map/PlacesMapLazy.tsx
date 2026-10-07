'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { preconnect } from 'react-dom'
import type { PlacesMapProps } from './PlacesMap'
import { TILE_ORIGIN, warmMap } from './maplibre-loader'
import { DelayedLoadingRow, MAP_LOADING } from '@/components/motion/LoadingRow'

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
  // LOADING MAP… (D-32) until the map loads or fails, centred in the part of
  // the map that the phone's filters and sheet leave free.
  const [settled, setSettled] = useState(false)
  const { onSettled, inset } = props
  return (
    <>
      <PlacesMap
        {...props}
        onSettled={() => {
          setSettled(true)
          onSettled?.()
        }}
      />
      <DelayedLoadingRow
        loading={!settled}
        label="LOADING MAP…"
        className={MAP_LOADING}
        style={inset ? { paddingTop: inset.top, paddingBottom: inset.bottom } : undefined}
      />
    </>
  )
}
