---
phase: 13-mobile-bug-fixes-hotel-persistence-flight-details-date-year-defaulting-multi-day-itinerary-display-and-transport-options-in-activities
plan: "04"
subsystem: chat-intake
tags: [transport, chips, intake, gathering-details]
dependency_graph:
  requires: [13-01]
  provides: [transport-chip-panel, getting-around-chip, transport-mode-api-flow]
  affects: [chat-page, quick-action-chips, message-api-route]
tech_stack:
  added: []
  patterns: [sentinel-interception, animatepresence-panel, merged-trip-state]
key_files:
  created:
    - src/components/chat/TransportChipPanel.tsx
  modified:
    - src/components/chat/QuickActionChips.tsx
    - src/app/(authenticated)/chat/page.tsx
    - src/app/api/chat/message/route.ts
    - src/components/chat/BottomTabBar.tsx
    - src/__tests__/quick-action-chips.test.tsx
decisions:
  - "TransportChipPanel closes immediately on selection (no separate save button) — selection IS the action"
  - "BottomTabBar activeTab widened to include 'transport' — transport is chip-only, not a BottomTabBar tab"
  - "transportMode merged client-side into mergedTripState before buildSystemPrompt — same pattern as existing flightInputData/hotelSaveData"
metrics:
  duration: 4min
  completed_date: "2026-03-12"
  tasks_completed: 2
  files_changed: 6
---

# Phase 13 Plan 04: Transport Mode Chip and Panel Summary

Getting around chip + TransportChipPanel with sentinel interception, giving users a 2x2 radio-style panel to select their transport mode, stored in state and injected into AI context on next message.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create TransportChipPanel and update QuickActionChips | 93335ff | TransportChipPanel.tsx, QuickActionChips.tsx, quick-action-chips.test.tsx |
| 2 | Wire transport mode into chat/page.tsx and API route | 330e5d9 | page.tsx, route.ts, BottomTabBar.tsx |

## What Was Built

**TransportChipPanel** (`src/components/chat/TransportChipPanel.tsx`): New panel component following the HotelsTabPanel visual pattern (border-sky/30, rounded-2xl, bg-white/95, shadow-lg, mx-3 mb-2, p-4). Displays four transport options in a 2x2 grid — Public transport, Rent a car, Mix of both, I'll figure it out. Selected option shows navy bg + white text. Clicking any option immediately calls `onSelect(value)` and the panel closes (no save button needed).

**QuickActionChips** update: `gathering_details` CHIP_SETS entry now includes `{ label: 'Getting around', message: '__show_transport_panel__' }`.

**chat/page.tsx** changes:
- `activeTab` type widened to include `'transport'`
- New `transportMode` state (`useState<string | null>(null)`)
- `sendMessage()` intercepts `__show_transport_panel__` sentinel before the API call — sets `activeTab('transport')` and returns
- `callApi()` fetch body includes `transportMode`
- `AnimatePresence` has a new `activeTab === 'transport'` branch rendering `TransportChipPanel`

**API route** changes: Destructures `transportMode` from request body and merges into `mergedTripState` before `buildSystemPrompt()`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing test for gathering_details phase**
- **Found during:** Task 1
- **Issue:** `quick-action-chips.test.tsx` had a test asserting `gathering_details` renders nothing. Adding the Getting around chip made this test correctly fail.
- **Fix:** Updated test to assert the Getting around chip renders in `gathering_details` phase.
- **Files modified:** `src/__tests__/quick-action-chips.test.tsx`
- **Commit:** 93335ff

**2. [Rule 3 - Blocking] Widened BottomTabBar activeTab type**
- **Found during:** Task 2
- **Issue:** TypeScript error — BottomTabBar props typed `activeTab: 'flights' | 'hotels' | null` but chat/page.tsx now passes `'flights' | 'hotels' | 'transport' | null`.
- **Fix:** Updated BottomTabBar interface to include `'transport'` in both `activeTab` and `onTabChange` types.
- **Files modified:** `src/components/chat/BottomTabBar.tsx`
- **Commit:** 330e5d9

## Self-Check: PASSED

- TransportChipPanel.tsx: FOUND
- QuickActionChips.tsx: FOUND
- route.ts: FOUND
- Commit 93335ff: FOUND
- Commit 330e5d9: FOUND
