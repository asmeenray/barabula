import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import type { ChatMessage } from '@/lib/types'
import { isUuid } from '@/lib/uuid'

// D-07: history belongs to one chat. Without a valid ?session= nothing is returned.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const session = new URL(req.url).searchParams.get('session')
  if (!isUuid(session)) return Response.json({ error: 'Invalid session id' }, { status: 400 })

  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('session_id', session)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json((data ?? []) as ChatMessage[])
}
