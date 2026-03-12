import { describe, it, expect } from 'vitest'
import { AIResponseSchema, FlightSchema, DailyFoodSchema } from '@/lib/ai/schemas'

// Minimal valid base for AIResponseSchema
const baseResponse = {
  reply: 'Here is your itinerary',
  trip_state: {
    destination: 'Paris',
    origin: 'London',
    dates_start: '2026-06-01',
    dates_end: '2026-06-07',
    duration_days: 6,
    travelers_count: 2,
    travelers_type: 'couple',
    budget: 'mid-range',
    interests: ['art', 'food'],
    travel_style: 'relaxed',
    pace: 'moderate',
    constraints: [],
    notes: null,
  },
  conversation_phase: 'itinerary_complete',
  itinerary: null,
}

const baseItinerary = {
  title: 'Paris Adventure',
  destination: 'Paris, France',
  start_date: '2026-06-01',
  end_date: '2026-06-07',
  description: 'A wonderful trip to Paris',
  days: [],
  flights: [],
  daily_food: [],
}

describe('AIResponseSchema — flights and daily_food at itinerary level', () => {
  it('accepts a valid itinerary with flights array at top level', () => {
    const result = AIResponseSchema.safeParse({
      ...baseResponse,
      itinerary: {
        ...baseItinerary,
        flights: [
          {
            direction: 'outbound',
            airline: 'Air France',
            flight_number: 'AF123',
            from_airport: 'LHR',
            to_airport: 'CDG',
            departure_time: '08:00',
            arrival_time: '10:30',
            is_suggested: true,
          },
        ],
        daily_food: [],
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts a valid itinerary with daily_food array at top level', () => {
    const result = AIResponseSchema.safeParse({
      ...baseResponse,
      itinerary: {
        ...baseItinerary,
        flights: [],
        daily_food: [
          {
            day_number: 1,
            dinner_restaurant: 'Le Jules Verne',
            dinner_area: 'Eiffel Tower',
            dinner_cuisine: 'French',
            local_tip: 'Book 3 months ahead',
          },
        ],
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('AIResponseSchema — activity duration and tips', () => {
  const itineraryWithActivity = (activityOverride: object) => ({
    ...baseResponse,
    itinerary: {
      ...baseItinerary,
      days: [
        {
          day_number: 1,
          activities: [
            {
              name: 'Visit Eiffel Tower',
              time: '10:00',
              description: 'Iconic landmark',
              location: 'Eiffel Tower, Paris',
              activity_type: 'activity',
              hotel_name: null,
              star_rating: null,
              check_in: null,
              check_out: null,
              ...activityOverride,
            },
          ],
        },
      ],
    },
  })

  it('accepts activity with duration and tips as strings', () => {
    const result = AIResponseSchema.safeParse(
      itineraryWithActivity({ duration: '2 hours', tips: 'Book ahead' })
    )
    expect(result.success).toBe(true)
  })

  it('accepts activity with duration and tips as null (nullable required)', () => {
    const result = AIResponseSchema.safeParse(
      itineraryWithActivity({ duration: null, tips: null })
    )
    expect(result.success).toBe(true)
  })

  it('rejects activity missing duration field entirely', () => {
    const result = AIResponseSchema.safeParse(
      itineraryWithActivity({})
    )
    // duration and tips must be present (nullable, not optional)
    expect(result.success).toBe(false)
  })
})

describe('FlightSchema', () => {
  it('accepts a valid flight object', () => {
    const result = FlightSchema.safeParse({
      direction: 'outbound',
      airline: 'Air France',
      flight_number: 'AF123',
      from_airport: 'LHR',
      to_airport: 'CDG',
      departure_time: '08:00',
      arrival_time: '10:30',
      is_suggested: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a flight missing is_suggested field', () => {
    const result = FlightSchema.safeParse({
      direction: 'outbound',
      airline: 'Air France',
      flight_number: 'AF123',
      from_airport: 'LHR',
      to_airport: 'CDG',
      departure_time: '08:00',
      arrival_time: '10:30',
      // is_suggested deliberately omitted
    })
    expect(result.success).toBe(false)
  })

  it('accepts flight with all nullable fields as null', () => {
    const result = FlightSchema.safeParse({
      direction: 'return',
      airline: null,
      flight_number: null,
      from_airport: null,
      to_airport: null,
      departure_time: null,
      arrival_time: null,
      is_suggested: false,
    })
    expect(result.success).toBe(true)
  })
})

describe('DailyFoodSchema', () => {
  it('accepts day_number with all nullable fields as null', () => {
    const result = DailyFoodSchema.safeParse({
      day_number: 1,
      dinner_restaurant: null,
      dinner_area: null,
      dinner_cuisine: null,
      local_tip: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts a full daily food entry', () => {
    const result = DailyFoodSchema.safeParse({
      day_number: 2,
      dinner_restaurant: 'Septime',
      dinner_area: 'Bastille',
      dinner_cuisine: 'French Modern',
      local_tip: 'Reservations essential',
    })
    expect(result.success).toBe(true)
  })
})
