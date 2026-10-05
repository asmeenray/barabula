import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { isUuid } from '@/lib/uuid'

// D-07: one chat per trip. Reads a single session by its id.
// D-10: there is deliberately no DELETE. Starting a new trip keeps every old chat.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!isUuid(id)) return Response.json({ error: 'Invalid session id' }, { status: 400 })

  const { data } = await supabase
    .from('trip_sessions')
    .select('id, trip_state, conversation_phase, itinerary_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!data) return Response.json({ error: 'Chat not found' }, { status: 404 })

  return Response.json(data)
}
