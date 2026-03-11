import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { AIResponseSchema, zodResponseFormat } from '@/lib/ai/schemas'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import type { TripState, ConversationPhase } from '@/lib/ai/schemas'
import { fetchCityImage } from '@/lib/unsplash'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Lazy-initialize after auth so key is not required for unauthenticated calls
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const { content } = await req.json()
  if (!content?.trim()) return Response.json({ error: 'Message content is required' }, { status: 400 })

  // Load current trip session (if any)
  const { data: sessionRow } = await supabase
    .from('trip_sessions')
    .select('trip_state, conversation_phase')
    .eq('user_id', user.id)
    .maybeSingle()

  const currentTripState: Partial<TripState> = sessionRow?.trip_state ?? {}
  const currentPhase: ConversationPhase | string = sessionRow?.conversation_phase ?? 'gathering_destination'

  // Fetch last 20 messages for conversation context
  const { data: history } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(20)

  const systemPrompt = buildSystemPrompt(currentTripState, currentPhase)

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      ...(history ?? []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content },
    ],
    response_format: zodResponseFormat(AIResponseSchema, 'ai_response'),
  })

  const parsed = completion.choices[0].message.parsed

  // Guard: if parse fails entirely, return 500
  if (!parsed) {
    console.error('[chat/message] OpenAI structured output parse returned null')
    return Response.json({ error: 'AI response parse failed' }, { status: 500 })
  }

  // Server guard: prevent premature itinerary_complete phase flip when itinerary is missing
  let safePhase = parsed.conversation_phase
  if (safePhase === 'itinerary_complete' && !parsed.itinerary) {
    console.warn('[chat/message] Model returned itinerary_complete with null itinerary — overriding to ready_for_summary')
    safePhase = 'ready_for_summary'
  }

  // Persist both messages to chat_history
  await supabase.from('chat_history').insert([
    { user_id: user.id, role: 'user', content },
    { user_id: user.id, role: 'assistant', content: parsed.reply },
  ])

  // Upsert trip session with latest state
  await supabase.from('trip_sessions').upsert(
    {
      user_id: user.id,
      trip_state: parsed.trip_state,
      conversation_phase: safePhase,
    },
    { onConflict: 'user_id' }
  )

  // If itinerary complete and itinerary data present, persist itinerary + activities
  if (safePhase === 'itinerary_complete' && parsed.itinerary) {
    const { days, ...itineraryFields } = parsed.itinerary

    // Normalize dates to YYYY-MM-DD (model sometimes returns "20th March 2026" etc.)
    const normalizeDate = (raw: string): string => {
      const d = new Date(raw)
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
      return raw // pass through and let DB report the error if still invalid
    }
    itineraryFields.start_date = normalizeDate(itineraryFields.start_date)
    itineraryFields.end_date = normalizeDate(itineraryFields.end_date)

    const { data: newItinerary, error: insertError } = await supabase
      .from('itineraries')
      .insert({ user_id: user.id, ...itineraryFields })
      .select()
      .single()

    if (insertError) {
      console.error('[chat/message] Failed to insert itinerary:', insertError)
      return Response.json({ error: 'Failed to save itinerary' }, { status: 500 })
    }

    // Fetch and store cover image for the new itinerary
    const destination = itineraryFields.destination ?? itineraryFields.title
    if (destination) {
      const coverUrl = await fetchCityImage(destination)
      if (coverUrl) {
        await supabase
          .from('itineraries')
          .update({ cover_image_url: coverUrl })
          .eq('id', newItinerary.id)
      }
    }

    // Insert activities from all days (flatten)
    const activities = days.flatMap(day =>
      day.activities.map(act => ({
        itinerary_id: newItinerary.id,
        day_number: day.day_number,
        name: act.name,
        time: act.time,
        description: act.description,
        location: act.location,
        activity_type: act.activity_type ?? null,
        extra_data: (act.activity_type === 'hotel')
          ? {
              hotel_name: act.hotel_name,
              star_rating: act.star_rating,
              check_in: act.check_in,
              check_out: act.check_out,
            }
          : {},
      }))
    )
    if (activities.length > 0) {
      await supabase.from('activities').insert(activities)
    }

    return Response.json({
      content: parsed.reply,
      itineraryId: newItinerary.id,
      conversationPhase: safePhase,
      tripState: parsed.trip_state,
    })
  }

  return Response.json({
    content: parsed.reply,
    conversationPhase: safePhase,
    tripState: parsed.trip_state,
  })
}
