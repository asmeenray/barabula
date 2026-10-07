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
  const [failedSlug, setFailedSlug] = useState<string | null>(null)
  // Moment 1 (D-30): a new photo fades in over the one shown (opacity, 450 ms)
  // once it has loaded; `under` is that old photo until the fade ends. Derived
  // from the previous render's photo, so nothing flashes in between.
  const [layers, setLayers] = useState<{ top: CoverPhoto; under: CoverPhoto | null; loaded: boolean }>({
    top: photo,
    under: null,
    loaded: true,
  })
  if (layers.top.slug !== photo.slug) {
    // Mid-fade, keep the photo that was fully shown underneath.
    const shown = layers.loaded ? layers.top : layers.under
    setLayers({ top: photo, under: shown && shown.slug !== failedSlug ? shown : null, loaded: false })
  }
  const failed = failedSlug === photo.slug

  function fail() {
    if (failed) return
    setFailedSlug(photo.slug)
    onFallback?.()
  }

  // An error that fired before hydration has no React listener; catch it on mount.
  function checkLoaded(img: HTMLImageElement | null) {
    if (img && img.complete && img.naturalWidth === 0 && img.currentSrc) fail()
  }

  if (failed) return <CityMapCover cityName={cityName} />

  const current = layers.top.slug === photo.slug ? layers : { top: photo, under: null, loaded: true }
  const visible = current.loaded || hold
  // Keyed by photo, so the old photo keeps its element (and decoded image)
  // when it moves under the new one.
  const stack = current.under ? [current.under, photo] : [photo]
  return (
    <>
      {stack.map((p) =>
        p.slug !== photo.slug ? (
          // Under reduced motion the new photo shows at once, so this is not drawn.
          <div key={p.slug} aria-hidden="true" className="absolute inset-0 motion-reduce:hidden">
            <Picture photo={p} large={large} />
          </div>
        ) : (
          <div
            key={p.slug}
            data-cover="photo"
            className={`absolute inset-0 bg-surface-2 bg-cover bg-center transition-opacity duration-[450ms] ease-[var(--ease-out)] motion-reduce:opacity-100 motion-reduce:transition-none ${
              visible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url("${p.blur}")` }}
            onTransitionEnd={() => setLayers((l) => (l.under ? { ...l, under: null } : l))}
          >
            {!hold && (
              <Picture
                photo={p}
                large={large}
                priority={priority}
                imgRef={checkLoaded}
                onLoad={() => setLayers((l) => (l.top.slug === p.slug && !l.loaded ? { ...l, loaded: true } : l))}
                onError={fail}
              />
            )}
          </div>
        )
      )}
    </>
  )
}

function Picture({
  photo,
  large,
  priority = false,
  imgRef,
  onLoad,
  onError,
}: {
  photo: CoverPhoto
  large: boolean
  priority?: boolean
  imgRef?: (img: HTMLImageElement | null) => void
  onLoad?: () => void
  onError?: () => void
}) {
  const { files, focal } = photo
  return (
    <picture>
      {large && <source type="image/avif" media={LAPTOP} srcSet={files.lAvif} />}
      <source type="image/avif" srcSet={files.mAvif} />
      <img
        ref={imgRef}
        src={files.mWebp}
        alt={onError ? photo.alt : ''}
        width={1080}
        height={608}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        onLoad={onLoad}
        onError={onError}
        className="h-full w-full object-cover"
        style={{ objectPosition: `${focal.x * 100}% ${focal.y * 100}%` }}
      />
    </picture>
  )
}
