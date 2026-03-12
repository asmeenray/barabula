---
phase: 12-mobile-responsive-web-single-column-chat-on-mobile-hide-right-panel-navigate-to-itinerary-after-chat
plan: "01"
subsystem: testing
tags: [tdd, wave-0, scaffold, mobile-responsive]
dependency_graph:
  requires: []
  provides: [split-layout-scaffold-tests, mobile-overlay-scaffold-test, chat-again-fab-scaffold-test]
  affects: [src/__tests__/split-layout.test.tsx, src/__tests__/chat-page.test.tsx, src/__tests__/itinerary-detail.test.tsx]
tech_stack:
  added: []
  patterns: [wave-0-scaffold, red-green-refactor]
key_files:
  created: []
  modified:
    - src/__tests__/split-layout.test.tsx
    - src/__tests__/chat-page.test.tsx
    - src/__tests__/itinerary-detail.test.tsx
decisions:
  - "Scaffold tests intentionally fail — they drive Plans 02 and 03 implementation (Wave 0 pattern)"
  - "router.push and hotel-card star rating failures are pre-existing and out of scope"
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-12"
  tasks_completed: 2
  files_modified: 3
---

# Phase 12 Plan 01: Test Scaffolds — Responsive Layout and Mobile Navigation

Wave 0 test scaffolds: fix two stale SplitLayout assertions (grid-cols-2, h-screen) and add three failing scaffold tests that drive Plans 02 and 03 implementation.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Fix stale SplitLayout tests and add responsive scaffold | 328fafb | Done |
| 2 | Add mobile overlay and FAB scaffolds to existing test files | 9864c37 | Done |

## What Was Built

**Task 1 — split-layout.test.tsx:**
- Removed stale `grid-cols-2` test → replaced with `container uses flex layout` (passes)
- Removed stale `h-screen` test → replaced with `container uses h-full` (passes)
- Added `hides right section on mobile (hidden md:flex)` scaffold (fails until Plan 02 adds wrapper div)
- Added `left panel fills width when right is hidden (flex-1)` scaffold (fails until Plan 02 adds flex-1 to left panel)

**Task 2 — chat-page.test.tsx:**
- Added `shows mobile overlay when showMobileOverlay state is true` test — asserts overlay is absent on initial render (passes immediately)

**Task 2 — itinerary-detail.test.tsx:**
- Added `renders "Chat again" FAB with md:hidden class (mobile only)` test (fails until Plan 03 adds FAB)

## Test Suite Baseline After Wave 0

- 152 tests passing, 5 failing
- 3 intentional scaffold failures: 2 in split-layout (Plans 02), 1 in itinerary-detail (Plan 03)
- 2 pre-existing failures: `router.push` in chat-page, `star rating` in hotel-card — out of scope

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/__tests__/split-layout.test.tsx` — exists, has `hidden md:flex` scaffold
- `src/__tests__/chat-page.test.tsx` — exists, has `mobile overlay` absence test
- `src/__tests__/itinerary-detail.test.tsx` — exists, has `Chat again` scaffold
- Commits 328fafb and 9864c37 exist in git log
