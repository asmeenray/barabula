---
phase: 08-ai-chat-functionality-with-openai-behavior-trip-state-itinerary-generation
plan: 09
subsystem: ai
tags: [openai, prompt-engineering, trip-planner, system-prompt]

# Dependency graph
requires:
  - phase: 08-ai-chat-functionality-with-openai-behavior-trip-state-itinerary-generation
    provides: trip-planner prompt file with TRIP_PLANNER_RULES and buildTripPlannerPrompt
provides:
  - Expert-quality activity descriptions with transport bridges, duration, facts, and 4+ activities/day
  - Strict food/activity separation enforced in AI prompt
  - Removed hard-coded date/city examples from intake questions
affects:
  - All itinerary generations going forward via buildTripPlannerPrompt

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Activity Description Rules section in system prompt enforces rich travel-writer descriptions"
    - "CRITICAL prefix on Daily Food Rules signals highest-priority constraint to the model"

key-files:
  created: []
  modified:
    - src/lib/ai/prompts/trip-planner.ts

key-decisions:
  - "Activity Description Rules added after Time Format Rules — enforces food-free activity arrays and rich descriptions with transport bridging"
  - "Sagrada Família example embedded in rules — concrete model output example drives higher consistency than abstract instructions alone"
  - "CRITICAL prefix on food separation rule in Daily Food Rules — signals highest-priority constraint to distinguish it from general guidelines"
  - "Intro line template updated: removed [N]-day and origin city guess — avoids incorrect assumptions before full trip state is populated"

patterns-established:
  - "Prompt rules use CRITICAL prefix for highest-priority constraints that override all other considerations"
  - "Concrete description examples embedded inline in prompt rules rather than abstract requirements"

requirements-completed: [AI-PROMPT-01]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 8 Plan 9: Prompt Upgrade — Expert Activity Quality and Food Separation Summary

**System prompt upgraded to enforce travel-writer activity descriptions with transport bridges, duration estimates, 4+ activities/day, and strict food/activity separation via new Activity Description Rules section**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T12:14:33Z
- **Completed:** 2026-03-12T12:16:35Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Removed hard-coded "13–16 March", "sometime in June", and "I'm guessing London" examples from intake question bullets
- Updated intro line template to remove implicit origin city guess pattern
- Added Activity Description Rules section with all five required elements: "you" address, 2–3 highlights, transport bridge, duration estimate, interesting fact
- Added food/activity separation rule to Activity Description Rules (no exceptions clause)
- Added CRITICAL prefix reminder at top of Daily Food Rules to reinforce food-only separation
- Embedded Sagrada Família concrete example in rules for model calibration

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite TRIP_PLANNER_RULES for expert activity quality and food separation** - `22b6550` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/ai/prompts/trip-planner.ts` - Updated TRIP_PLANNER_RULES with Activity Description Rules section, food separation CRITICAL note, removed hard-coded examples; all exports intact

## Decisions Made
- Activity Description Rules section placed after Time Format Rules (not before) — keeps related time/duration guidance adjacent
- Sagrada Família example embedded inline in rules rather than in a separate examples file — model sees it in context during every generation, not isolated
- CRITICAL prefix on the Daily Food Rules separation reminder — follows existing project pattern of using CRITICAL/STRICT for highest-priority model constraints

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Updated prompt will be used by all subsequent itinerary generations via buildTripPlannerPrompt()
- Activity descriptions should now include transport bridges and duration estimates in AI output
- Food venues should no longer appear in the activities array

---
*Phase: 08-ai-chat-functionality-with-openai-behavior-trip-state-itinerary-generation*
*Completed: 2026-03-12*
