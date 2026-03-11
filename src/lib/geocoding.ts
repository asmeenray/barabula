import type { Activity } from '@/lib/types'

export async function resolveActivityCoordinates(
  activity: Activity & { extra_data?: Record<string, unknown> | null },
  contextDestination: string | null
): Promise<{ lat: number; lng: number } | null> {
  const cached = activity.extra_data as Record<string, unknown> | null
  if (cached?.lat && cached?.lng) {
    return { lat: cached.lat as number, lng: cached.lng as number }
  }
  if (!activity.location) return null
  const query = contextDestination
    ? `${activity.location}, ${contextDestination}`
    : activity.location
  // Primary: Mapbox if token available
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (mapboxToken) {
    try {
      const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&limit=1&access_token=${mapboxToken}`
      const res = await fetch(url)
      const data = await res.json()
      const coords = data.features?.[0]?.geometry?.coordinates
      if (coords) return { lng: coords[0], lat: coords[1] }
    } catch { /* fall through to Nominatim */ }
  }

  // Fallback: Nominatim (OpenStreetMap) — free, no API key required
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Barabula Trip Planner (contact@barabula.app)' },
    })
    const data = await res.json()
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch { /* geocoding failed */ }

  return null
}
