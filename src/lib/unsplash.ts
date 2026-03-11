/**
 * Fetches a representative city/destination image URL.
 * Uses Unsplash Source (no API key required).
 * Follows the redirect to get the stable image URL for storage.
 */
export async function fetchCityImage(city: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${city} city travel`)
    const sourceUrl = `https://source.unsplash.com/1200x800/?${query}`
    const res = await fetch(sourceUrl, { redirect: 'follow' })
    if (!res.ok) return null
    // After following redirect, the final URL is the actual image
    return res.url
  } catch {
    return null
  }
}
