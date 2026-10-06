// Shapes the trip plan route reads (itineraries + activities, RLS-scoped).

export type ExtraData = Record<string, unknown> | null

export interface PlanTrip {
  id: string
  user_id: string
  title: string
  description: string | null
  destination: string | null
  /** ISO date (YYYY-MM-DD) or null for undated trips. */
  start_date: string | null
  end_date: string | null
  cover_image_url: string | null
  extra_data: ExtraData
  is_public: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface PlanActivity {
  id: string
  itinerary_id: string
  /** null = Maybe bucket (D-21, D-44). */
  day_number: number | null
  /** Fractional order inside a day; null sorts last. */
  position: number | null
  name: string
  time: string | null
  description: string | null
  location: string | null
  activity_type: string | null
  extra_data: ExtraData
  duration: string | null
  tips: string | null
}

export interface TripPlan {
  trip: PlanTrip
  /** Sorted with sortActivities (day_number, position, id). */
  activities: PlanActivity[]
  /** Number of day columns the board shows (dayCountFor). */
  dayCount: number
}
