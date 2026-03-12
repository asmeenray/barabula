---
phase: 13
plan: "03"
subsystem: chat-ui
tags: [hotel-persistence, state-lifting, flights-tab, google-flights, ux]
dependency_graph:
  requires: []
  provides:
    - HotelsTabPanel state restoration via initialMode/initialFoundHotel/onFoundHotel props
    - foundHotelData parent state in ChatPageInner
    - Google Flights deep link in FlightsTabPanel
  affects:
    - src/components/chat/HotelsTabPanel.tsx
    - src/app/(authenticated)/chat/page.tsx
    - src/components/chat/FlightsTabPanel.tsx
tech_stack:
  added: []
  patterns:
    - State lifting: foundHotelData moved to parent to survive HotelsTabPanel unmount cycles
    - Controlled initialization: useState seeded from props for mount-time state restoration
    - Optional callback pattern: onFoundHotel? notifies parent on successful lookup without requiring it
key_files:
  created: []
  modified:
    - src/components/chat/HotelsTabPanel.tsx
    - src/app/(authenticated)/chat/page.tsx
    - src/components/chat/FlightsTabPanel.tsx
decisions:
  - _found_hotel_card uses underscore prefix to signal UI-only data not forwarded to AI
  - onFoundHotel callback fires on lookup success, keeping parent state live during same session
  - Google Flights URL uses full q= query string with encodeURIComponent for all values
  - Link conditionally shown only when at least one of origin/destination is known
metrics:
  duration: 4min
  completed_date: "2026-03-12"
  tasks_completed: 2
  files_modified: 3
---

# Phase 13 Plan 03: Hotel Persistence and Google Flights Link Summary

Lifted hotel-found-card state to the chat page parent so reopening the Hotel tab restores mode, preferences, and the found hotel card with checkmark. Added a coral "Search on Google Flights" deep link to the Flights tab.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend HotelsTabPanel with state restoration props | 9e4d577 | HotelsTabPanel.tsx |
| 2 | Wire hotel persistence in chat/page.tsx and add Google Flights link | 7fcfe7e | page.tsx, FlightsTabPanel.tsx |

## What Was Built

**Hotel persistence (state lifting):**
- `HotelSaveData` interface extended with optional `_found_hotel_card` field (underscore signals UI-only, not forwarded to AI)
- `HotelsTabPanelProps` gains three optional props: `initialMode`, `initialFoundHotel`, `onFoundHotel`
- `useState` for `mode` and `foundHotel` now seeded from props at mount time
- `onFoundHotel` callback fires after each successful hotel lookup, notifying the parent immediately
- `handleSave` always includes `_found_hotel_card` in the save data (hotel or null)
- `ChatPageInner` adds `foundHotelData` state and passes it as `initialFoundHotel` to `HotelsTabPanel`
- On save, the `_found_hotel_card` value is synced back to `foundHotelData` parent state

**Google Flights link:**
- `buildGoogleFlightsUrl()` helper constructs a pre-filled Google Flights search URL from tripState values
- Link rendered above the flight form fields when at least `origin` or `destination` is present
- Uses `text-coral` class, `hover:opacity-70`, opens in new tab with `rel="noopener noreferrer"`

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

Files created/modified:
- [x] src/components/chat/HotelsTabPanel.tsx — FOUND
- [x] src/app/(authenticated)/chat/page.tsx — FOUND
- [x] src/components/chat/FlightsTabPanel.tsx — FOUND

Commits:
- [x] 9e4d577 — FOUND
- [x] 7fcfe7e — FOUND

`npx tsc --noEmit` exits 0: PASSED

## Self-Check: PASSED
