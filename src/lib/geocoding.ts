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
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return null
  const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&limit=1&access_token=${token}`
  try {
    const res = await fetch(url)
    const data = await res.json()
    const coords = data.features?.[0]?.geometry?.coordinates
    if (!coords) return null
    return { lng: coords[0], lat: coords[1] }
  } catch {
    return null
  }
}
