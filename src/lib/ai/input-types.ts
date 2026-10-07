// Inputs the trip-planner engine accepts from the client (flight and hotel
// details the user typed). Moved out of the old chat UI panels (D-39) so the
// engine (src/lib/ai, src/app/api/chat) does not depend on any UI file.

export interface FlightInputData {
  origin_city: string
  outbound_airline: string
  outbound_flight_number: string
  outbound_from: string
  outbound_to: string
  outbound_departure: string
  outbound_arrival: string
  return_airline: string
  return_flight_number: string
  return_from: string
  return_to: string
  return_departure: string
  return_arrival: string
}

export interface HotelSaveData {
  mode: 'specific' | 'preference'
  preference: string | null
  specific_hotel_name: string | null
  specific_hotel_area: string | null
  specific_hotel_city: string | null
  specific_hotel_stars: number | null
  _found_hotel_card?: {
    full_name: string
    area: string
    city: string
    star_rating: number
  } | null
}
