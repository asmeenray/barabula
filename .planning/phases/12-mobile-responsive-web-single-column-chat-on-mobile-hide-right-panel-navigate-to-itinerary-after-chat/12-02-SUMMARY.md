---
phase: 12-mobile-responsive-web-single-column-chat-on-mobile-hide-right-panel-navigate-to-itinerary-after-chat
plan: 02
subsystem: ui
tags: [react, tailwind, mobile-responsive, framer-motion, nextjs, viewport]

# Dependency graph
requires:
  - phase: 12-01
    provides: Scaffold tests for split-layout and itinerary-detail mobile behaviors

provides:
  - Responsive SplitLayout — right panel hidden on mobile via hidden md:flex wrapper
  - Mobile overlay with coral spinner and sand background before itinerary auto-navigation
  - router.push auto-navigation 1200ms after itinerary generation completes on mobile
  - viewport-fit=cover in Next.js root layout for iOS safe area inset support

affects:
  - 12-03 (itinerary detail page FAB — uses same viewport and mobile context)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Responsive split layout: left panel uses flex-1 md:flex-none; right section uses hidden md:flex wrapper"
    - "Mobile auto-nav: window.innerWidth < 768 check inside callApi (imperative, no hydration risk)"
    - "iOS safe area: Next.js Viewport export with viewportFit=cover"
    - "Test mobile viewport: Object.defineProperty(window, 'innerWidth', {value: 375}) in test setup"

key-files:
  created: []
  modified:
    - src/components/chat/SplitLayout.tsx
    - src/app/layout.tsx
    - src/app/(authenticated)/chat/page.tsx
    - src/__tests__/chat-page.test.tsx

key-decisions:
  - "window.innerWidth < 768 check placed inside callApi (imperative code) — no hydration risk vs JSX conditional"
  - "Mobile overlay fires, then router.push after 1200ms — desktop Accept button unchanged"
  - "Test mocks window.innerWidth=375 to exercise mobile auto-nav branch — jsdom default is 1024px"
  - "Motion cubic bezier easing typed as [number,number,number,number] tuple — consistent with Phase 07 decision"

patterns-established:
  - "Mobile-first split: right section wrapped in hidden md:flex; left panel uses flex-1 md:flex-none"
  - "Mobile viewport in tests: Object.defineProperty(window, 'innerWidth', {value: 375, writable:true, configurable:true})"

requirements-completed: [MOB-01, MOB-02]

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 12 Plan 02: Mobile Responsive Chat Summary

**Responsive SplitLayout with hidden md:flex right section, sand-bg coral-spinner mobile overlay, and 1200ms auto-nav to itinerary on mobile — with iOS safe-area viewport export**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-12T12:06:46Z
- **Completed:** 2026-03-12T12:10:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- SplitLayout right section (drag handle + panel) wrapped in `hidden md:flex` div — single toggle controls both on mobile
- Left panel upgraded to `flex-1 md:flex-none` so it fills full width when right is hidden
- layout.tsx exports Next.js `Viewport` with `viewportFit: 'cover'` enabling env(safe-area-inset-*) on iOS
- chat/page.tsx adds `showMobileOverlay` state + `useRouter` + mobile branch in callApi
- AnimatePresence overlay with coral spinner and sand background shows briefly before auto-navigation
- Test updated to mock window.innerWidth=375 to exercise the mobile code path in jsdom

## Task Commits

Each task was committed atomically:

1. **Task 1: Make SplitLayout responsive — right section hidden on mobile** - `9f13e69` (feat)
2. **Task 2: Add viewport-fit=cover + mobile overlay + auto-nav in chat page** - `20e240a` (feat)

**Plan metadata:** (docs commit — next)

## Files Created/Modified
- `src/components/chat/SplitLayout.tsx` — Left panel gets `flex-1 md:flex-none`; drag handle + right panel wrapped in `hidden md:flex h-full` div
- `src/app/layout.tsx` — Added `Viewport` export with `viewportFit: 'cover'` for iOS safe area support
- `src/app/(authenticated)/chat/page.tsx` — Added `useRouter`, `showMobileOverlay` state, mobile auto-nav branch in callApi, AnimatePresence overlay JSX
- `src/__tests__/chat-page.test.tsx` — Set `window.innerWidth=375` in router.push test to simulate mobile viewport

## Decisions Made
- `window.innerWidth < 768` check inside `callApi` (imperative), not in JSX — avoids hydration mismatch risk
- Desktop path unchanged — ContextPanel Accept button still drives desktop navigation
- jsdom defaults to `window.innerWidth=1024`; test uses `Object.defineProperty` to override to 375 so mobile branch fires
- Motion cubic bezier typed as `[number, number, number, number]` tuple — consistent with existing project pattern from Phase 07

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test mock did not simulate mobile viewport for router.push assertion**
- **Found during:** Task 2 (mobile overlay + auto-nav)
- **Issue:** jsdom defaults `window.innerWidth` to 1024 (desktop), so the mobile branch `window.innerWidth < 768` never fires in tests. The scaffold test `calls router.push after receiving itineraryId` would timeout because `router.push` is never called on desktop path
- **Fix:** Added `Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true })` at the top of that specific test case, with restoration after the assertion
- **Files modified:** `src/__tests__/chat-page.test.tsx`
- **Verification:** All 6 chat-page tests pass including the router.push test (1.25s, within 5000ms timeout)
- **Committed in:** `20e240a` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in scaffold test's environment setup)
**Impact on plan:** Essential fix — without it the router.push test would always timeout. No scope creep.

## Issues Encountered
- jsdom window.innerWidth defaults to 1024px (not 0 as assumed during planning) — resolved by adding viewport mock in the affected test

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Mobile split layout is fully responsive — Plan 03 (itinerary FAB) can build on top of this foundation
- viewport-fit=cover in place — Plan 03 FAB can use `env(safe-area-inset-bottom)` for proper iOS bottom spacing
- 2 itinerary-detail.test.tsx tests still failing (Plan 03 scaffold) — expected, Plan 03 will implement them

## Self-Check: PASSED
- SplitLayout.tsx: FOUND
- layout.tsx: FOUND
- Commit 9f13e69: FOUND
- Commit 20e240a: FOUND

---
*Phase: 12-mobile-responsive-web-single-column-chat-on-mobile-hide-right-panel-navigate-to-itinerary-after-chat*
*Completed: 2026-03-12*
