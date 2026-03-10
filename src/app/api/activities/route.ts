import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { itinerary_id, day_number, name, time, description, location } = body
  if (!itinerary_id || !day_number || !name?.trim()) {
    return Response.json({ error: 'itinerary_id, day_number, and name are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('activities')
    .insert({ itinerary_id, day_number, name, time: time || null, description: description || null, location: location || null })
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
