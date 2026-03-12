---
phase: 13-mobile-bug-fixes-hotel-persistence-flight-details-date-year-defaulting-multi-day-itinerary-display-and-transport-options-in-activities
plan: "02"
subsystem: api
tags: [images, unsplash, pexels, api-route, cleanup]
dependency_graph:
  requires: []
  provides: [destination-image-api-uses-fetchCityImage]
  affects: [activity-images, cover-images]
tech_stack:
  added: []
  patterns: [unsplash-pexels-fallback]
key_files:
  created: []
  modified:
    - src/app/api/destination-image/route.ts
decisions:
  - "destination-image route delegates to fetchCityImage() — removes Pexels-only inline fetch that silently failed when PEXELS_API_KEY absent"
  - "photographer/photographerUrl fields dropped — Pexels-specific, no consumer in codebase uses them"
metrics:
  duration: "2min"
  completed: "2026-03-12"
  tasks: 1
  files_changed: 1
---

# Phase 13 Plan 02: Destination Image Route Fix Summary

**One-liner:** Route delegates to fetchCityImage() (Unsplash-first, Pexels-fallback) instead of Pexels-only inline fetch that failed silently without PEXELS_API_KEY.

## What Was Built

Replaced 29-line Pexels-only route in `src/app/api/destination-image/route.ts` with a 9-line clean implementation that calls `fetchCityImage()` from `src/lib/unsplash.ts`.

**Before:** Route early-returned `{ url: null }` when `PEXELS_API_KEY` was absent — so images never loaded if only `UNSPLASH_ACCESS_KEY` was set. Also returned `photographer` and `photographerUrl` fields that no consumer used.

**After:** Route calls `fetchCityImage(destination)` which tries Unsplash first, falls back to Pexels. Returns `{ url: string | null }`. Images now load from Unsplash alone if only `UNSPLASH_ACCESS_KEY` is set.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace destination-image route with fetchCityImage() helper | 53c79c8 | src/app/api/destination-image/route.ts |

## Verification

- `npx tsc --noEmit` exits 0
- `grep -n "fetchCityImage\|pexels" route.ts` shows fetchCityImage import, no inline Pexels fetch
- ActivityCard `photo_url` banner block confirmed present at lines 14, 33–36

## Deviations from Plan

None — plan executed exactly as written.

## User Action Required

To enable Pexels as Unsplash fallback, add to `.env.local`:

```
PEXELS_API_KEY=your_key_here
```

Free tier: https://www.pexels.com/api/

Images will load from Unsplash alone if `UNSPLASH_ACCESS_KEY` is set and `PEXELS_API_KEY` is not.

## Deferred Items

Pre-existing test failures (unrelated to this change, out of scope):
- `src/__tests__/hotel-card.test.tsx` — star rating test
- `src/__tests__/itinerary-detail.test.tsx` — map toggle tests, Eat & Drink tab
- `src/__tests__/api/schemas.test.ts` — AIResponseSchema flights/daily_food/duration fields
