import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import type { Itinerary } from '@/lib/types'
import { readJson } from '@/lib/api/json'
import { PassCreateSchema } from '@/lib/pass/schema'
import { spanDays } from '@/lib/pass/dates'

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

// Start planning on the blank pass (D-18): creates a trip from the pass answers.
// JSON only (415 otherwise, T-16-29), strict zod (T-16-27), user_id from the
// session only, and idempotent per client_ref (T-16-28, Pitfall 7): a retry of
// the same pass returns the trip the first call made.
const CREATE_FAILED = { error: "Couldn't create the trip" }

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const read = await readJson(req)
  if (!read.ok) return read.response
  const parsed = PassCreateSchema.safeParse(read.body)
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })
  const pass = parsed.data

  const { data: existing, error: lookupError } = await supabase
    .from('itineraries')
    .select('id')
    .eq('user_id', user.id)
    .eq('extra_data->pass->>client_ref', pass.client_ref)
    .limit(1)
    .maybeSingle<{ id: string }>()
  if (lookupError) return Response.json(CREATE_FAILED, { status: 500 })
  if (existing) return Response.json({ id: existing.id }, { status: 200 })

  const when = pass.when
  const dated = when?.kind === 'dates'
  // Multi-city trips share one day list (Asmeen, 2026-10-06); stops are kept
  // in order for the title only.
  const dayCount = when?.kind === 'length' ? when.days : dated ? (spanDays(when.start, when.end) ?? 1) : 1

  const { data, error } = await supabase
    .from('itineraries')
    .insert({
      user_id: user.id,
      title: pass.stops.join(' → '),
      destination: pass.stops[0],
      start_date: dated ? when.start : null,
      end_date: dated ? when.end : null,
      extra_data: {
        pass: {
          v: 1,
          stops: pass.stops,
          when: pass.when,
          adults: pass.adults,
          kids: pass.kids,
          interests: pass.interests,
          note: pass.note,
          client_ref: pass.client_ref,
        },
        day_count: dayCount,
      },
    })
    .select('id')
    .single<{ id: string }>()
  if (error || !data) return Response.json(CREATE_FAILED, { status: 500 })
  return Response.json({ id: data.id }, { status: 201 })
}
