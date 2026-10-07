import { createClient } from '@/lib/supabase/server'
import { buildGeocodeQuery, geocodeQuery } from '@/lib/geocoding'
import { OSM_GEO_SOURCE } from '@/lib/geo-cache'
import { isUuid } from '@/lib/uuid'
import { startCostLog, type CostTracker } from '@/lib/cost-log'

// "Find on map" (16-11, D-23, D-24): the owner-only lookup of one place.
// Same server-side Nominatim path as the batch route (module throttle 1.1 s,
// User-Agent, OSM-tagged cache in extra_data, one cost_log row per lookup).
// A stored not_found is cleared first, so a retry really asks again.
// No other geocoder is ever called and nothing else is stored (T-16-34).

// One lookup waits at most for the throttle slot plus one request.
export const maxDuration = 15

/** Dropped before a fresh lookup is written (geocoded_at is rewritten anyway). */
const STALE_KEYS = ['geo_status', 'lat', 'lng', 'geo_source'] as const

type GeocodeAnswer =
  | { status: 'hit'; lat: number; lng: number }
  | { status: 'not_found' }
  | { status: 'no_location' }
  | { status: 'error' }

type Row = {
  id: string
  location: string | null
  extra_data: Record<string, unknown> | null
  itineraries: { user_id: string; destination: string | null } | null
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const cost = startCostLog('/api/activities/[id]/geocode', user.id)
  try {
    return await geocodeActivity(supabase, user.id, id, cost)
  } finally {
    await cost.flush()
  }
}

async function geocodeActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  id: string,
  cost: CostTracker
) {
  if (!isUuid(id)) return Response.json({ error: 'Invalid id' }, { status: 400 })

  // The owner filter is explicit (T-16-32), on top of the RLS policy.
  const { data, error } = await supabase
    .from('activities')
    .select('id, location, extra_data, itineraries!inner(user_id, destination)')
    .eq('id', id)
    .eq('itineraries.user_id', userId)
    .maybeSingle()
  if (error) return Response.json({ error: 'Could not load the place' }, { status: 500 })
  const row = data as Row | null
  if (!row || row.itineraries?.user_id !== userId) return Response.json({ error: 'Not found' }, { status: 404 })

  const location = row.location?.trim()
  if (!location) return Response.json({ status: 'no_location' } satisfies GeocodeAnswer)

  const result = await geocodeQuery(buildGeocodeQuery(location, row.itineraries.destination), cost)
  // Network error, 429, 403 or the kill switch: write nothing.
  if (result.status === 'error') return Response.json({ status: 'error' } satisfies GeocodeAnswer)

  // A retry asks again: the old miss and any stale coordinates go first.
  const rest: Record<string, unknown> = { ...(row.extra_data ?? {}) }
  for (const key of STALE_KEYS) delete rest[key]
  const geocodedAt = new Date().toISOString()
  const extra_data =
    result.status === 'hit'
      ? { ...rest, lat: result.lat, lng: result.lng, geo_source: OSM_GEO_SOURCE, geocoded_at: geocodedAt }
      : { ...rest, geo_status: 'not_found', geocoded_at: geocodedAt }

  // User RLS client: the owner policy on activities guards the write.
  const { error: updateError } = await supabase.from('activities').update({ extra_data }).eq('id', id)
  if (updateError) return Response.json({ status: 'error' } satisfies GeocodeAnswer)

  const answer: GeocodeAnswer =
    result.status === 'hit' ? { status: 'hit', lat: result.lat, lng: result.lng } : { status: 'not_found' }
  return Response.json(answer)
}
