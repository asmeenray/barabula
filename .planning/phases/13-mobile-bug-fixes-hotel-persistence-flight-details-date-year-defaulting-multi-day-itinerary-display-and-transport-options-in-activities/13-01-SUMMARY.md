---
phase: 13-mobile-bug-fixes-hotel-persistence-flight-details-date-year-defaulting-multi-day-itinerary-display-and-transport-options-in-activities
plan: "01"
subsystem: ai-prompt-and-schema
tags: [ai, prompt, schema, bug-fix, transport]
dependency_graph:
  requires: []
  provides:
    - transport_mode field in TripStateSchema (consumed by Plan 04)
    - currentDate injection in buildSystemPrompt
    - strengthened AI prompt rules for date year, multi-day, flight times, transport bridges
    - server-side days count validation
  affects:
    - src/lib/ai/schemas.ts
    - src/lib/ai/system-prompt.ts
    - src/lib/ai/prompts/trip-planner.ts
    - src/app/api/chat/message/route.ts
tech_stack:
  added: []
  patterns:
    - z.string().nullable() pattern for OpenAI Structured Outputs (existing project convention)
    - currentDate computed internally in buildSystemPrompt — no signature change
key_files:
  created: []
  modified:
    - src/lib/ai/schemas.ts
    - src/lib/ai/system-prompt.ts
    - src/lib/ai/prompts/trip-planner.ts
    - src/app/api/chat/message/route.ts
    - src/__tests__/api/schemas.test.ts
decisions:
  - transport_mode uses .nullable() not .optional() — consistent with OpenAI Structured Outputs project pattern requiring all fields in required[]
  - currentDate injected at buildSystemPrompt() level not in prompt template — keeps system-prompt.ts as the single injection point, no signature changes needed
  - days count validation is server log only — no client-facing partialItinerary flag per CONTEXT.md decision
metrics:
  duration: "6 minutes"
  completed_date: "2026-03-12"
  tasks_completed: 3
  files_modified: 5
---

# Phase 13 Plan 01: AI Prompt and Schema Fixes Summary

**One-liner:** Strengthened AI prompt with date year inference, multi-day CRITICAL rule, non-null flight times, and expanded transport bridges; added transport_mode to TripStateSchema and server-side partial-itinerary diagnostics.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add transport_mode to TripStateSchema, inject currentDate in buildSystemPrompt | 8a2c147 | schemas.ts, system-prompt.ts, schemas.test.ts |
| 2 | Strengthen AI prompt rules — date year, multi-day, flight times, transport bridges | 88f91e0 | prompts/trip-planner.ts |
| 3 | Add server-side days count validation in chat message route | a93ac63 | api/chat/message/route.ts |

## Verification

- `TripStateSchema.shape` includes `transport_mode`: confirmed via `npx tsx` check
- `buildSystemPrompt()` output starts with `Today's date: YYYY-MM-DD`: confirmed in system-prompt.ts line 70-73
- `TRIP_PLANNER_RULES` contains all 5 new rules: confirmed via grep
- `route.ts` contains `console.warn` for partial itinerary: confirmed
- `npx vitest run`: 156/157 tests pass (1 pre-existing failure in hotel-card.test.tsx unrelated to this plan)
- `npx tsc --noEmit`: exits 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated schemas.test.ts to include transport_mode in baseResponse**
- **Found during:** Task 1 verification
- **Issue:** Adding `transport_mode: z.string().nullable()` to TripStateSchema caused 4 existing schema tests to fail because the `baseResponse.trip_state` fixture lacked the new required (nullable) field
- **Fix:** Added `transport_mode: null` to `baseResponse.trip_state` in `src/__tests__/api/schemas.test.ts`
- **Files modified:** `src/__tests__/api/schemas.test.ts`
- **Commit:** 8a2c147 (included in Task 1 commit)

## Self-Check: PASSED

All 4 key files confirmed present on disk. All 3 task commits confirmed in git history (8a2c147, 88f91e0, a93ac63).
