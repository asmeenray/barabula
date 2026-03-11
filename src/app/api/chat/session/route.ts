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

  return Response.json(data ?? { trip_state: {}, conversation_phase: 'gathering_destination' })
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
