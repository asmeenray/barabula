import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Check if itinerary is public — if so, skip auth requirement
  const { data: publicCheck } = await supabase
    .from('itineraries')
    .select('is_public')
    .eq('id', id)
    .maybeSingle()
  const isPublicItinerary = publicCheck?.is_public === true
  if (!isPublicItinerary) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('itineraries')
    .select('*, activities(*)')
    .eq('id', id)
    .single()
  if (error) return Response.json({ error: error.message }, { status: 404 })
  return Response.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.destination !== undefined) updates.destination = body.destination
  if (body.start_date !== undefined) updates.start_date = body.start_date
  if (body.end_date !== undefined) updates.end_date = body.end_date
  if (body.is_public !== undefined) updates.is_public = Boolean(body.is_public)
  if (body.extra_data !== undefined) {
    // Safe merge: read existing extra_data first to avoid overwriting sibling keys
    const { data: existing } = await supabase
      .from('itineraries')
      .select('extra_data')
      .eq('id', id)
      .single()
    const existingExtraData = (existing?.extra_data ?? {}) as Record<string, unknown>
    updates.extra_data = { ...existingExtraData, ...body.extra_data }
  }

  const { data, error } = await supabase
    .from('itineraries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('itineraries')
    .delete()
    .eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
