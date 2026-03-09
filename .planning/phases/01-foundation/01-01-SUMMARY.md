---
phase: 01-foundation
plan: "01"
subsystem: api
tags: [openai, fastapi, typescript, uvicorn, googlemaps]

# Dependency graph
requires: []
provides:
  - Frontend API base URL correctly pointing to FastAPI backend on port 8000
  - OpenAI SDK v1 (AsyncOpenAI) with client.chat.completions.create at all 3 call sites
  - response_format json_object on itinerary generation call
  - extra_data column used (not metadata) for saving AI itinerary data
  - None-guards on gmaps calls in recommendations.py
  - test_auth.py targeting port 8000
affects: [02-foundation, 03-collaboration, 04-streaming, 05-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AsyncOpenAI client initialized at module level, shared across all call sites"
    - "gmaps None-guard pattern: check before calling any Google Maps method"

key-files:
  created: []
  modified:
    - frontend/src/services/api.ts
    - backend/main.py
    - backend/api/chat.py
    - backend/api/recommendations.py
    - test_auth.py

key-decisions:
  - "Use response_format json_object on itinerary generation only (not chat or translate — those return prose)"
  - "Fix before modernize — these are wiring fixes, no structural changes"

patterns-established:
  - "Port 8000: all frontend API calls and backend uvicorn binding use port 8000"
  - "AsyncOpenAI pattern: from openai import AsyncOpenAI; client = AsyncOpenAI(api_key=...)"

requirements-completed: [FIX-01, FIX-02, FIX-03, FIX-04, FIX-06, FIX-07, AI-01, AI-02, AI-03]

# Metrics
duration: 4min
completed: 2026-03-09
---

# Phase 1 Plan 1: Fix Cascading Wiring Failures Summary

**Port mismatch and broken OpenAI SDK v0 calls corrected — frontend now reaches FastAPI on port 8000, AI generation uses AsyncOpenAI v1 with JSON output mode, and gmaps None-guards prevent crashes when Google Maps key is absent**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-09T15:14:17Z
- **Completed:** 2026-03-09T15:17:42Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Frontend API base URL and uvicorn port aligned to 8000 — end-to-end HTTP requests now reach FastAPI
- OpenAI SDK migrated from v0 (openai.ChatCompletion.acreate) to v1 (AsyncOpenAI + client.chat.completions.create) at all 3 call sites
- Itinerary generation call gets response_format json_object for reliable JSON output; chat and translate calls left as prose
- extra_data= field name corrected (was metadata=, which silently mapped to SQLAlchemy internals)
- None-guards added to get_nearby_places and get_place_details so app works without GOOGLE_MAPS_API_KEY

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix frontend API base URL and backend port** - `5608a00` (fix)
2. **Task 2: Migrate chat.py to OpenAI SDK v1 and fix extra_data field** - `b93a33e` (fix)
3. **Task 3: Add None-guards to recommendations.py and fix test_auth.py port** - `7cb4a60` (fix)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `frontend/src/services/api.ts` - API_BASE_URL changed from localhost:3001 to localhost:8000
- `backend/main.py` - uvicorn port changed from 3001 to 8000
- `backend/api/chat.py` - AsyncOpenAI client, 3 call sites migrated, response_format added, extra_data= fix
- `backend/api/recommendations.py` - None-guards before gmaps.places_nearby and gmaps.place calls
- `test_auth.py` - BASE_URL changed from localhost:3001 to localhost:8000

## Decisions Made
- response_format json_object applied to generate_itinerary only — generate_chat_response and translate_text return prose and would break with forced JSON mode
- No structural changes made; these are targeted wiring fixes as specified in the plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- The plan's verification grep `grep -rn "ChatCompletion\|openai.api_key"` returned a false-positive match on `AsyncOpenAI(api_key=settings.openai_api_key)` due to the `api_key` substring — confirmed separately that no old-style `openai.api_key =` assignment remains.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All wiring fixes complete; end-to-end auth and AI generation are mechanically possible
- Backend still requires OPENAI_API_KEY env var to be set for actual AI responses
- Google Maps features degrade gracefully to empty results when GOOGLE_MAPS_API_KEY is absent
- Ready for Phase 1 Plan 2

---
*Phase: 01-foundation*
*Completed: 2026-03-09*
