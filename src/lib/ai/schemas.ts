import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'

export const TripStateSchema = z.object({
  destination: z.string().nullable(),
  origin: z.string().nullable(),
  dates_start: z.string().nullable(),
  dates_end: z.string().nullable(),
  duration_days: z.number().nullable(),
  travelers_count: z.number().nullable(),
  travelers_type: z.string().nullable(),
  budget: z.string().nullable(),
  interests: z.array(z.string()),
  travel_style: z.string().nullable(),
  pace: z.string().nullable(),
  constraints: z.array(z.string()),
  notes: z.string().nullable(),
})

export const ConversationPhaseSchema = z.enum([
  'gathering_destination',
  'gathering_details',
  'ready_for_summary',
  'generating_itinerary',
  'itinerary_complete',
])
// NOTE: summary_shown is intentionally omitted. The summary IS shown when phase = ready_for_summary.
// On the user's next message, the model transitions directly to itinerary_complete (confirm) or
// stays in ready_for_summary (adjust). No client-driven phase PATCH needed.

export const AIResponseSchema = z.object({
  reply: z.string(),
  trip_state: TripStateSchema,
  conversation_phase: ConversationPhaseSchema,
  itinerary: z.object({
    title: z.string(),
    destination: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    description: z.string(),
    days: z.array(z.object({
      day_number: z.number(),
      activities: z.array(z.object({
        name: z.string(),
        time: z.string(),
        description: z.string(),
        location: z.string(),
      })),
    })),
  }).nullable(),
})

export { zodResponseFormat }
export type AIResponse = z.infer<typeof AIResponseSchema>
export type TripState = z.infer<typeof TripStateSchema>
export type ConversationPhase = z.infer<typeof ConversationPhaseSchema>
