import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('trip_sessions')
    .select('trip_state, conversation_phase')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) {
    return Response.json({ trip_state: {}, conversation_phase: 'gathering_destination', flight_input_data: null, hotel_save_data: null })
  }

  // Extract client-managed keys from trip_state and return as top-level fields
  const { _client_flight_data, _client_hotel_data, ...aiTripState } = (data.trip_state ?? {}) as Record<string, unknown>

  return Response.json({
    trip_state: aiTripState,
    conversation_phase: data.conversation_phase,
    flight_input_data: _client_flight_data ?? null,
    hotel_save_data: _client_hotel_data ?? null,
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { flight_input_data, hotel_save_data } = body as {
    flight_input_data?: unknown
    hotel_save_data?: unknown
  }

  // Load existing trip_state to merge (preserve AI-generated fields)
  const { data: existing } = await supabase
    .from('trip_sessions')
    .select('trip_state')
    .eq('user_id', user.id)
    .maybeSingle()

  const currentTripState = (existing?.trip_state ?? {}) as Record<string, unknown>
  const updatedTripState: Record<string, unknown> = { ...currentTripState }
  if (flight_input_data !== undefined) updatedTripState._client_flight_data = flight_input_data
  if (hotel_save_data !== undefined) updatedTripState._client_hotel_data = hotel_save_data

  await supabase
    .from('trip_sessions')
    .upsert({ user_id: user.id, trip_state: updatedTripState }, { onConflict: 'user_id' })

  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Delete both trip session AND chat history for a clean slate
  const [sessionResult, historyResult] = await Promise.all([
    supabase.from('trip_sessions').delete().eq('user_id', user.id),
    supabase.from('chat_history').delete().eq('user_id', user.id),
  ])

  if (sessionResult.error || historyResult.error) {
    return Response.json({ error: 'Failed to reset session' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
