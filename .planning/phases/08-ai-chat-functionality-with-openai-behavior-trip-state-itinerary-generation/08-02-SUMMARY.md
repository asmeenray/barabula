---
phase: 08-ai-chat-functionality-with-openai-behavior-trip-state-itinerary-generation
plan: "02"
subsystem: api
tags: [openai, structured-outputs, trip-state, supabase, zod, typescript]

# Dependency graph
requires:
  - phase: 08-01
    provides: AIResponseSchema, zodResponseFormat, buildSystemPrompt, TripState types, trip_sessions table
provides:
  - Stateful AI chat endpoint using openai.chat.completions.parse() with structured outputs
  - DELETE /api/chat/session for trip session reset
  - Per-turn trip_sessions upsert persisting conversation state
  - itinerary_complete guard preventing premature phase flip when itinerary is null
affects:
  - 08-03: Context panel reads tripState and conversationPhase from API response
  - 08-04: Chat UI calls DELETE /api/chat/session for new trip flow

# Tech tracking
tech-stack:
  added: []
  patterns:
    - openai.chat.completions.parse() with zodResponseFormat() for structured outputs (SDK 6.x path, not beta.chat)
    - trip_sessions upsert with onConflict: user_id on every turn
    - Server guard overrides itinerary_complete -> ready_for_summary when itinerary is null
    - Supabase maybeSingle() for nullable single-row reads (trip_sessions)

key-files:
  created:
    - src/app/api/chat/session/route.ts
  modified:
    - src/app/api/chat/message/route.ts
    - src/__tests__/api/chat.test.ts

key-decisions:
  - "openai.chat.completions.parse() used (not beta.chat.completions.parse) — SDK 6.x promoted parse() from beta to main chat.completions namespace"
  - "Server guard: itinerary_complete overridden to ready_for_summary when itinerary is null — prevents premature phase flip if model returns phase without data"
  - "trip_sessions upserted with onConflict: user_id on every turn — one row per user, always up-to-date"
  - "DELETE /api/chat/session clears trip_sessions row — chat page calls this to start a new trip planning session"

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 08 Plan 02: Stateful AI Chat Endpoint with Structured Outputs Summary

**Stateful chat API using openai.chat.completions.parse() with Zod structured outputs, trip_sessions persistence, and session reset endpoint**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-11T17:42:04Z
- **Completed:** 2026-03-11T17:46:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Replaced stateless `POST /api/chat/message` with a fully stateful route that loads trip state from `trip_sessions`, calls `openai.chat.completions.parse()` with `zodResponseFormat(AIResponseSchema)`, and returns `conversationPhase` and `tripState` in every response
- Added server guard: overrides `itinerary_complete` to `ready_for_summary` when model returns the phase without itinerary data
- When `safePhase === 'itinerary_complete'` and itinerary data is present, persists itinerary + activities and returns `itineraryId` in response
- Created `DELETE /api/chat/session` endpoint that clears the `trip_sessions` row for session reset
- Updated test mock from `chat.completions.create` to `chat.completions.parse` with typed `parsed` response; added 3 new test cases covering conversationPhase, tripState, itineraryId, and the itinerary_complete guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace message route with stateful structured output route** - `ce3c1e0` (feat)
2. **Task 2: Add DELETE /api/chat/session route** - `46005a9` (feat)
3. **Auto-fix: use chat.completions.parse not beta.chat.completions.parse** - `52ac478` (fix)

## Files Created/Modified

- `src/app/api/chat/message/route.ts` - Fully stateful route: loads trip_sessions, calls chat.completions.parse, upserts state, returns conversationPhase + tripState on every turn; returns itineraryId when itinerary complete
- `src/app/api/chat/session/route.ts` - DELETE handler that clears trip_sessions row for authenticated user
- `src/__tests__/api/chat.test.ts` - Updated OpenAI mock to chat.completions.parse; per-table mockFrom; 6 tests total (3 new cases)

## Decisions Made

- `openai.chat.completions.parse()` used instead of `beta.chat.completions.parse()` — OpenAI SDK 6.x promoted this method from the beta namespace to the main chat.completions namespace
- Server guard added for itinerary_complete phase — if model returns this phase but itinerary is null/undefined, server logs a warning and overrides to `ready_for_summary` to prevent the chat UI from expecting an itinerary that doesn't exist
- `trip_sessions.upsert({ onConflict: 'user_id' })` on every turn — ensures one session row per user, always reflecting latest state
- `maybeSingle()` used for trip_sessions read — returns null data (not error) when no session row exists yet

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] OpenAI SDK parse() is on chat.completions, not beta.chat.completions**
- **Found during:** TypeScript verification (npx tsc --noEmit) after implementing Task 1
- **Issue:** Plan specified `openai.beta.chat.completions.parse()` but OpenAI SDK 6.x promoted `parse()` to `openai.chat.completions.parse()`. TypeScript error: `Property 'chat' does not exist on type 'Beta'`
- **Fix:** Changed route to use `openai.chat.completions.parse()` and updated test mock accordingly
- **Files modified:** `src/app/api/chat/message/route.ts`, `src/__tests__/api/chat.test.ts`
- **Commit:** `52ac478`

## Issues Encountered

None beyond the auto-fixed SDK path bug.

## Next Phase Readiness

- Chat API now returns `conversationPhase` and `tripState` on every response — context panel (08-03) can read this directly
- `DELETE /api/chat/session` ready for chat UI new-trip button (08-04)
- All structured output contracts from 08-01 are wired up end-to-end

## Self-Check: PASSED

All created/modified files verified on disk. All task commits verified in git log (ce3c1e0, 46005a9, 52ac478).

---
*Phase: 08-ai-chat-functionality-with-openai-behavior-trip-state-itinerary-generation*
*Completed: 2026-03-11*
