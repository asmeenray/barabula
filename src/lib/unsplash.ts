import type { CostTracker } from '@/lib/cost-log'

/** Optional call counter (D-15): only the tracker's count method is used. */
type CallCounter = Pick<CostTracker, 'count'>

const UNSPLASH_BASE = 'https://api.unsplash.com/photos/random'
const PEXELS_BASE = 'https://api.pexels.com/v1/search'

async function fetchUnsplashImage(query: string, tracker?: CallCounter): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return null
  tracker?.count('unsplash')
  try {
    const url = `${UNSPLASH_BASE}?query=${encodeURIComponent(query)}&orientation=landscape`
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data as { urls: { regular: string } }).urls.regular ?? null
  } catch {
    return null
  }
}

async function fetchPexelsImage(query: string, tracker?: CallCounter): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return null
  tracker?.count('pexels')
  try {
    const url = `${PEXELS_BASE}?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`
    const res = await fetch(url, { headers: { Authorization: key } })
    if (!res.ok) return null
    const data = await res.json()
    const photo = (data as { photos?: { src: { large2x: string } }[] }).photos?.[0]
    return photo?.src.large2x ?? null
  } catch {
    return null
  }
}

async function fetchImage(query: string, tracker?: CallCounter): Promise<string | null> {
  const unsplash = await fetchUnsplashImage(query, tracker)
  if (unsplash) return unsplash
  return fetchPexelsImage(query, tracker)
}

/**
 * Fetches a representative city/destination image URL.
 * Tries Unsplash first, falls back to Pexels.
 * Returns null on any failure (missing keys, API error, network error).
 * An optional tracker counts each request actually sent (D-15).
 */
export async function fetchCityImage(city: string, tracker?: CallCounter): Promise<string | null> {
  return fetchImage(`${city} city travel`, tracker)
}

/**
 * Fetches an activity-specific image URL.
 * Primary query: "${activityName} ${destination}"
 * Fallback query: "${destination}" (destination-only)
 * Tries Unsplash first, falls back to Pexels.
 * Returns null when all queries fail or keys are missing.
 * An optional tracker counts each request actually sent (D-15).
 */
export async function fetchActivityImage(
  activityName: string,
  destination: string,
  tracker?: CallCounter
): Promise<string | null> {
  const primary = await fetchImage(`${activityName} ${destination}`, tracker)
  if (primary) return primary
  return fetchImage(destination, tracker)
}
