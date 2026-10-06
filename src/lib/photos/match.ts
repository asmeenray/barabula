// Server-side choice of a pass cover photo (D-06): a trip's destination is free
// text, so it is normalised and matched exactly against the manifest names.
// No match means the styled city-map cover. Pure string work; no URL is ever
// built from the user's text (T-16-23).

import { CITY_PHOTOS, type CityPhoto } from './manifest'

/** Lowercase, strip accents, cut at the first comma, trim and collapse spaces. */
export function normalizeCity(value: string): string {
  return value
    .split(',')[0]
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** The curated photo for a destination, or null (city-map cover). */
export function photoFor(destination: string | null | undefined): CityPhoto | null {
  if (!destination) return null
  const key = normalizeCity(destination)
  if (!key) return null
  return CITY_PHOTOS.find((p) => p.names.includes(key)) ?? null
}

/**
 * A random curated city. Call it from server data functions only, never during
 * render (React Compiler purity lint, Pitfall 10).
 */
export function randomCity(rand: () => number = Math.random): CityPhoto {
  const i = Math.min(Math.floor(rand() * CITY_PHOTOS.length), CITY_PHOTOS.length - 1)
  return CITY_PHOTOS[Math.max(i, 0)]
}
