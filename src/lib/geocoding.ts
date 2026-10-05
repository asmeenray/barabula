import 'server-only'
import pkg from '../../package.json'

// Nominatim usage policy: identify the app, at most 1 request per second, cache results.
export const NOMINATIM_USER_AGENT = `Barabula/${pkg.version} (+https://github.com/asmeenray/barabula)`
export const NOMINATIM_MIN_INTERVAL_MS = 1100

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'

export type GeocodeResult =
  | { status: 'hit'; lat: number; lng: number }
  | { status: 'not_found' }
  | { status: 'error' }

// Module-level throttle: each call reserves the next free slot, so calls start
// at least NOMINATIM_MIN_INTERVAL_MS apart within one server instance.
let nextSlot = 0

async function waitForSlot(): Promise<void> {
  const now = Date.now()
  const start = Math.max(now, nextSlot)
  nextSlot = start + NOMINATIM_MIN_INTERVAL_MS
  const wait = start - now
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))
}

export function buildGeocodeQuery(location: string, destination: string | null): string {
  return destination ? `${location}, ${destination}` : location
}

export async function geocodeQuery(query: string): Promise<GeocodeResult> {
  await waitForSlot()
  const url = `${NOMINATIM_SEARCH_URL}?q=${encodeURIComponent(query)}&format=jsonv2&limit=1`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT } })
    // 429 (rate limited) and 403 (blocked) are errors too: never cache them as not_found.
    if (!res.ok) return { status: 'error' }
    const data: unknown = await res.json()
    if (!Array.isArray(data)) return { status: 'error' }
    const first = data[0] as { lat?: unknown; lon?: unknown } | undefined
    if (!first) return { status: 'not_found' }
    const lat = parseFloat(String(first.lat))
    const lng = parseFloat(String(first.lon))
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { status: 'not_found' }
    return { status: 'hit', lat, lng }
  } catch {
    return { status: 'error' }
  }
}

/** Test helper: reset the throttle between tests. */
export function __resetGeocodeThrottle(): void {
  nextSlot = 0
}
