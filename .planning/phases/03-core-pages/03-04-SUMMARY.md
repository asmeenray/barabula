---
phase: 03-core-pages
plan: 04
subsystem: ui
tags: [next.js, react, swr, typescript, vitest, itinerary, activities, modal]

# Dependency graph
requires:
  - phase: 03-core-pages-01
    provides: Activity and Itinerary types, GET/PATCH/DELETE /api/itineraries/[id], SkeletonText, ErrorMessage, Vitest infrastructure
  - phase: 03-core-pages-03
    provides: Dashboard itinerary list and navigation patterns
provides:
  - POST /api/activities — create new activity with auth and validation
  - PATCH /api/activities/[id] — update activity fields
  - DELETE /api/activities/[id] — remove activity
  - Itinerary detail page (/itinerary/[id]) — scrollable day-by-day view, sticky headers, inline edit, activity management
  - Create itinerary page (/itinerary/new) — form with title, destination, dates, POST to /api/itineraries
  - /itinerary index redirect to /dashboard
  - ActivityRow component — name, blue time, pin location, description, edit/delete
  - ActivityForm modal — add/edit activity with name/time/location/description fields
  - DaySection component — sticky Day N header, activities list, add-activity button
affects:
  - Future chat/AI flow (itinerary/[id] is the landing page after AI generation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useSWR for itinerary data with mutate() after every mutation
    - groupByDay() helper for Map<number, Activity[]> with lexicographic time sort
    - Inline editing pattern: click-to-edit → draft state → save on blur/Enter
    - Modal overlay with click-outside-to-cancel using e.target === e.currentTarget
    - Activity CRUD routes follow same await params pattern as itinerary routes

key-files:
  created:
    - src/app/api/activities/route.ts
    - src/app/api/activities/[id]/route.ts
    - src/components/itinerary/ActivityRow.tsx
    - src/components/itinerary/ActivityForm.tsx
    - src/components/itinerary/DaySection.tsx
    - src/app/(authenticated)/itinerary/[id]/page.tsx
    - src/app/(authenticated)/itinerary/new/page.tsx
    - src/__tests__/activity-row.test.tsx
    - src/__tests__/itinerary-detail.test.tsx
  modified:
    - src/app/(authenticated)/itinerary/page.tsx

key-decisions:
  - "Test globals (it/expect) imported explicitly from vitest — project pattern requires explicit imports not global injection, wrapped in describe blocks"
  - "DaySection sticky header uses top-16 (64px) offset to clear the authenticated layout nav bar"
  - "Empty itinerary (no activities) shows Day 1 as a placeholder empty section rather than blank page"

patterns-established:
  - "Activity CRUD: POST /api/activities, PATCH /api/activities/[id], DELETE /api/activities/[id] — all with await params and supabase.auth.getUser() auth"
  - "Itinerary detail uses SWR fetcher throwing on !r.ok, with ErrorMessage component for error state"
  - "Vitest test files import describe/it/expect/vi explicitly from 'vitest' (not relying on globals: true in config)"

requirements-completed: [ITIN-01, ITIN-02, ITIN-03, ITIN-04]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 03 Plan 04: Itinerary Detail and Activity Management Summary

**Day-by-day itinerary detail page with sticky section headers, inline title/description editing, ActivityForm modal, and three activity CRUD API routes — the primary destination for users after AI generation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T20:02:20Z
- **Completed:** 2026-03-10T20:06:40Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Three activity API routes (POST, PATCH, DELETE) with auth and input validation
- Itinerary detail page loads via SWR, groups activities by day_number, renders scrollable day sections with sticky headers
- Inline title and description editing — click to enter edit mode, save on blur or Enter key
- ActivityForm modal for adding/editing activities with overlay dismiss pattern
- /itinerary/new create form with four fields, POST to /api/itineraries, navigates to new itinerary on success
- /itinerary index redirects to /dashboard as a Server Component
- 8 new tests (5 ActivityRow + 3 itinerary detail), full suite 33/33 pass, TypeScript clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Activity API routes and itinerary components** - `a633d89` (feat)
2. **TDD RED: Failing tests for itinerary detail page** - `72b18c9` (test)
3. **Task 2: Itinerary detail, create, and index pages** - `77d9d51` (feat)

_Note: TDD tasks have separate commits (test → feat)_

## Files Created/Modified
- `src/app/api/activities/route.ts` - POST: create activity with itinerary_id, day_number, name validation
- `src/app/api/activities/[id]/route.ts` - PATCH: update activity fields; DELETE: remove by id
- `src/components/itinerary/ActivityRow.tsx` - Activity card with name, blue time, pin location, description, edit/delete buttons
- `src/components/itinerary/ActivityForm.tsx` - Modal overlay form for add/edit activity
- `src/components/itinerary/DaySection.tsx` - Sticky Day N header with activities list and add-activity button
- `src/app/(authenticated)/itinerary/[id]/page.tsx` - Full detail page: SWR data fetch, groupByDay, inline editing, ActivityForm modal, delete itinerary
- `src/app/(authenticated)/itinerary/new/page.tsx` - Create form: title/destination/dates, POST to /api/itineraries, router.push on success
- `src/app/(authenticated)/itinerary/page.tsx` - Redirect to /dashboard (Server Component)
- `src/__tests__/activity-row.test.tsx` - 5 tests covering rendering of name, time, location, description, null time
- `src/__tests__/itinerary-detail.test.tsx` - 3 tests covering header render, day sections, activity rendering

## Decisions Made
- Imported vitest globals explicitly (`describe/it/expect/vi` from 'vitest') to match project convention — other test files use explicit imports, not relying on `globals: true` in vitest config
- DaySection uses `sticky top-16` to offset below the authenticated layout nav bar (~64px)
- Empty itinerary shows Day 1 as empty placeholder rather than blank page — better UX for freshly created trips

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test file used global `it` without explicit vitest import**
- **Found during:** Task 1 (activity-row test verification)
- **Issue:** Plan template used top-level `it()` without importing from vitest, causing TypeScript error `Cannot find name 'it'` since project uses explicit imports pattern
- **Fix:** Added `import { describe, it, expect, vi } from 'vitest'` and wrapped tests in `describe` block to match project convention seen in all existing test files
- **Files modified:** `src/__tests__/activity-row.test.tsx`
- **Verification:** `npx tsc --noEmit` clean, all 5 tests pass
- **Committed in:** `a633d89` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor fix to align test file with existing project pattern. No scope creep.

## Issues Encountered
None — plan executed cleanly after the test import fix.

## User Setup Required
None - activity routes use existing Supabase RLS (activities are owned via itinerary ownership). No new environment variables needed.

## Next Phase Readiness
- Itinerary detail page is the landing target for AI-generated itineraries (Plan 02 chat flow navigates here)
- All ITIN-01 through ITIN-04 requirements complete
- Phase 3 core pages are now fully implemented (chat, dashboard, itinerary detail, create)
- Phase 4 can build collaborative features on top of the established SWR + mutate() data pattern

---
*Phase: 03-core-pages*
*Completed: 2026-03-10*

## Self-Check: PASSED

- src/app/api/activities/route.ts: FOUND
- src/app/api/activities/[id]/route.ts: FOUND
- src/components/itinerary/ActivityRow.tsx: FOUND
- src/components/itinerary/ActivityForm.tsx: FOUND
- src/components/itinerary/DaySection.tsx: FOUND
- src/app/(authenticated)/itinerary/[id]/page.tsx: FOUND
- src/app/(authenticated)/itinerary/new/page.tsx: FOUND
- src/__tests__/activity-row.test.tsx: FOUND
- src/__tests__/itinerary-detail.test.tsx: FOUND
- Commit a633d89: FOUND
- Commit 72b18c9: FOUND
- Commit 77d9d51: FOUND
