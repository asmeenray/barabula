import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { isUuid } from '@/lib/uuid'
import { readJson } from '@/lib/api/json'
import { ActivityPatchSchema } from '@/lib/api/schemas'

// Activity edits for the trip plan (16-07). Every write goes through the
// user's RLS client (never the service role), so another user's id simply
// matches no row → 404. Errors are generic; database messages stay server-side.

/** Cached map keys in extra_data; cleared when the location changes so it is geocoded again (Pitfall 6). */
const GEO_KEYS = ['lat', 'lng', 'geo_source', 'geo_status', 'geocoded_at'] as const

const SAVE_FAILED = { error: "Couldn't save" }
const NOT_FOUND = { error: 'Not found' }
const INVALID = { error: 'Invalid request' }

type ExtraData = Record<string, unknown>

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isUuid(id)) return Response.json(INVALID, { status: 400 })

  const read = await readJson(req)
  if (!read.ok) return read.response

  const parsed = ActivityPatchSchema.safeParse(read.body)
  if (!parsed.success) return Response.json(INVALID, { status: 400 })
  const { extra_data: extraPatch, ...columns } = parsed.data

  const updates: Record<string, unknown> = { ...columns }

  if (extraPatch !== undefined || columns.location !== undefined) {
    // Safe merge: read the stored extra_data so sibling keys survive.
    const { data: existing, error: readError } = await supabase
      .from('activities')
      .select('extra_data, location')
      .eq('id', id)
      .maybeSingle()
    if (readError) {
      console.error('[activities PATCH] read failed', readError.code)
      return Response.json(SAVE_FAILED, { status: 500 })
    }
    if (!existing) return Response.json(NOT_FOUND, { status: 404 })

    const stored = (existing.extra_data ?? {}) as ExtraData
    const merged: ExtraData = { ...stored, ...(extraPatch ?? {}) }
    const locationChanged =
      columns.location !== undefined && columns.location !== ((existing.location as string | null) ?? null)
    if (locationChanged) for (const key of GEO_KEYS) delete merged[key]

    if (extraPatch !== undefined || locationChanged) updates.extra_data = merged
  }

  const { data, error } = await supabase
    .from('activities')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) {
    console.error('[activities PATCH] update failed', error.code)
    return Response.json(SAVE_FAILED, { status: 500 })
  }
  if (!data) return Response.json(NOT_FOUND, { status: 404 })
  return Response.json(data)
}

// Remove from trip (16-09). The client holds the delete for the 10 s Undo
// window and sends it only when the toast closes (D-27 pattern), so this runs
// once per removal. RLS scopes the delete to the owner; no row → 404.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isUuid(id)) return Response.json(INVALID, { status: 400 })

  const { data, error } = await supabase.from('activities').delete().eq('id', id).select('id')
  if (error) {
    console.error('[activities DELETE] failed', error.code)
    return Response.json(SAVE_FAILED, { status: 500 })
  }
  if (!data || data.length === 0) return Response.json(NOT_FOUND, { status: 404 })
  return Response.json({ success: true })
}
