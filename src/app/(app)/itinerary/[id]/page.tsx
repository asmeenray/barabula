import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/uuid'
import { dayCountFor, sortActivities } from '@/lib/plan/days'
import type { PlanActivity, PlanTrip, TripPlan } from '@/lib/plan/types'
import { PlanClient } from '@/components/board/PlanClient'

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

  return <PlanClient plan={plan} />
}
