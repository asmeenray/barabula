'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { preconnect } from 'react-dom'
import type { TripMapProps } from './TripMap'
import { TILE_ORIGIN, warmMap } from './maplibre-loader'
import { DelayedLoadingRow, MAP_LOADING } from '@/components/motion/LoadingRow'

// ssr: false keeps MapLibre out of the server render and out of the route's
// first JS; the map mounts after the board has painted.
const TripMap = dynamic(() => import('./TripMap'), {
  ssr: false,
  loading: () => <div aria-hidden className="h-full w-full bg-surface-2" />,
})

export function TripMapLazy(props: TripMapProps) {
  // Open the tile host connection while the page loads (no bytes, Q46).
  preconnect(TILE_ORIGIN, { crossOrigin: 'anonymous' })

  // Once the board has hydrated, start MapLibre, the style and the TileJSON in
  // parallel with the TripMap chunk instead of after it (Q46). An HTML
  // modulepreload was measured too: map ~0.5 s sooner, but the board's day
  // tabs responded ~0.9 s later, so it is not used.
  useEffect(() => {
    warmMap()
  }, [])

  // The chunk, the style and the first tiles: LOADING MAP… until the map has
  // loaded (or shows its own DELAYED line), only if that takes over 300 ms.
  const [settled, setSettled] = useState(false)
  const { onSettled } = props

  return (
    <>
      <TripMap
        {...props}
        onSettled={() => {
          setSettled(true)
          onSettled?.()
        }}
      />
      <DelayedLoadingRow loading={!settled} label="LOADING MAP…" className={MAP_LOADING} />
    </>
  )
}
