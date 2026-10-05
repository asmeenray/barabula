import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { isUuid } from '@/lib/uuid'

type Supabase = Awaited<ReturnType<typeof createClient>>

const SESSION_COLUMNS = 'id, trip_state, conversation_phase, itinerary_id'

// D-07: one chat per trip. Reads a single session by its id (?id=), or the chat linked to an
// itinerary (?itineraryId=, D-12) for "Continue planning".
// D-10: there is deliberately no DELETE. Starting a new trip keeps every old chat.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const params = new URL(req.url).searchParams
  const itineraryId = params.get('itineraryId')
  if (!params.has('id') && itineraryId !== null) {
    return sessionForItinerary(supabase, user.id, itineraryId)
  }

  const id = params.get('id')
  if (!isUuid(id)) return Response.json({ error: 'Invalid session id' }, { status: 400 })

  const { data } = await supabase
    .from('trip_sessions')
    .select(SESSION_COLUMNS)
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!data) return Response.json({ error: 'Chat not found' }, { status: 404 })

  return Response.json(data)
}

// D-12, D-27: the session linked to this itinerary. The message route re-points the link to the
// newest itinerary, so this is the chat that most recently produced it. An itinerary with no chat
// (made by hand) gets one linked session, reused afterwards.
async function sessionForItinerary(supabase: Supabase, userId: string, itineraryId: string) {
  if (!isUuid(itineraryId)) return Response.json({ error: 'Invalid itinerary id' }, { status: 400 })

  // T-14-21: never link a session to someone else's itinerary (D-26 WITH CHECK also blocks it)
  const { data: itinerary, error: ownerError } = await supabase
    .from('itineraries')
    .select('id')
    .eq('id', itineraryId)
    .eq('user_id', userId)
    .maybeSingle()
  if (ownerError) return Response.json({ error: ownerError.message }, { status: 500 })
  if (!itinerary) return Response.json({ error: 'Itinerary not found' }, { status: 404 })

  const findLinked = () => supabase
    .from('trip_sessions')
    .select(SESSION_COLUMNS)
    .eq('itinerary_id', itineraryId)
    .eq('user_id', userId)
    .maybeSingle()

  const { data: existing } = await findLinked()
  if (existing) return Response.json(existing)

  const { data: created, error } = await supabase
    .from('trip_sessions')
    .insert({ user_id: userId, itinerary_id: itineraryId })
    .select(SESSION_COLUMNS)
    .single()
  if (created) return Response.json(created)

  // Another request linked a session first (unique index on itinerary_id): use that one
  if (error?.code === '23505') {
    const { data: raced } = await findLinked()
    if (raced) return Response.json(raced)
  }

  console.error('Failed to open the chat for itinerary', itineraryId, error)
  return Response.json({ error: 'Failed to open chat' }, { status: 500 })
}
