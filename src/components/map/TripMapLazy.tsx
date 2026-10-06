'use client'

import dynamic from 'next/dynamic'
import type { TripMapProps } from './TripMap'

// ssr: false keeps MapLibre out of the server render and out of the route's
// first JS; the map mounts after the board has painted.
const TripMap = dynamic(() => import('./TripMap'), {
  ssr: false,
  loading: () => <div aria-hidden className="h-full w-full bg-surface-2" />,
})

export function TripMapLazy(props: TripMapProps) {
  return <TripMap {...props} />
}
