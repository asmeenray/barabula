---
phase: 11-visual-enrichment-and-trip-sharing
plan: "03"
subsystem: api
tags: [enrichment, photos, places, sharing, supabase, rls, migration]
dependency_graph:
  requires: [11-01]
  provides: [11-04]
  affects: [src/app/api/chat/message/route.ts, src/app/api/itineraries/[id]/route.ts]
tech_stack:
  added: []
  patterns: [parallel-enrichment, anon-rls, public-share-flag]
key_files:
  created:
    - supabase/migrations/20260312100000_phase11_public_itinerary.sql
    - src/__tests__/api/itinerary-id.test.ts
  modified:
    - src/app/api/chat/message/route.ts
    - src/app/api/itineraries/[id]/route.ts
decisions:
  - is_public check done before auth gate in GET — single extra DB read avoids requiring auth just to determine publicity
  - Hotel activities skip both fetchActivityImage and fetchPlacesData — no meaningful place data for lodging
  - activityDestination derived from itineraryFields.destination ?? itineraryFields.title — consistent with existing cover image pattern
metrics:
  duration: 2min
  completed_date: "2026-03-12"
  tasks_completed: 2
  files_modified: 4
---

# Phase 11 Plan 03: Enrichment Pipeline + Public Itinerary API Summary

**One-liner:** Parallel Unsplash photo + Foursquare places enrichment wired into activity generation, plus is_public column with anon RLS and API toggle.

## What Was Built

### Task 1: DB Migration (commit f38676c)
Created `supabase/migrations/20260312100000_phase11_public_itinerary.sql` with:
- `ALTER TABLE public.itineraries ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false`
- RLS policy for anon role SELECT on itineraries where `is_public = true`
- RLS policy for anon role SELECT on activities of public itineraries (via subquery)

### Task 2: Enrichment pipeline + API update (commit d435349)

**chat/message/route.ts:**
- Added imports for `fetchActivityImage` and `fetchPlacesData`
- Replaced synchronous `days.flatMap(...)` with `await Promise.all(days.flatMap(day => day.activities.map(async (act) => ...)))` — parallel fetch per activity
- Hotel activities (`activity_type === 'hotel'`) skip both API calls, keeping hotel extra_data as-is
- Non-hotel activities store `photo_url`, `places_rating`, `places_price_level` in `extra_data` when returned non-null

**itineraries/[id]/route.ts:**
- GET handler performs `maybeSingle()` public check before auth gate — public itineraries return 200 without session
- PATCH handler accepts `is_public` boolean field — owners can toggle sharing

**itinerary-id.test.ts:** 5 new tests covering GET 401 (private, no auth), GET 200 (public, no auth), GET 200 (private, authenticated), PATCH 401 (no auth), PATCH is_public acceptance.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `ls supabase/migrations/ | grep phase11` — migration file confirmed present
- `npx vitest run src/__tests__/api/` — 44/44 tests pass (6 test files)
- `npx tsc --noEmit` — no TypeScript errors

## Self-Check: PASSED

- supabase/migrations/20260312100000_phase11_public_itinerary.sql — confirmed exists
- src/__tests__/api/itinerary-id.test.ts — confirmed exists
- src/app/api/chat/message/route.ts — confirmed modified (Promise.all + imports)
- src/app/api/itineraries/[id]/route.ts — confirmed modified (is_public check + PATCH field)
- Commits f38676c and d435349 — confirmed in git log
