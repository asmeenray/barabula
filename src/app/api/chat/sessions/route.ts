import { createClient } from '@/lib/supabase/server'
import type { TripSessionSummary } from '@/lib/types'

// D-09: the dashboard "In progress" list. Trip chats that have not produced an itinerary yet,
// newest first. Filtered by user_id on top of RLS (T-14-20).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('trip_sessions')
    .select('id, trip_state, conversation_phase, updated_at')
    .eq('user_id', user.id)
    .is('itinerary_id', null)
    .order('updated_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json((data ?? []) as TripSessionSummary[])
}
