---
phase: 09-itinerary-page-with-map-integration-and-hotel-details
plan: 04
subsystem: ui
tags: [react, next.js, maplibre, motion, tailwind, split-layout, itinerary]

# Dependency graph
requires:
  - phase: 09-itinerary-page-with-map-integration-and-hotel-details
    provides: ItineraryMap component with MapPin type and bidirectional flyTo, geocoding helper
  - phase: 08-ai-chat-functionality-with-openai-behavior-trip-state-itinerary-generation
    provides: activity data with activity_type='hotel', extra_data JSONB for hotel metadata

provides:
  - ItineraryHero — cover image hero with title/destination overlay using next/image fill
  - DayPillNav — horizontal scrollable pill nav with All Days + per-day pills
  - ActivityCard — motion.div with coral time badge, sequence number, location chip
  - HotelCard — navy hotel icon, star rating, check-in/out from extra_data
  - DaySection — redesigned timeline-style with dashed border, ActivityCard/HotelCard dispatch
  - itinerary/[id]/page.tsx — full premium split layout with sticky map, geocoding, bidirectional pin-card interaction
  - Mobile tab toggle between Itinerary list and Map

affects:
  - future itinerary features (collaborative editing, sharing)
  - any UI that renders activity cards or hotel information

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SSR-safe map import using dynamic() with ssr:false
    - Bidirectional pin-card interaction: pin click scrolls list, card click flies map
    - activity_type='hotel' sentinel drives HotelCard vs ActivityCard rendering
    - DayPillNav drives both list filter and map activeDay prop simultaneously
    - geocoding in useEffect after SWR data resolves, collecting resolved MapPin[]

key-files:
  created:
    - src/components/itinerary/ItineraryHero.tsx
    - src/components/itinerary/DayPillNav.tsx
    - src/components/itinerary/ActivityCard.tsx
    - src/components/itinerary/HotelCard.tsx
  modified:
    - src/components/itinerary/DaySection.tsx
    - src/app/(authenticated)/itinerary/[id]/page.tsx
    - src/__tests__/itinerary-detail.test.tsx

key-decisions:
  - "Title appears twice in rendered output (ItineraryHero h1 and inline-editable h1) — tests updated to use getAllByText"
  - "Day pills and section headers both show 'Day N' text — tests use getAllByText with regex matching"
  - "DaySection receives onEditActivity/onDeleteActivity props for backward compatibility even though new card components handle primary interaction"
  - "act() warnings from geocoding useEffect are harmless — they reflect async state updates in tests that don't affect test assertions"

patterns-established:
  - "Split layout: flex h-[calc(100vh-4rem)] overflow-hidden parent, overflow-y-auto left column, h-full right map column"
  - "SSR-safe map: const X = dynamic(() => import('@/components/itinerary/X'), { ssr: false })"
  - "Hotel sentinel: activity.activity_type === 'hotel' drives HotelCard, all others get ActivityCard"
  - "Inline hex colors for map pins to avoid blue-* Tailwind risk"

requirements-completed: [ITIN-01, ITIN-02, MAP-01, MAP-02, HOTEL-01, HERO-01]

# Metrics
duration: 6min
completed: 2026-03-11
---

# Phase 9 Plan 04: Itinerary Detail Page Full Premium Redesign Summary

**Teravue-inspired itinerary detail page: cover hero, sticky split-layout map, ActivityCard/HotelCard timeline, DayPillNav, and bidirectional pin-card interaction — all zero blue-* classes**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-11T20:35:39Z
- **Completed:** 2026-03-11T20:41:16Z
- **Tasks:** 2 (+ 1 auto-approved checkpoint)
- **Files modified:** 7

## Accomplishments

- Created four new itinerary components: ItineraryHero, DayPillNav, ActivityCard, HotelCard — all brand-compliant, zero blue-* classes
- Rewrote DaySection to use ActivityCard/HotelCard with timeline dashed border, coral day header accent
- Full rewrite of itinerary/[id]/page.tsx: split layout, geocoding useEffect, bidirectional pin-card interaction, mobile tab toggle, day filter

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ItineraryHero, DayPillNav, ActivityCard, HotelCard components** - `e32095d` (feat)
2. **Task 2: Redesign DaySection and full itinerary detail page with split layout** - `b67075b` (feat)

_Note: TDD tasks each had the components written after test scaffolds confirmed RED state_

## Files Created/Modified

- `src/components/itinerary/ItineraryHero.tsx` - Cover image hero with next/image fill, gradient overlay, title/destination in white font-serif
- `src/components/itinerary/DayPillNav.tsx` - Horizontal scrollable pill nav; "All Days" + per-day pills; navy active / sand+sky inactive
- `src/components/itinerary/ActivityCard.tsx` - motion.div card; coral time badge; 📍 location; sequence number circle
- `src/components/itinerary/HotelCard.tsx` - Sky background card; navy hotel icon; star rating (★); check-in/out from extra_data
- `src/components/itinerary/DaySection.tsx` - Redesigned: dashed border-l timeline, coral border-l day header, ActivityCard/HotelCard dispatch
- `src/app/(authenticated)/itinerary/[id]/page.tsx` - Full rewrite: split layout, geocoding useEffect, bidirectional pin-card, mobile tabs, DayPillNav
- `src/__tests__/itinerary-detail.test.tsx` - Updated for new layout: hero testid, mocks for next/image, next/dynamic, motion/react, geocoding

## Decisions Made

- Title appears in both ItineraryHero h1 and the inline-editable h1 below — tests use `getAllByText` instead of `getByText` to handle duplicates
- Day text ("Day 1") appears in DayPillNav pills AND DaySection headers — tests use `getAllByText` with regex `/Day N/`
- DaySection keeps `onEditActivity`/`onDeleteActivity` props for backward compatibility, though the new cards only dispatch `onActivityClick`
- `act()` warnings in tests are from the geocoding `useEffect` firing async `setMapPins` — they don't affect test pass/fail

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Test assertions had to be updated for dual title occurrences and dual "Day N" text occurrences — the new layout intentionally renders these in multiple places (hero + inline edit; pill + section header). Fixed by switching to `getAllByText` assertions.

## User Setup Required

None - no external service configuration required. Map rendering uses MapLibre free tiles via OpenFreeMap (no API key needed). Geocoding only fires if `NEXT_PUBLIC_MAPBOX_TOKEN` is set.

## Next Phase Readiness

- All Phase 9 itinerary UI components are complete
- Phase 9 plan 04 is the final execution plan; system is ready for QA / production use
- Cover image display requires `cover_image_url` populated in the DB (done by Phase 8 AI generation flow)
- Geocoding requires `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local` for pin placement

---
*Phase: 09-itinerary-page-with-map-integration-and-hotel-details*
*Completed: 2026-03-11*
