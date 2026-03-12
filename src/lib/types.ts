export interface Activity {
  id: string
  itinerary_id: string
  day_number: number
  name: string
  time: string | null
  description: string | null
  location: string | null
  activity_type: string | null
  extra_data: Record<string, unknown> | null
  duration: string | null
  tips: string | null
}

export interface Flight {
  direction: 'outbound' | 'return'
  airline: string | null
  flight_number: string | null
  from_airport: string | null
  to_airport: string | null
  departure_time: string | null
  arrival_time: string | null
  is_suggested: boolean
}

export interface DailyFood {
  day_number: number
  dinner_restaurant: string | null
  dinner_area: string | null
  dinner_cuisine: string | null
  local_tip: string | null
}

export interface Itinerary {
  id: string
  user_id: string
  title: string
  description: string | null
  destination: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface GeneratedItinerary {
  title: string
  destination: string
  start_date: string
  end_date: string
  description: string
  days: Array<{
    day_number: number
    activities: Array<{
      name: string
      time: string
      description: string
      location: string
      activity_type?: 'activity' | 'hotel' | null
      hotel_name?: string | null
      star_rating?: number | null
      check_in?: string | null
      check_out?: string | null
      duration?: string | null
      tips?: string | null
    }>
  }>
  flights?: Flight[]
  daily_food?: DailyFood[]
}

export type { TripState, ConversationPhase, AIResponse } from './ai/schemas'
// Flight and DailyFood defined above; also re-exported from schemas for schema consumers

export interface ChipConfig {
  label: string
  message: string
}
