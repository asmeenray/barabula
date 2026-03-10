import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import type { Itinerary } from '@/lib/types'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('itineraries')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data as Itinerary[])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, destination, description, start_date, end_date } = body
  if (!title?.trim()) return Response.json({ error: 'Title is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('itineraries')
    .insert({ user_id: user.id, title, destination, description, start_date, end_date })
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
