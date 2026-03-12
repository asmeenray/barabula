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

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Lazy-initialize after auth so key is not required for unauthenticated calls
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const body = await req.json()
  const { content, flightInputData, hotelSaveData } = body as {
    content: string
    flightInputData?: FlightInputData | null
    hotelSaveData?: HotelSaveData | null
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

  // Fetch last 20 messages for conversation context
  const { data: history } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(20)

  const systemPrompt = buildSystemPrompt(currentTripState, currentPhase, flightInputData, hotelSaveData)

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4o',
    max_tokens: 16000,
    messages: [
      { role: 'system', content: systemPrompt },
      ...(history ?? []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content },
    ],
    response_format: zodResponseFormat(AIResponseSchema, 'ai_response'),
  })

  const choice = completion.choices[0]

  // Warn if output was truncated — the structured days array may be incomplete
  if (choice.finish_reason === 'length') {
    console.warn('[chat/message] finish_reason=length — output was truncated, itinerary days may be incomplete')
  }

  const parsed = choice.message.parsed

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

  // Preserve client-managed keys stored in trip_state (flight/hotel data saved from the chat UI)
  // These keys are prefixed with _ so the AI schema never generates them
  const existingTripState = sessionRow?.trip_state as Record<string, unknown> | undefined
  const clientKeys: Record<string, unknown> = {}
  if (existingTripState?._client_flight_data !== undefined) clientKeys._client_flight_data = existingTripState._client_flight_data
  if (existingTripState?._client_hotel_data !== undefined) clientKeys._client_hotel_data = existingTripState._client_hotel_data
  // Also persist the latest flight/hotel data from this request (if user just saved them)
  if (flightInputData) clientKeys._client_flight_data = flightInputData
  if (hotelSaveData) clientKeys._client_hotel_data = hotelSaveData

  // Upsert trip session with latest state
  await supabase.from('trip_sessions').upsert(
    {
      user_id: user.id,
      trip_state: { ...parsed.trip_state, ...clientKeys },
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
