export interface Activity {
  id: string
  itinerary_id: string
  day_number: number
  name: string
  time: string | null
  description: string | null
  location: string | null
  activity_type: string | null
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
    }>
  }>
}
