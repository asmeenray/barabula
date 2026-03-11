import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('trip_sessions')
    .delete()
    .eq('user_id', user.id)

  if (error) return Response.json({ error: 'Failed to reset session' }, { status: 500 })

  return Response.json({ ok: true })
}
