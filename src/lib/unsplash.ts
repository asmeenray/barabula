const UNSPLASH_BASE = 'https://api.unsplash.com/photos/random'

async function fetchUnsplashImage(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return null
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

/**
 * Fetches a representative city/destination image URL.
 * Uses the official Unsplash API with UNSPLASH_ACCESS_KEY.
 * Returns null on any failure (missing key, API error, network error).
 */
export async function fetchCityImage(city: string): Promise<string | null> {
  return fetchUnsplashImage(`${city} city travel`)
}

/**
 * Fetches an activity-specific image URL.
 * Primary query: "${activityName} ${destination}"
 * Fallback query: "${destination}" (destination-only)
 * Returns null when both queries fail or key is missing.
 */
export async function fetchActivityImage(
  activityName: string,
  destination: string
): Promise<string | null> {
  const primary = await fetchUnsplashImage(`${activityName} ${destination}`)
  if (primary) return primary
  return fetchUnsplashImage(destination)
}
