'use client'

// The curated photo inside a pass cover (D-06, RESEARCH Pattern 10): a plain
// <picture> with the AVIF crops and a WebP <img>, files served as-is. While it
// loads, the wrapper shows the ≤10 px blur from the manifest as a CSS
// background (getImageProps can't take a placeholder). If the photo fails it
// becomes the styled city-map cover with no message, and onFallback tells the
// parent to hide the credit line (UI-SPEC "Pass cover photo fails to load").
// hold keeps only the blur (no request yet), e.g. until the plan's map is ready.

import { useState } from 'react'
import type { CoverPhoto } from '@/lib/photos/manifest'
import { CityMapCover } from './CityMapCover'

// The crop is picked by layout, not by srcset width: a 412 px phone at DPR 2.6
// needs 1081 px and would skip the 1080 phone crop for the 220 KB laptop one.
// There is no laptop WebP (16-21 size gate, option E): a laptop browser without
// AVIF gets the 1080 phone WebP, stretched by object-cover.
const LAPTOP = '(min-width: 1024px)'

type Props = {
  photo: CoverPhoto
  cityName: string
  /** Use the 1920 laptop crop at ≥1024 px (big passes); otherwise the 1080 crop everywhere. */
  large?: boolean
  /** Only the first pass on a page: eager load and fetchPriority high. */
  priority?: boolean
  /** Show only the blur and start no download yet. */
  hold?: boolean
  onFallback?: () => void
}

export function CoverImage({ photo, cityName, large = false, priority = false, hold = false, onFallback }: Props) {
  const [failed, setFailed] = useState(false)

  function fail() {
    if (failed) return
    setFailed(true)
    onFallback?.()
  }

  // An error that fired before hydration has no React listener; catch it on mount.
  function checkLoaded(img: HTMLImageElement | null) {
    if (img && img.complete && img.naturalWidth === 0 && img.currentSrc) fail()
  }

  if (failed) return <CityMapCover cityName={cityName} />

  const { files, focal } = photo
  return (
    <div
      data-cover="photo"
      className="absolute inset-0 bg-surface-2 bg-cover bg-center"
      style={{ backgroundImage: `url("${photo.blur}")` }}
    >
      {!hold && (
        <picture>
          {large && <source type="image/avif" media={LAPTOP} srcSet={files.lAvif} />}
          <source type="image/avif" srcSet={files.mAvif} />
          <img
            ref={checkLoaded}
            src={files.mWebp}
            alt={photo.alt}
            width={1080}
            height={608}
            decoding="async"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            onError={fail}
            className="h-full w-full object-cover"
            style={{ objectPosition: `${focal.x * 100}% ${focal.y * 100}%` }}
          />
        </picture>
      )}
    </div>
  )
}
