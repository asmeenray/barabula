// Server-side choice of a pass cover photo (D-06): a trip's destination is free
// text, so it is normalised and matched exactly against the manifest names.
// No match means the styled city-map cover. Pure string work; no URL is ever
// built from the user's text (T-16-23).

import { CITY_PHOTOS, type CityPhoto } from './manifest'
import { findCity, normalizeCity } from './normalize'

export { normalizeCity }

/** The curated photo for a destination, or null (city-map cover). */
export function photoFor(destination: string | null | undefined): CityPhoto | null {
  return findCity(CITY_PHOTOS, destination)
}

/**
 * A random curated city. Call it from server data functions only, never during
 * render (React Compiler purity lint, Pitfall 10).
 */
export function randomCity(rand: () => number = Math.random, avoid: readonly string[] = []): CityPhoto {
  // Skip photos already on the page (e.g. the NOW pass's city), unless that
  // would leave nothing to pick.
  const pool = CITY_PHOTOS.filter((p) => !avoid.includes(p.slug))
  const list = pool.length ? pool : CITY_PHOTOS
  const i = Math.min(Math.floor(rand() * list.length), list.length - 1)
  return list[Math.max(i, 0)]
}
