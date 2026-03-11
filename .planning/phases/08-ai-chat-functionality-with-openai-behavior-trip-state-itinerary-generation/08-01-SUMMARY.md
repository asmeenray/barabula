---
phase: 08-ai-chat-functionality-with-openai-behavior-trip-state-itinerary-generation
plan: "01"
subsystem: api
tags: [zod, openai, structured-outputs, typescript, postgres, supabase]

# Dependency graph
requires:
  - phase: 07-ui-overhaul-landing-page-and-chatbot-redesign
    provides: Chat UI components that will consume TripState and AIResponse types
provides:
  - Zod schemas for OpenAI structured output (AIResponseSchema, TripStateSchema, ConversationPhaseSchema)
  - buildSystemPrompt() function for injecting trip state into the AI system prompt
  - TripState, ConversationPhase, AIResponse types re-exported from src/lib/types.ts
  - ChipConfig type for landing page quick-chip messages
  - trip_sessions table SQL with UNIQUE(user_id) constraint and RLS policy
affects:
  - 08-02: API route for chat uses AIResponseSchema and buildSystemPrompt
  - 08-03: Context panel reads TripState shape
  - 08-04: Itinerary generation uses AIResponse.itinerary structure

# Tech tracking
tech-stack:
  added: [zod@^4.3.6]
  patterns:
    - Zod .nullable() (not .optional()) for all optional fields — required by OpenAI Structured Outputs
    - Prompt text stored in src/lib/ai/prompts/ as separate versioned files, builder in system-prompt.ts
    - zodResponseFormat re-exported from schemas.ts as convenience for API route consumers

key-files:
  created:
    - src/lib/ai/schemas.ts
    - src/lib/ai/system-prompt.ts
    - src/lib/ai/prompts/trip-planner.ts
  modified:
    - src/lib/types.ts
    - supabase/schema.sql
    - package.json
    - package-lock.json

key-decisions:
  - "Zod .nullable() used for all optional fields — OpenAI Structured Outputs requires all fields in required; .optional() maps to additionalProperties (disallowed), .nullable() maps to anyOf: [null, ...] (valid)"
  - "AI prompts stored in src/lib/ai/prompts/ as separate files per user requirement — trip-planner.ts holds raw prompt text; system-prompt.ts is the builder"
  - "summary_shown phase omitted — summary IS shown when phase = ready_for_summary; next user message transitions directly to itinerary_complete or stays in ready_for_summary"
  - "trip_sessions UNIQUE(user_id) constraint required — API route uses upsert with onConflict: user_id to maintain exactly one row per user"

patterns-established:
  - "Prompt-as-code: raw prompt text in src/lib/ai/prompts/*.ts, builder function in src/lib/ai/system-prompt.ts"
  - "Zod-first types: infer TypeScript types from Zod schemas rather than defining separately"

requirements-completed: [AI-CHAT-01, AI-CHAT-02, AI-CHAT-03]

# Metrics
duration: 2min
completed: 2026-03-11
---

# Phase 08 Plan 01: AI Foundation — Schemas, System Prompt, and Database Summary

**Zod schemas for OpenAI structured outputs with state-injected system prompt builder and trip_sessions Supabase table**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-11T17:37:38Z
- **Completed:** 2026-03-11T17:39:47Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Installed zod@^4.3.6; defined TripStateSchema, ConversationPhaseSchema, and AIResponseSchema with zodResponseFormat for OpenAI structured outputs
- Created buildSystemPrompt() that injects live trip state JSON and current phase into a named prompt file in src/lib/ai/prompts/
- Extended src/lib/types.ts with re-exported AI types and ChipConfig; appended trip_sessions table with RLS policy to supabase/schema.sql

## Task Commits

Each task was committed atomically:

1. **Task 1: Install zod and create AI schema/prompt modules** - `d475410` (feat)
2. **Task 2: Add types to types.ts and trip_sessions to schema.sql** - `20c5c52` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `src/lib/ai/schemas.ts` - Zod schemas: TripStateSchema, ConversationPhaseSchema, AIResponseSchema; re-exports zodResponseFormat and inferred types
- `src/lib/ai/system-prompt.ts` - buildSystemPrompt(tripState, phase) builder; delegates to prompts/trip-planner.ts
- `src/lib/ai/prompts/trip-planner.ts` - Raw prompt text: persona, conversation rules, and template function; stored separately for easy iteration
- `src/lib/types.ts` - Appended re-exports of TripState, ConversationPhase, AIResponse and new ChipConfig interface
- `supabase/schema.sql` - Appended trip_sessions table definition with UNIQUE(user_id) and RLS policy
- `package.json` - Added zod dependency
- `package-lock.json` - Lock file updated

## Decisions Made
- Used `.nullable()` not `.optional()` for all optional Zod fields — OpenAI Structured Outputs disallows `additionalProperties`; `.nullable()` generates `anyOf: [null, ...]` which is valid
- Prompt text placed in `src/lib/ai/prompts/trip-planner.ts` per user requirement (prompts must be in `src/lib/ai/prompts/` as separate named files)
- `summary_shown` phase omitted from ConversationPhaseSchema — the summary is visible when `phase = ready_for_summary`; no extra phase needed
- `UNIQUE(user_id)` on trip_sessions enables upsert in the API route — one session row per user

## Deviations from Plan

None - plan executed exactly as written. The only addition beyond the plan spec was splitting the prompt content into a dedicated `src/lib/ai/prompts/trip-planner.ts` file as explicitly required by the user.

## Issues Encountered
None

## User Setup Required
**Run the following SQL in Supabase Dashboard -> SQL Editor after this plan completes:**

```sql
CREATE TABLE public.trip_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trip_state         JSONB DEFAULT '{}',
  conversation_phase TEXT DEFAULT 'gathering_destination',
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE public.trip_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trip session"
  ON public.trip_sessions FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
```

## Next Phase Readiness
- All AI contracts are in place — schemas, types, system prompt, and DB table definition
- 08-02 (API route) can import AIResponseSchema, zodResponseFormat, and buildSystemPrompt directly
- 08-03 (Context panel) can import TripState from src/lib/types.ts
- trip_sessions SQL must be run in Supabase Dashboard before the API route can persist state

## Self-Check: PASSED

All created files verified on disk. All task commits verified in git log.

---
*Phase: 08-ai-chat-functionality-with-openai-behavior-trip-state-itinerary-generation*
*Completed: 2026-03-11*
