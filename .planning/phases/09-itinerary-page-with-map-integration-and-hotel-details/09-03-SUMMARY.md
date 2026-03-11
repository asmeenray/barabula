---
phase: 09-itinerary-page-with-map-integration-and-hotel-details
plan: 03
subsystem: ui
tags: [react-map-gl, maplibre-gl, mapbox, geocoding, testing, vitest]

# Dependency graph
requires:
  - phase: 09-itinerary-page-with-map-integration-and-hotel-details
    provides: Activity types, itinerary structure, brand palette enforcement

provides:
  - react-map-gl + maplibre-gl installed and importable
  - ItineraryMap component (SSR-safe, use client) with coral/navy branded pins
  - geocoding.ts with extra_data cache-first + Mapbox API fallback
  - next.config.ts Unsplash remotePatterns for next/image
  - Wave 0 test scaffolds: itinerary-map, day-pill-nav, hotel-card, itinerary-hero

affects:
  - 09-04-PLAN (ItineraryMap and MapPin type consumer)
  - DayPillNav component (test contract defined)
  - HotelCard component (test contract defined)
  - ItineraryHero component (test contract defined)

# Tech tracking
tech-stack:
  added:
    - react-map-gl@8.1.0 (MapLibre-backed map component for React)
    - maplibre-gl@5.20.0 (open-source GL map renderer, free tiles)
  patterns:
    - "'use client' required for maplibre CSS import — never import maplibre CSS in server components"
    - "OpenFreeMap tile URL (https://tiles.openfreemap.org/styles/liberty) — free, no API key"
    - "vi.mock('react-map-gl/maplibre') pattern for jsdom-safe map testing"
    - "extra_data cache-first geocoding: check cached lat/lng before Mapbox API call"
    - "inline style (not Tailwind) for map pin colors — brand hex values (#D67940, #285185)"

key-files:
  created:
    - src/components/itinerary/ItineraryMap.tsx
    - src/lib/geocoding.ts
    - src/__tests__/itinerary-map.test.tsx
    - src/__tests__/day-pill-nav.test.tsx
    - src/__tests__/hotel-card.test.tsx
    - src/__tests__/itinerary-hero.test.tsx
  modified:
    - next.config.ts (added Unsplash + Google remotePatterns)
    - package.json (react-map-gl, maplibre-gl added)

key-decisions:
  - "react-map-gl v8.1 used with /maplibre endpoint — no Mapbox API key required for rendering"
  - "OpenFreeMap liberty style chosen for map tiles — free, no API key, good aesthetics"
  - "Inline styles (not Tailwind) for pin colors — brand hex enforced without blue-* risk"
  - "extra_data cache-first geocoding avoids repeated Mapbox API calls for previously resolved coordinates"
  - "lh3.googleusercontent.com added alongside images.unsplash.com in remotePatterns — needed for Google avatar"
  - "Wave 0 scaffold pattern: test files created before components — DayPillNav, HotelCard, ItineraryHero scaffolds define API contracts for Plan 04"

patterns-established:
  - "Map components always 'use client' with CSS import inside the client file"
  - "Pin interaction uses inline transform scale(1.25) for active state — smooth 0.2s ease transition"
  - "flyTo({duration: 800}) on activeActivityId change via mapRef for animated camera movement"

requirements-completed:
  - MAP-01
  - MAP-02

# Metrics
duration: 5min
completed: 2026-03-11
---

# Phase 09 Plan 03: Map Library Setup and ItineraryMap Component Summary

**MapLibre-backed ItineraryMap component with coral/navy brand pins, extra_data-cached geocoding helper, and Wave 0 test scaffolds for DayPillNav, HotelCard, and ItineraryHero**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-11T20:29:51Z
- **Completed:** 2026-03-11T20:34:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Installed react-map-gl@8.1.0 and maplibre-gl@5.20.0 — MapLibre rendering, no Mapbox API key needed for tiles
- Created SSR-safe `ItineraryMap` component with coral activity pins, navy hotel pins, flyTo animation, NavigationControl
- Created `geocoding.ts` with extra_data cache-first lookup, then Mapbox API v6 forward geocoding with destination context
- Configured next.config.ts Unsplash + Google remotePatterns for next/image
- Created four Wave 0 test scaffolds defining API contracts for Plan 04 components

