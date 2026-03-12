import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { AIResponseSchema, zodResponseFormat } from '@/lib/ai/schemas'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import type { TripState, ConversationPhase, Flight } from '@/lib/ai/schemas'
import { fetchCityImage, fetchActivityImage } from '@/lib/unsplash'
import { fetchPlacesData } from '@/lib/places'
import type { FlightInputData } from '@/components/chat/FlightsTabPanel'
import type { HotelSaveData } from '@/components/chat/HotelsTabPanel'

export const maxDuration = 60 // seconds — prevents Vercel's default 10s timeout killing AI calls

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Lazy-initialize after auth so key is not required for unauthenticated calls
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const body = await req.json()
  const { content, flightInputData, hotelSaveData, transportMode } = body as {
    content: string
    flightInputData?: FlightInputData | null
    hotelSaveData?: HotelSaveData | null
    transportMode?: string | null
  }
  if (!content?.trim()) return Response.json({ error: 'Message content is required' }, { status: 400 })

  // Load current trip session (if any)
  const { data: sessionRow } = await supabase
    .from('trip_sessions')
    .select('trip_state, conversation_phase')
    .eq('user_id', user.id)
    .maybeSingle()

  const currentTripState: Partial<TripState> = sessionRow?.trip_state ?? {}
  const currentPhase: ConversationPhase | string = sessionRow?.conversation_phase ?? 'gathering_destination'

  // Merge client-provided transportMode into trip state for this request
  const mergedTripState: Partial<TripState> = {
    ...currentTripState,
    ...(transportMode != null ? { transport_mode: transportMode } : {}),
  }

  // Fetch last 20 messages for conversation context
  const { data: history } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(20)

  const systemPrompt = buildSystemPrompt(mergedTripState, currentPhase, flightInputData, hotelSaveData)

  const CONCISE_PREFIX = 'CONCISE MODE: Keep every activity description to 2 sentences maximum. One sentence for the transport bridge. No bullet points inside descriptions. No interesting facts.\n\n'

  const buildMessages = (concise = false) => [
    { role: 'system' as const, content: concise ? CONCISE_PREFIX + systemPrompt : systemPrompt },
    ...(history ?? []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content },
  ]

  let completion
  try {
    completion = await openai.chat.completions.parse({
      model: 'gpt-4.1',
      max_tokens: 32768,
      messages: buildMessages(),
      response_format: zodResponseFormat(AIResponseSchema, 'ai_response'),
    })
  } catch (err: unknown) {
    const isLengthError = err instanceof Error && (
      err.constructor.name === 'LengthFinishReasonError' ||
      err.message?.includes('finish_reason') && err.message?.includes('length')
    )
    if (isLengthError) {
      console.warn('[chat/message] Token limit hit — retrying with concise mode')
      try {
        completion = await openai.chat.completions.parse({
          model: 'gpt-4.1',
          max_tokens: 32768,
          messages: buildMessages(true),
          response_format: zodResponseFormat(AIResponseSchema, 'ai_response'),
        })
      } catch {
        return Response.json({ error: 'Itinerary too large to generate — try a shorter trip or fewer days.' }, { status: 500 })
      }
    } else {
      throw err
    }
  }

  const parsed = completion.choices[0].message.parsed

  // Guard: if parse fails entirely, return 500
  if (!parsed) {
    console.error('[chat/message] OpenAI structured output parse returned null')
    return Response.json({ error: 'AI response parse failed' }, { status: 500 })
  }

  // Guard: reject partial itineraries — do not store incomplete day arrays
  if (parsed.itinerary && parsed.trip_state?.duration_days) {
    const actualDays = parsed.itinerary.days.length
    const expectedDays = parsed.trip_state.duration_days
    if (actualDays < expectedDays) {
      console.warn(`[chat/message] Partial itinerary: expected ${expectedDays} days, got ${actualDays} — rejecting`)
      return Response.json({
        content: `I wasn't able to fit all ${expectedDays} days into one response. Please send "try again" and I'll regenerate with shorter descriptions.`,
        conversationPhase: 'ready_for_summary',
        tripState: parsed.trip_state,
      })
    }
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
    const { days, flights, daily_food, ...itineraryFields } = parsed.itinerary

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

    // Build final flights array: prefer user-provided flights over AI suggestions
    const finalFlights = buildFinalFlights(flights ?? [], flightInputData)

    // Persist flights and daily_food into itinerary extra_data
    if (finalFlights.length || daily_food?.length) {
      await supabase
        .from('itineraries')
        .update({
          extra_data: {
            flights: finalFlights,
            daily_food: daily_food ?? [],
          }
        })
        .eq('id', newItinerary.id)
    }

    // Insert activities from all days — enrich with photo + places data in parallel
    // Apply specific hotel override if user provided one
    const activityDestination = itineraryFields.destination ?? itineraryFields.title ?? ''
    const activities = await Promise.all(
      days.flatMap(day =>
        day.activities.map(async (act) => {
          const isHotel = act.activity_type === 'hotel'

          // Apply user's specific hotel if provided
          const hotelOverride = isHotel && hotelSaveData?.mode === 'specific' && hotelSaveData.specific_hotel_name
            ? hotelSaveData
            : null

          const [photoUrl, placesData] = await Promise.all([
            isHotel ? Promise.resolve(null) : fetchActivityImage(act.name, activityDestination),
            isHotel ? Promise.resolve({ rating: null, priceLevel: null }) : fetchPlacesData(act.name, activityDestination),
          ])

          const baseExtraData = isHotel
            ? {
                hotel_name: hotelOverride?.specific_hotel_name ?? act.hotel_name,
                star_rating: hotelOverride?.specific_hotel_stars ?? act.star_rating,
                check_in: act.check_in,
                check_out: act.check_out,
              }
            : {}

          const actName = hotelOverride?.specific_hotel_name ?? act.name
          const actLocation = hotelOverride
            ? [hotelOverride.specific_hotel_area, hotelOverride.specific_hotel_city].filter(Boolean).join(', ')
            : act.location

          return {
            itinerary_id: newItinerary.id,
            day_number: day.day_number,
            name: actName,
            time: act.time,
            description: act.description,
            location: actLocation,
            activity_type: act.activity_type ?? null,
            duration: act.duration ?? null,
            tips: act.tips ?? null,
            extra_data: {
              ...baseExtraData,
              ...(photoUrl ? { photo_url: photoUrl } : {}),
              ...(placesData.rating !== null ? { places_rating: placesData.rating } : {}),
              ...(placesData.priceLevel !== null ? { places_price_level: placesData.priceLevel } : {}),
            },
          }
        })
      )
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

/**
 * Merges user-provided flight data with AI-generated flights.
 * User-provided flights (is_suggested: false) take precedence over AI suggestions.
 */
function buildFinalFlights(aiFlights: Flight[], flightInputData: FlightInputData | null | undefined): Flight[] {
  if (!flightInputData) return aiFlights

  const userFlights: Flight[] = []

  const hasOutbound = flightInputData.outbound_airline || flightInputData.outbound_flight_number
    || flightInputData.outbound_from || flightInputData.outbound_to
  if (hasOutbound) {
    userFlights.push({
      direction: 'outbound',
      airline: flightInputData.outbound_airline || null,
      flight_number: flightInputData.outbound_flight_number || null,
      from_airport: flightInputData.outbound_from || null,
      to_airport: flightInputData.outbound_to || null,
      departure_time: flightInputData.outbound_departure || null,
      arrival_time: flightInputData.outbound_arrival || null,
      is_suggested: false,
    })
  }

  const hasReturn = flightInputData.return_airline || flightInputData.return_flight_number
    || flightInputData.return_from || flightInputData.return_to
  if (hasReturn) {
    userFlights.push({
      direction: 'return',
      airline: flightInputData.return_airline || null,
      flight_number: flightInputData.return_flight_number || null,
      from_airport: flightInputData.return_from || null,
      to_airport: flightInputData.return_to || null,
      departure_time: flightInputData.return_departure || null,
      arrival_time: flightInputData.return_arrival || null,
      is_suggested: false,
    })
  }

  if (userFlights.length === 0) return aiFlights

  // For each direction, prefer user flight over AI flight
  const directions = new Set(userFlights.map(f => f.direction))
  const keptAiFlights = aiFlights.filter(f => !directions.has(f.direction))
  return [...userFlights, ...keptAiFlights]
}
