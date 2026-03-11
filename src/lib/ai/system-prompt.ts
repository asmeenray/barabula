import type { TripState, ConversationPhase } from './schemas'
import { buildTripPlannerPrompt } from './prompts/trip-planner'

/**
 * buildSystemPrompt
 *
 * Builds the OpenAI system prompt by injecting current trip state and
 * conversation phase into the trip planner prompt template.
 *
 * The raw prompt text lives in src/lib/ai/prompts/trip-planner.ts so it
 * can be edited, versioned, and reviewed independently of this builder.
 */
export function buildSystemPrompt(
  tripState: Partial<TripState>,
  phase: ConversationPhase | string,
): string {
  return buildTripPlannerPrompt(JSON.stringify(tripState, null, 2), phase)
}