## Task Commits

Each task was committed atomically:

1. **Task 1: Install libraries, configure next.config, geocoding helper, test scaffolds** - `156fda4` (feat)
2. **Task 2: Create ItineraryMap component** - `10071eb` (feat)

## Files Created/Modified
- `src/components/itinerary/ItineraryMap.tsx` - SSR-safe map component, exports MapPin type, coral/navy pins with active scale animation
- `src/lib/geocoding.ts` - resolveActivityCoordinates with extra_data cache + Mapbox API v6 fallback
- `next.config.ts` - Unsplash and Google remotePatterns for next/image
- `package.json` / `package-lock.json` - react-map-gl, maplibre-gl added to dependencies
- `src/__tests__/itinerary-map.test.tsx` - MAP-01 scaffold; vi.mock for react-map-gl/maplibre; passes
- `src/__tests__/day-pill-nav.test.tsx` - MAP-02 scaffold; DayPillNav API contract; fails with module-not-found (expected)
- `src/__tests__/hotel-card.test.tsx` - HOTEL-01 scaffold; HotelCard API contract; fails with module-not-found (expected)
- `src/__tests__/itinerary-hero.test.tsx` - HERO-01 scaffold; ItineraryHero API contract; fails with module-not-found (expected)

## Decisions Made
- Used react-map-gl v8.1 with `/maplibre` endpoint — MapLibre is free and open-source, no Mapbox API key needed for map rendering
- OpenFreeMap liberty style tile URL — free hosted tiles with good aesthetics, no registration required
- Inline styles (hex values) for pin colors — avoids any risk of Tailwind blue-* class violations for brand compliance
- Added `lh3.googleusercontent.com` to remotePatterns alongside Unsplash — pre-existing Google avatar usage would break without it (Rule 2 auto-add)
- Wave 0 scaffolds define test contracts before components exist — DayPillNav, HotelCard, ItineraryHero tests will pass once Plan 04 creates those components

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added lh3.googleusercontent.com to next.config.ts remotePatterns**
- **Found during:** Task 1 (updating next.config.ts)
- **Issue:** Plan only specified Unsplash. Google avatar images (lh3.googleusercontent.com) are already used in ProfileDropdown — omitting would break existing authenticated layouts
- **Fix:** Added `{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }` alongside Unsplash pattern
- **Files modified:** next.config.ts
- **Verification:** Pattern present in file
- **Committed in:** 156fda4 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Necessary addition to prevent breaking existing Google avatar images. No scope creep.

## Issues Encountered
None — plan executed cleanly. Wave 0 test scaffolds for DayPillNav, HotelCard, ItineraryHero correctly fail with "Cannot find module" as expected (components don't exist until Plan 04).

## User Setup Required
The geocoding helper (`src/lib/geocoding.ts`) uses `NEXT_PUBLIC_MAPBOX_TOKEN`. Add this env var to your `.env.local` and Vercel project settings to enable geocoding:

1. Visit https://account.mapbox.com — go to Access tokens
2. Create a token restricted to your domain
3. Add `NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here` to `.env.local`

Note: The map renders tiles from OpenFreeMap without any API key. The Mapbox token is only needed for activity geocoding (resolving location names to lat/lng coordinates).

## Next Phase Readiness
- `ItineraryMap` and `MapPin` type are ready for import by Plan 04
- `geocoding.ts` ready for use in itinerary data fetch pipeline
- Wave 0 scaffolds define DayPillNav, HotelCard, ItineraryHero API contracts for Plan 04 to fulfill
- All requirements MAP-01 and MAP-02 verified complete

---
*Phase: 09-itinerary-page-with-map-integration-and-hotel-details*
*Completed: 2026-03-11*
