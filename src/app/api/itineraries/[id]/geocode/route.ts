import { createClient } from '@/lib/supabase/server'
import { buildGeocodeQuery, geocodeQuery } from '@/lib/geocoding'
import { OSM_GEO_SOURCE, needsGeocoding, osmCoordsFrom } from '@/lib/geo-cache'
import { isUuid } from '@/lib/uuid'

// Up to 20 Nominatim calls at >= 1.1 s each fit comfortably in 60 s.
export const maxDuration = 60
// Not exported: Next route files may only export handlers and route config.
const GEOCODE_BATCH_LIMIT = 20

type ActivityRow = {
  id: string
  name: string
  day_number: number
  location: string | null
  activity_type: string | null
  extra_data: Record<string, unknown> | null
}

type Pin = {
  id: string
  name: string
  day: number
  lat: number
  lng: number
  type: 'activity' | 'hotel'
}

function toPin(act: ActivityRow, coords: { lat: number; lng: number }): Pin {
  return {
    id: act.id,
    name: act.name,
    day: act.day_number,
    lat: coords.lat,
    lng: coords.lng,
    type: act.activity_type === 'hotel' ? 'hotel' : 'activity',
  }
}

/**
 * Owner-only: geocodes up to GEOCODE_BATCH_LIMIT uncached activities through
 * Nominatim, stores OSM coordinates in activities.extra_data and returns all
 * known pins plus how many activities still need geocoding.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isUuid(id)) return Response.json({ error: 'Invalid id' }, { status: 400 })

  const { data: itinerary, error } = await supabase
    .from('itineraries')
    .select('id, destination, activities(id, name, day_number, location, activity_type, extra_data)')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return Response.json({ error: 'Could not load itinerary' }, { status: 500 })
  if (!itinerary) return Response.json({ error: 'Not found' }, { status: 404 })

  const destination = (itinerary.destination as string | null) ?? null
  const activities = (itinerary.activities ?? []) as ActivityRow[]

  const pins: Pin[] = []
  const pending: ActivityRow[] = []
  for (const act of activities) {
    const coords = osmCoordsFrom(act.extra_data)
    if (coords) pins.push(toPin(act, coords))
    else if (act.location && needsGeocoding(act.extra_data)) pending.push(act)
  }

  let processed = 0
  for (const act of pending.slice(0, GEOCODE_BATCH_LIMIT)) {
    const result = await geocodeQuery(buildGeocodeQuery(act.location as string, destination))
    // Network error, 429 or 403: write nothing, stop, retry on a later call.
    if (result.status === 'error') break

    // Hit: lat/lng tagged geo_source 'osm_nominatim'. Miss: geo_status 'not_found' (never re-queried).
    const geocodedAt = new Date().toISOString()
    const existing = act.extra_data ?? {}
    const extra_data =
      result.status === 'hit'
        ? { ...existing, lat: result.lat, lng: result.lng, geo_source: OSM_GEO_SOURCE, geocoded_at: geocodedAt }
        : { ...existing, geo_status: 'not_found', geocoded_at: geocodedAt }

    // User RLS client: the owner policy on activities guards the write.
    const { error: updateError } = await supabase
      .from('activities')
      .update({ extra_data })
      .eq('id', act.id)
      .eq('itinerary_id', id)
    if (updateError) break

    processed++
    if (result.status === 'hit') pins.push(toPin(act, result))
  }

  return Response.json({ pins, remaining: pending.length - processed })
}
