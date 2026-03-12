---
phase: 11-visual-enrichment-and-trip-sharing
plan: "01"
subsystem: api-clients
tags: [unsplash, foursquare, places, tdd, photo-enrichment]
dependency_graph:
  requires: []
  provides: [fetchCityImage, fetchActivityImage, fetchPlacesData]
  affects: [src/lib/unsplash.ts, src/lib/places.ts]
tech_stack:
  added: [Foursquare Places API v3]
  patterns: [vi.stubGlobal fetch mocking, shared helper extraction, null-safe API clients]
key_files:
  created:
    - src/lib/places.ts
    - src/__tests__/api/unsplash.test.ts
    - src/__tests__/api/places.test.ts
  modified:
    - src/lib/unsplash.ts
decisions:
  - "fetchUnsplashImage() shared helper extracted — fetchCityImage and fetchActivityImage share identical API call logic; helper avoids >3 lines of duplication"
  - "vi.stubGlobal('fetch') with UNSPLASH_ACCESS_KEY set in beforeEach — ensures positive-case tests pass without per-test env var boilerplate"
  - "Foursquare fields=rating,price encoded as %2C by URLSearchParams — test uses regex /fields=rating(%2C|,)price/ to match both encoded and unencoded forms"
metrics:
  duration: "2min"
  completed_date: "2026-03-12"
  tasks_completed: 3
  files_changed: 4
---

# Phase 11 Plan 01: Unsplash API Migration + Foursquare Places Fetcher Summary

**One-liner:** Migrated dead `source.unsplash.com` to official Unsplash API with `fetchActivityImage()` fallback logic, and created `fetchPlacesData()` using Foursquare Places v3 with raw-key auth and 0-10 native rating scale.

## What Was Built

### src/lib/unsplash.ts (rewritten)
- `fetchCityImage(city)` — unchanged signature, now calls `api.unsplash.com/photos/random` with `Authorization: Client-ID {key}` header
- `fetchActivityImage(activityName, destination)` — new function; tries primary query `"{activityName} {destination}"` first, falls back to destination-only if primary fails
- `fetchUnsplashImage(query)` — private shared helper used by both exported functions; returns `urls.regular` or `null`
- Returns `null` immediately (no fetch attempt) when `UNSPLASH_ACCESS_KEY` is missing

### src/lib/places.ts (new)
- `fetchPlacesData(activityName, destination)` — calls `GET https://api.foursquare.com/v3/places/search?query={name}&near={destination}&limit=1&fields=rating,price`
- `Authorization` header uses raw `FOURSQUARE_API_KEY` value — no `Bearer` prefix (Foursquare v3 pattern)
- Returns `{ rating: number | null, priceLevel: number | null }` — rating on 0-10 scale, priceLevel 1-4
- Returns `{ rating: null, priceLevel: null }` on missing key, empty results, non-ok response, or fetch throw

### Test Coverage
- `src/__tests__/api/unsplash.test.ts` — 9 tests covering both Unsplash functions
- `src/__tests__/api/places.test.ts` — 9 tests covering fetchPlacesData
- All 18 tests pass; TypeScript clean

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test env var not set in fetchCityImage beforeEach**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** Tests for `fetchCityImage` positive cases returned null because `UNSPLASH_ACCESS_KEY` was not set in `beforeEach` — only in the test for "returns null when key not set"
- **Fix:** Added `process.env.UNSPLASH_ACCESS_KEY = 'test-key'` to `fetchCityImage` describe block `beforeEach`; also added cleanup in `afterEach` via `delete process.env.UNSPLASH_ACCESS_KEY`
- **Files modified:** `src/__tests__/api/unsplash.test.ts`
- **Commit:** 3ec51d8

**2. [Rule 1 - Bug] URLSearchParams encodes comma in fields param**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** Test asserted `url.toContain('fields=rating,price')` but `URLSearchParams` encodes comma as `%2C`, producing `fields=rating%2Cprice`
- **Fix:** Changed assertion to `url.toMatch(/fields=rating(%2C|,)price/)` to match both encoded and unencoded forms
- **Files modified:** `src/__tests__/api/places.test.ts`
- **Commit:** 3ec51d8

## Commits

| Hash | Type | Description |
|------|------|-------------|
| d34e1df | test | RED: add failing tests for Unsplash API migration and Foursquare Places fetcher |
| 3ec51d8 | feat | GREEN: implement Unsplash API migration and Foursquare Places data fetcher |

## Self-Check: PASSED

All created files found on disk. Both commits (d34e1df, 3ec51d8) confirmed in git log.
