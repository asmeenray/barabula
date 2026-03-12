---
phase: 10-rich-itinerary-ai-response-detailed-daily-plans-with-timings-flights-hotels-restaurants-and-editable-tiles
plan: 02
subsystem: api
tags: [openai, structured-outputs, zod, supabase, prompts, itinerary]

# Dependency graph
requires:
  - phase: 10-01
    provides: Zod schema extensions for flights, daily_food, duration, tips, star_rating on ActivitySchema and ItinerarySchema
provides:
  - AI system prompt enforces clock-time-only activity times, ascending day order, hotel star inference from travel_style/budget
  - AI system prompt generates flights array (outbound + return) per trip
  - AI system prompt generates daily_food array (one dinner recommendation per day)
  - Chat message route persists duration and tips per activity
  - Chat message route persists flights and daily_food into itinerary extra_data
  - max_tokens bumped to 8192 for richer AI responses
affects:
  - phase 10-03 (UI tile components that read flights/daily_food from extra_data and duration/tips from activities)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "extra_data merge: fresh itinerary inserts set extra_data directly (safe); future PATCH routes must read-then-spread (Pitfall 3 pattern)"
    - "Flights/daily_food stored in itinerary extra_data JSONB; duration/tips stored as activity-level columns"

key-files:
  created: []
  modified:
    - src/lib/ai/prompts/trip-planner.ts
    - src/app/api/chat/message/route.ts

key-decisions:
  - "Hotel star_rating inferred from travel_style/budget: luxury→5, mid→4, budget→3, unknown→4 (default)"
  - "Clock-time-only mandate added to system prompt: no morning/afternoon/evening/All day values allowed"
  - "Flights always generated as two-entry array (outbound + return) with is_suggested: true by default"
  - "daily_food extra_data block persisted after cover image fetch, before activities insert — fresh insert so no merge needed"
  - "duration/tips stored as top-level activity columns (not inside extra_data) — matches Zod schema from 10-01"

patterns-established:
  - "Prompt sections appended to TRIP_PLANNER_RULES; existing rules preserved intact"
  - "Destructure new top-level fields (flights, daily_food) alongside days from parsed.itinerary"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 10 Plan 02: Rich Itinerary AI Response — Prompt + Persistence Summary

**System prompt upgraded with clock-time mandate, hotel star inference, flights and daily_food generation; route updated to persist duration/tips per activity and flights/daily_food in itinerary extra_data with max_tokens 8192**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-12T01:22:17Z
- **Completed:** 2026-03-12T01:25:39Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Updated TRIP_PLANNER_RULES with Time Format Rules (STRICT), Flights Rules, Daily Food Rules, and expanded Hotel Accommodation Rules with star inference
- Replaced morning/afternoon/evening wording with clock-time mandate throughout the prompt
- Bumped max_tokens from 4096 to 8192 to accommodate richer structured output
- Added duration and tips fields to the activities insert (maps act.duration/act.tips with null fallback)
- Destructured flights and daily_food from parsed.itinerary; persists them to itinerary extra_data after cover image fetch

## Task Commits

Each task was committed atomically:

1. **Task 1: Update AI system prompt with Phase 10 rules** - `9c15323` (feat)
2. **Task 2: Update chat message route — persist duration/tips/flights/daily_food** - `4d342ac` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/ai/prompts/trip-planner.ts` - Added Time Format Rules, Flights Rules, Daily Food Rules; expanded Hotel Accommodation Rules with star inference; replaced morning/afternoon/evening with clock-time mandate
- `src/app/api/chat/message/route.ts` - max_tokens 8192; destructures flights/daily_food; persists to extra_data; adds duration/tips to activities insert

## Decisions Made
- Hotel star inference: luxury/high-end → 5-star, mid/moderate → 4-star, budget/backpacker → 3-star, unknown → 4-star default
- Flights always generated as AI suggestions (is_suggested: true); app can override to false if user explicitly provided flight details
- fresh-insert pattern for extra_data: no merge needed on first write; comment added explaining future PATCH routes must read-then-spread
- duration/tips stored as direct activity columns, not inside hotel extra_data — matches 10-01 Zod schema structure

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failures (13 failing tests across bottom-tab-bar, chat-page, hotel-card, itinerary-detail, split-layout test files) were present before this plan and are not caused by these changes. All 6 chat API tests pass. TypeScript compiles clean.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- AI now emits flights and daily_food in structured output; route persists both to DB
- Phase 10-03 can read flights from itinerary extra_data and daily_food from extra_data to render FlightCard and FoodCard tiles
- Activities table now carries duration and tips for display in itinerary tiles

---
*Phase: 10-rich-itinerary-ai-response-detailed-daily-plans-with-timings-flights-hotels-restaurants-and-editable-tiles*
*Completed: 2026-03-12*
