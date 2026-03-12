---
phase: 09-itinerary-page-with-map-integration-and-hotel-details
plan: "01"
subsystem: ui
tags: [react, nextjs, map, lazy-load, state-management]

# Dependency graph
requires:
  - phase: 09-itinerary-page-with-map-integration-and-hotel-details
    provides: ItineraryMap component, geocoding, split layout, ItineraryHero
provides:
  - showMap state in page.tsx — map hidden by default, opt-in via button
  - onToggleMap/showMap props on ItineraryHero — coral Show Map/Hide Map button
  - Lazy geocoding — only starts after user clicks Show Map
  - Conditional layout — full-width list (default) or split with map
affects: [future itinerary page enhancements, map interaction tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "lazy-mount pattern — conditional rendering guards expensive component until user opt-in"
    - "state-driven layout switching — showMap ternary at render root"

key-files:
  created: []
  modified:
    - src/app/(authenticated)/itinerary/[id]/page.tsx
    - src/components/itinerary/ItineraryHero.tsx
    - src/__tests__/itinerary-detail.test.tsx
    - src/__tests__/itinerary-hero.test.tsx

key-decisions:
  - "showMap defaults to false — full-width itinerary list on page load, no geocoding until user opts in"
  - "handleToggleMap resets mapPins and geocodingProgress on hide — clean state for next toggle cycle"
  - "Mobile tab toggle only rendered when showMap=true — avoids confusing tabs on default load"
  - "itinerary-hero.test.tsx updated with all required props — fixed pre-existing TS error caused by adding new required props"

patterns-established:
  - "Lazy mount pattern: showMap && <ItineraryMap> — expensive map component only rendered on demand"
  - "State-driven layout: conditional ternary switches between full-width and split-panel at render root"

requirements-completed: [MAP-01, MAP-02]

# Metrics
duration: 8min
completed: 2026-03-12
---

# Phase 09 Plan 01: Lazy Map Toggle Summary

**Coral Show Map/Hide Map button in ItineraryHero with lazy ItineraryMap mount — map hidden by default, geocoding deferred until user opts in via toggle**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-12T00:14:11Z
- **Completed:** 2026-03-12T00:22:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Map panel hidden by default — full-width itinerary list fills viewport on page load
- Coral "Show Map" button with map pin SVG icon added to ItineraryHero between title block and Delete button
- Geocoding useEffect now guarded by `showMap === true` — no API calls until user requests map
- handleToggleMap resets pins and progress on hide, sets appropriate mobile tab on toggle
- 5/5 itinerary-detail tests passing including 2 new map-toggle tests; zero new test regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add showMap state and conditional map mount to page.tsx** - `e46210a` (feat)
2. **Task 2: Add Show Map coral button to ItineraryHero and update tests** - `46e4885` (feat)

## Files Created/Modified
- `src/app/(authenticated)/itinerary/[id]/page.tsx` - showMap state, handleToggleMap, lazy geocoding, conditional split/full-width layout
- `src/components/itinerary/ItineraryHero.tsx` - onToggleMap/showMap props, coral Show Map/Hide Map button with map pin icon
- `src/__tests__/itinerary-detail.test.tsx` - added fireEvent import, two new map-toggle tests
- `src/__tests__/itinerary-hero.test.tsx` - added all required props to render call (fixed pre-existing TS error)

## Decisions Made
- showMap defaults to false — users see the itinerary immediately without geocoding lag
- handleToggleMap resets mapPins and geocodingProgress on hide — clean state for next toggle cycle
- Mobile tab toggle only rendered when showMap=true — avoids confusing tabs when map isn't visible
- itinerary-hero.test.tsx updated to include new required props — also fixed pre-existing TypeScript error from missing existing props

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TypeScript error in itinerary-hero.test.tsx**
- **Found during:** Task 2 (Add Show Map button and update tests)
- **Issue:** itinerary-hero.test.tsx render call was missing all required ItineraryHeroProps beyond title/coverImageUrl/destination — pre-existing TS error that became directly relevant when adding new required props
- **Fix:** Updated render call to include all required props including new onToggleMap and showMap
- **Files modified:** src/__tests__/itinerary-hero.test.tsx
- **Verification:** npx tsc --noEmit now returns 1 error (only activity-row.test.tsx pre-existing) vs 2 errors before
- **Committed in:** 46e4885 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - pre-existing TS error made directly relevant by new props)
**Impact on plan:** Fix was necessary — adding required props to interface without updating the test would leave a TS error directly caused by this task. No scope creep.

## Issues Encountered
- Pre-existing TypeScript error in `src/__tests__/activity-row.test.tsx` (missing `extra_data` field in mock) — out of scope, not fixed.
- Pre-existing test failures in split-layout, hotel-card, and chat-page tests — confirmed pre-existing via git stash check, zero new regressions introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Map toggle is complete — lazy loading pattern established
- Geocoding only fires on user request — improves perceived performance
- Full-width layout is the new default — future plans can build on this without assuming split layout
- No blockers for subsequent plans in Phase 09

## Self-Check: PASSED

- FOUND: src/app/(authenticated)/itinerary/[id]/page.tsx
- FOUND: src/components/itinerary/ItineraryHero.tsx
- FOUND: src/__tests__/itinerary-detail.test.tsx
- FOUND: src/__tests__/itinerary-hero.test.tsx
- FOUND commit e46210a (Task 1)
- FOUND commit 46e4885 (Task 2)

---
*Phase: 09-itinerary-page-with-map-integration-and-hotel-details*
*Completed: 2026-03-12*
