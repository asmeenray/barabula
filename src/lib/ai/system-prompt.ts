import type { TripState, ConversationPhase } from './schemas'
import { buildTripPlannerPrompt } from './prompts/trip-planner'
import type { FlightInputData } from '@/components/chat/FlightsTabPanel'
import type { HotelSaveData } from '@/components/chat/HotelsTabPanel'

function buildUserProvidedContext(
  flightInputData: FlightInputData | null | undefined,
  hotelSaveData: HotelSaveData | null | undefined,
): string {
  const sections: string[] = []

  if (flightInputData) {
    const hasOutbound = flightInputData.outbound_airline || flightInputData.outbound_flight_number || flightInputData.outbound_from
    const hasReturn = flightInputData.return_airline || flightInputData.return_flight_number || flightInputData.return_from
    if (hasOutbound || hasReturn) {
      const lines = ['## User-Provided Flight Details', 'The user has already entered their actual flight details. Use these exactly in the itinerary flights array and set is_suggested: false for each. CRITICAL: These are user-confirmed values — use them verbatim, do NOT substitute your own suggestions.']
      if (hasOutbound) {
        const parts = [
          flightInputData.outbound_airline && `Airline: ${flightInputData.outbound_airline}`,
          flightInputData.outbound_flight_number && `Flight: ${flightInputData.outbound_flight_number}`,
          flightInputData.outbound_from && `From: ${flightInputData.outbound_from}`,
          flightInputData.outbound_to && `To: ${flightInputData.outbound_to}`,
          flightInputData.outbound_departure && `Departs: ${flightInputData.outbound_departure}`,
          flightInputData.outbound_arrival && `Arrives: ${flightInputData.outbound_arrival}`,
        ].filter(Boolean)
        lines.push(`Outbound — ${parts.join(', ')}`)
      }
      if (hasReturn) {
        const parts = [
          flightInputData.return_airline && `Airline: ${flightInputData.return_airline}`,
          flightInputData.return_flight_number && `Flight: ${flightInputData.return_flight_number}`,
          flightInputData.return_from && `From: ${flightInputData.return_from}`,
          flightInputData.return_to && `To: ${flightInputData.return_to}`,
          flightInputData.return_departure && `Departs: ${flightInputData.return_departure}`,
          flightInputData.return_arrival && `Arrives: ${flightInputData.return_arrival}`,
        ].filter(Boolean)
        lines.push(`Return — ${parts.join(', ')}`)
      }
      sections.push(lines.join('\n'))
    }
  }

  if (hotelSaveData?.mode === 'specific' && hotelSaveData.specific_hotel_name) {
    const parts = [
      hotelSaveData.specific_hotel_name,
      hotelSaveData.specific_hotel_area && `in ${hotelSaveData.specific_hotel_area}`,
      hotelSaveData.specific_hotel_city && `, ${hotelSaveData.specific_hotel_city}`,
      hotelSaveData.specific_hotel_stars && `(${hotelSaveData.specific_hotel_stars}-star)`,
    ].filter(Boolean).join(' ')
    sections.push(`## User-Specified Hotel\nThe user has chosen their hotel: ${parts}. Use this hotel for ALL hotel activities in the itinerary (same hotel for all days unless check-out/in times differ). CRITICAL: These are user-confirmed values — use them verbatim, do NOT substitute your own suggestions.`)
  } else if (hotelSaveData?.mode === 'preference' && hotelSaveData.preference) {
    sections.push(`## User Hotel Preference\nThe user prefers: "${hotelSaveData.preference}". Try to reflect this in your hotel suggestions.`)
  }

  return sections.length > 0 ? '\n\n' + sections.join('\n\n') : ''
}

/**
 * buildSystemPrompt
 *
 * Builds the OpenAI system prompt by injecting current trip state,
 * conversation phase, and any user-provided flight/hotel details.
 */
export function buildSystemPrompt(
  tripState: Partial<TripState>,
  phase: ConversationPhase | string,
  flightInputData?: FlightInputData | null,
  hotelSaveData?: HotelSaveData | null,
): string {
  const currentDate = new Date().toISOString().split('T')[0]
  const base = buildTripPlannerPrompt(JSON.stringify(tripState, null, 2), phase)
  const userContext = buildUserProvidedContext(flightInputData, hotelSaveData)
  return `Today's date: ${currentDate}\n\n` + base + userContext
}
