import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { readJson } from '@/lib/api/json'
import { TripPatchSchema } from '@/lib/api/schemas'
import { isUuid } from '@/lib/uuid'

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
  if (error) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(data)
}

// Trip details edit (16-17, D-20). Order: session → uuid → JSON only (415,
// T-16-18) → strict TripPatchSchema (T-16-47) → extra_data merged into what is
// stored (sibling keys and the pass's client_ref kept) → RLS-scoped update.
// No row = 404 (missing or not yours); a database error says nothing more than
// "Couldn't save" (T-16-50).
const SAVE_FAILED = { error: "Couldn't save" }
const NOT_FOUND = { error: 'Not found' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isUuid(id)) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const read = await readJson(req)
  if (!read.ok) return read.response
  const parsed = TripPatchSchema.safeParse(read.body)
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })
  const { extra_data: extraPatch, ...columns } = parsed.data

  const updates: Record<string, unknown> = { ...columns }
  if (extraPatch) {
    // Safe merge: read the stored extra_data first so sibling keys survive.
    const { data: existing, error: readError } = await supabase
      .from('itineraries')
      .select('extra_data')
      .eq('id', id)
      .maybeSingle<{ extra_data: unknown }>()
    if (readError) return Response.json(SAVE_FAILED, { status: 500 })
    if (!existing) return Response.json(NOT_FOUND, { status: 404 })
    const stored = isRecord(existing.extra_data) ? existing.extra_data : {}
    const next: Record<string, unknown> = { ...stored }
    if (extraPatch.pass) {
      const pass = isRecord(stored.pass) ? stored.pass : {}
      next.pass = { ...pass, v: 1, ...extraPatch.pass }
    }
    if (extraPatch.day_count !== undefined) next.day_count = extraPatch.day_count
    updates.extra_data = next
  }

  const { data, error } = await supabase
    .from('itineraries')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) return Response.json(SAVE_FAILED, { status: 500 })
  if (!data) return Response.json(NOT_FOUND, { status: 404 })
  return Response.json(data)
}

// Delete trip (16-17, D-27). The client sends this only when the 10 s Undo
// window ends (or with keepalive when the page is left). Uuid only; the RLS
// user client deletes, and select('id') tells "deleted" from "nothing to
// delete" (missing or not yours → 404, T-16-48). Activities go with the trip
// by their ON DELETE CASCADE foreign key. Generic error text (T-16-50).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isUuid(id)) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const { data, error } = await supabase
    .from('itineraries')
    .delete()
    .eq('id', id)
    .select('id')
  if (error) return Response.json({ error: "Couldn't delete" }, { status: 500 })
  if (!data || data.length === 0) return Response.json(NOT_FOUND, { status: 404 })
  return Response.json({ success: true })
}
