import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/uuid'
import { dayCountFor, sortActivities } from '@/lib/plan/days'
import type { PlanActivity, PlanTrip, TripPlan } from '@/lib/plan/types'
import { tripCover } from '@/lib/photos/cover'
import { CITY_PHOTOS } from '@/lib/photos/manifest'
import type { PassCity } from '@/lib/pass/types'
import { PlanClient } from '@/components/board/PlanClient'
import { TopBar } from '@/components/shell/TopBar'
import { TripMenu } from '@/components/board/TripMenu'

// Server-rendered trip plan (RESEARCH Pattern 4).
// No loading.tsx and no Suspense fallback in this segment: the trip-open view
// transition needs the page to render without suspending (Pitfall 8).

type Row = PlanTrip & { activities: PlanActivity[] | null }

export default async function TripPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // D-40: the logged-out share view stays broken in phase 16 (handover §25).
  if (!user) redirect('/login')

  // RLS limits rows to the owner; the user_id filter is a second guard (T-16-11).
  const { data } = await supabase
    .from('itineraries')
    .select('*, activities(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle<Row>()

  if (!data) notFound()

  const { activities, ...trip } = data
  const sorted = sortActivities(activities ?? [])
  const plan: TripPlan = {
    trip,
    activities: sorted,
    dayCount: dayCountFor(trip, sorted),
  }
  // Cover photo chosen here on the server (D-06, 16-21): the city photo, else the
  // country photo for the start month and interests; no match gives the city-map cover.
  const photo = tripCover(trip)
  // The curated list for the trip-details Where to? (16-17); names only, no manifest in client JS.
  const cities: PassCity[] = CITY_PHOTOS.map((p) => ({ name: p.city, names: p.names, code: p.iata }))

  // Inner page: back to Trips, no wordmark; the trip "⋯" menu (Delete trip, D-27) on the right.
  return (
    <>
      <TopBar
        variant="inner"
        back={{ href: '/', label: 'Trips' }}
        actions={<TripMenu tripId={trip.id} city={trip.destination || trip.title} />}
      />
      <PlanClient plan={plan} photo={photo} cities={cities} />
    </>
  )
}
