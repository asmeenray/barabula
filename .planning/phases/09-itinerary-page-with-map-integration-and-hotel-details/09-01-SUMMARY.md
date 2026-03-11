---
phase: 09-itinerary-page-with-map-integration-and-hotel-details
plan: "01"
subsystem: api
tags: [openai, zod, structured-outputs, supabase, activities, hotel]

# Dependency graph
requires:
  - phase: 08-ai-chat-functionality-with-openai-behavior-trip-state-itinerary-generation
    provides: AIResponseSchema, message route, activity insert pipeline
provides:
  - AIResponseSchema activity object with hotel fields (activity_type, hotel_name, star_rating, check_in, check_out)
  - Activity interface with extra_data field
  - Hotel persistence in activities table via extra_data JSONB
  - AI prompt instructions for hotel accommodation per day
affects:
  - 09-02 (itinerary page hotel card display reads from extra_data)
  - Any future plans reading activities with activity_type

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "activity_type='hotel' sentinel for hotel rows in activities table"
    - "extra_data JSONB stores hotel metadata (hotel_name, star_rating, check_in, check_out)"
    - "Zod .nullable() for all optional structured-output fields — OpenAI Structured Outputs requirement"

key-files:
  created: []
  modified:
    - src/lib/ai/schemas.ts
    - src/lib/types.ts
    - src/lib/ai/prompts/trip-planner.ts
    - src/app/api/chat/message/route.ts

key-decisions:
  - "Hotel fields use .nullable() (not .optional()) in Zod schema — OpenAI Structured Outputs requires all fields in required array"
  - "Hotel metadata stored in extra_data JSONB rather than dedicated columns — no DB migration required"
  - "GeneratedItinerary hotel fields are optional (not mandatory) for backward compatibility with FullItineraryPanel"

patterns-established:
  - "activity_type enum: 'activity' | 'hotel' — extend to 'transport', 'meal' etc in future"
  - "Non-hotel activities get empty {} for extra_data; hotel activities get structured object"

requirements-completed: [HOTEL-01]

# Metrics
duration: 2min
completed: 2026-03-11
---

# Phase 09 Plan 01: Hotel Data in AI Schema and Persistence Summary

**OpenAI Structured Outputs extended with hotel accommodation fields; hotel activities persisted to Supabase activities table using activity_type='hotel' and extra_data JSONB — no DB migration required.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-11T20:29:41Z
- **Completed:** 2026-03-11T20:31:57Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extended `AIResponseSchema` activity object with nullable hotel fields (`activity_type`, `hotel_name`, `star_rating`, `check_in`, `check_out`) compatible with OpenAI Structured Outputs
- Added `extra_data: Record<string, unknown> | null` to `Activity` interface and optional hotel fields to `GeneratedItinerary` (backward compatible)
- Updated trip-planner system prompt to instruct AI to include exactly one hotel activity per day with structured hotel metadata
- Updated message route to persist `activity_type` and hotel metadata into `extra_data` JSONB on activities insert

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend AIResponseSchema with hotel fields and update types** - `b3c7ddc` (feat)
2. **Task 2: Update AI prompt and message route to generate and persist hotel data** - `c6c01c0` (feat)

**Plan metadata:** (to be added in final commit)

## Files Created/Modified
- `src/lib/ai/schemas.ts` - Added activity_type, hotel_name, star_rating, check_in, check_out to AIResponseSchema activity object (all .nullable())
- `src/lib/types.ts` - Added extra_data field to Activity interface; added optional hotel fields to GeneratedItinerary activities
- `src/lib/ai/prompts/trip-planner.ts` - Added Hotel Accommodation Rules section instructing AI to include one hotel per day
- `src/app/api/chat/message/route.ts` - Updated activities flatMap to persist activity_type and hotel extra_data on insert

## Decisions Made
- Used `.nullable()` (not `.optional()`) for all hotel fields in Zod schema — OpenAI Structured Outputs requires every field present in the `required` array; `.nullable()` maps to `anyOf: [null, ...]` which is valid
- Stored hotel metadata in existing `extra_data` JSONB column rather than adding new columns — avoids DB migration and keeps the table schema extensible for future activity types
- Made `GeneratedItinerary` hotel fields optional (not mandatory) to preserve backward compatibility with `FullItineraryPanel` which renders existing itineraries

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failures (unrelated to this plan):
- `split-layout.test.tsx > has grid-cols-2` — SplitLayout uses flex, test expects grid (pre-existing)
- `chat-page.test.tsx > calls router.push` — timeout issue (pre-existing)
- `itinerary-map.test.tsx` and `day-pill-nav.test.tsx` — missing components from future plans (pre-existing)

All tests directly related to this plan's changes pass: `api/chat.test.ts` (6/6), `itinerary-detail.test.tsx` (3/3), `activity-row.test.tsx` (5/5).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Hotel data will be generated and persisted for any new itinerary created after this change
- Old itineraries (activity_type=null) continue to render without regression
- Plan 09-02 can now read `activity_type='hotel'` rows from activities table to display hotel cards on the itinerary page

## Self-Check: PASSED

- FOUND: src/lib/ai/schemas.ts
- FOUND: src/lib/types.ts
- FOUND: src/lib/ai/prompts/trip-planner.ts
- FOUND: src/app/api/chat/message/route.ts
- FOUND: .planning/phases/09-itinerary-page-with-map-integration-and-hotel-details/09-01-SUMMARY.md
- FOUND commit b3c7ddc (Task 1)
- FOUND commit c6c01c0 (Task 2)

---
*Phase: 09-itinerary-page-with-map-integration-and-hotel-details*
*Completed: 2026-03-11*
