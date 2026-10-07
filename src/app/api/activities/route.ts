import { createClient } from '@/lib/supabase/server'
import { readJson } from '@/lib/api/json'
import { ActivityCreateSchema } from '@/lib/api/schemas'

// Add a place by hand (16-11, D-18). JSON only, strict body, and an explicit
// ownership check on the itinerary before the insert (T-16-31), on top of the
// owner RLS policy. The server picks the position: the end of the target
// bucket (a day, or Maybe when day_number is null). Errors are generic.

const SAVE_FAILED = { error: "Couldn't add the place" }
const INVALID = { error: 'Invalid request' }

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const read = await readJson(req)
  if (!read.ok) return read.response

  const parsed = ActivityCreateSchema.safeParse(read.body)
  if (!parsed.success) return Response.json(INVALID, { status: 400 })
  const input = parsed.data

  const { data: itinerary, error: ownerError } = await supabase
    .from('itineraries')
    .select('id')
    .eq('id', input.itinerary_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (ownerError) {
    console.error('[activities POST] owner check failed', (ownerError as { code?: string }).code)
    return Response.json(SAVE_FAILED, { status: 500 })
  }
  if (!itinerary) return Response.json({ error: 'Not found' }, { status: 404 })

  // Highest position in the bucket; rows with a null position sort last and are skipped.
  const bucket = supabase
    .from('activities')
    .select('position')
    .eq('itinerary_id', input.itinerary_id)
  const scoped = input.day_number === null ? bucket.is('day_number', null) : bucket.eq('day_number', input.day_number)
  const { data: last, error: readError } = await scoped
    .not('position', 'is', null)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (readError) {
    console.error('[activities POST] position read failed', (readError as { code?: string }).code)
    return Response.json(SAVE_FAILED, { status: 500 })
  }
  const max = typeof last?.position === 'number' ? last.position : null
  const position = max === null ? 1 : max + 1

  const { data, error } = await supabase
    .from('activities')
    .insert({
      itinerary_id: input.itinerary_id,
      day_number: input.day_number,
      position,
      name: input.name,
      location: input.location ?? null,
      description: input.description ?? null,
      time: input.time ?? null,
      extra_data: input.extra_data ?? {},
    })
    .select()
    .single()
  if (error || !data) {
    console.error('[activities POST] insert failed', (error as { code?: string } | null)?.code)
    return Response.json(SAVE_FAILED, { status: 500 })
  }
  return Response.json(data, { status: 201 })
}
