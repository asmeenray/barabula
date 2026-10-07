import 'server-only'
import pkg from '../../package.json'
import type { CostTracker } from '@/lib/cost-log'

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

/**
 * Operational kill switch: NOMINATIM_DISABLED=1 makes every lookup answer
 * 'error' (nothing cached, nothing counted). The e2e server sets it so tests
 * never call the public Nominatim service.
 */
export function nominatimDisabled(): boolean {
  return process.env.NOMINATIM_DISABLED === '1'
}

export async function geocodeQuery(
  query: string,
  tracker?: Pick<CostTracker, 'count'>
): Promise<GeocodeResult> {
  // Checked before the throttle and before counting: a disabled lookup costs nothing.
  if (nominatimDisabled()) return { status: 'error' }
  await waitForSlot()
  const url = `${NOMINATIM_SEARCH_URL}?q=${encodeURIComponent(query)}&format=jsonv2&limit=1`
  try {
    // Count every real request attempt (D-15), including ones that fail.
    tracker?.count('nominatim')
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
