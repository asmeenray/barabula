---
phase: 12-mobile-responsive-web-single-column-chat-on-mobile-hide-right-panel-navigate-to-itinerary-after-chat
plan: 03
subsystem: ui
tags: [mobile, fab, tailwind, framer-motion, react]

# Dependency graph
requires:
  - phase: 12-01
    provides: scaffold tests including itinerary-detail.test.tsx FAB test (MOB-03)
  - phase: 12-02
    provides: mobile overlay nav and auto-navigation from chat to itinerary
provides:
  - Coral "Chat again" FAB on itinerary page — mobile only (md:hidden), routes to /chat
  - FlightsTabPanel body capped at max-h-[40vh] overflow-y-auto
  - HotelsTabPanel body capped at max-h-[40vh] overflow-y-auto
affects:
  - itinerary page UX on mobile
  - chat input visibility on small phones when tab panels are open

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Inline style.bottom with env(safe-area-inset-bottom) for iOS safe area — Tailwind can't express env() without a plugin
    - Conditional FAB position based on share-mode + ctaBannerVisible to avoid CTA banner overlap
    - max-h-[40vh] on tab panel body content (not header) as mobile viewport cap

key-files:
  created: []
  modified:
    - src/app/(authenticated)/itinerary/[id]/page.tsx
    - src/components/chat/FlightsTabPanel.tsx
    - src/components/chat/HotelsTabPanel.tsx

key-decisions:
  - "Inline style.bottom overrides Tailwind bottom-* with env(safe-area-inset-bottom) — Tailwind arbitrary values don't support env() without a plugin; className value is visual fallback"
  - "FAB positioned after share toast AnimatePresence, before CTA banner AnimatePresence — correct z-order, sits between z-50 toast and z-40 banner"
  - "HotelsTabPanel: wrap body in max-h-[40vh] div rather than constrain individual fields — cleaner than adding max-height to each element"
  - "FlightsTabPanel: change existing max-h-72 to max-h-[40vh] — consistent viewport-relative cap across panels"

patterns-established:
  - "iOS safe area: use inline style with env(safe-area-inset-bottom, 0px) fallback for fixed positioned elements near bottom of screen"
  - "Mobile-only FAB pattern: fixed z-40 md:hidden right-5, coral background, rounded-full, with share-mode position override"

requirements-completed:
  - MOB-03

# Metrics
duration: 5min
completed: 2026-03-12
---

# Phase 12 Plan 03: Chat Again FAB and Tab Panel Height Caps Summary

**Coral "Chat again" FAB added to itinerary page (mobile only, iOS safe area aware) with 40vh height caps on Flights/Hotels tab panels to prevent chat input from being pushed offscreen**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-12T12:12:00Z
- **Completed:** 2026-03-12T12:14:36Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added mobile-only "Chat again" FAB to itinerary page with coral styling, md:hidden, and iOS safe area insets via inline style
- FAB repositions above CTA banner in share mode to avoid overlap
- Capped FlightsTabPanel body at max-h-[40vh] overflow-y-auto (was max-h-72)
- Capped HotelsTabPanel body at max-h-[40vh] overflow-y-auto (new wrapper div)
- All 8 itinerary-detail tests pass including the Wave 0 FAB scaffold test
- Full Phase 12 affected tests pass: 40/40

## Task Commits

Each task was committed atomically:

1. **Task 1: Add "Chat again" FAB to itinerary page** - `d098488` (feat)
2. **Task 2: Cap tab panel height for small mobile screens** - `240f636` (feat)

**Plan metadata:** (docs commit below)

_Note: Task 1 used TDD — confirmed RED (FAB test failing), then GREEN (all 8 tests pass)_

## Files Created/Modified
- `src/app/(authenticated)/itinerary/[id]/page.tsx` - Added "Chat again" FAB button (fixed, mobile-only, coral, iOS safe area)
- `src/components/chat/FlightsTabPanel.tsx` - Changed max-h-72 to max-h-[40vh] on scrollable body
- `src/components/chat/HotelsTabPanel.tsx` - Wrapped body content in max-h-[40vh] overflow-y-auto div

## Decisions Made
- Inline `style.bottom` overrides Tailwind `bottom-*` with `env(safe-area-inset-bottom, 0px)` — Tailwind arbitrary values don't support CSS env() without a plugin; className provides visual fallback for non-iOS
- FAB inserted after share toast AnimatePresence block and before CTA banner AnimatePresence block to respect z-order (z-50 toast, z-40 FAB and banner)
- HotelsTabPanel uses a wrapper div approach for max-height — cleaner than adding max-height to each individual sub-element
- FlightsTabPanel existing `max-h-72` changed to `max-h-[40vh]` for consistent viewport-relative behavior across panels

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing `hotel-card.test.tsx` failure (1 test, unrelated to this plan's scope) was confirmed pre-existing via git stash. Left unchanged per scope boundary rule.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 12 is now complete: Plans 01 (scaffold tests), 02 (mobile overlay + chat auto-nav), and 03 (FAB + tab caps) all done
- All Wave 0 scaffold tests from Plan 01 are now satisfied
- Full mobile flow complete: user generates trip on mobile → navigates to itinerary → can tap "Chat again" FAB to return to chat

---
*Phase: 12-mobile-responsive-web-single-column-chat-on-mobile-hide-right-panel-navigate-to-itinerary-after-chat*
*Completed: 2026-03-12*
