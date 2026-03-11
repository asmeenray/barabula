---
phase: 09-itinerary-page-with-map-integration-and-hotel-details
verified: 2026-03-11T20:45:00Z
status: human_needed
score: 9/9 must-haves verified
re_verification: false
human_verification:
  - test: "Navigate to an itinerary detail page in the browser"
    expected: "Cover image hero fills the top with white font-serif title overlay; page background is sand (#F5EDE3); breadcrumb '← My Trips' appears below hero"
    why_human: "Visual layout correctness cannot be verified programmatically"
  - test: "Verify the split layout: left panel scrolls while the right map panel stays fixed"
    expected: "Left list panel scrolls independently; right map panel stays sticky at full viewport height; no layout breaks"
    why_human: "Sticky/overflow layout behavior requires browser rendering to verify"
  - test: "Click 'Day 1' pill in the day pill nav"
    expected: "Itinerary list filters to show only Day 1 activities; map panel also filters to Day 1 pins only"
    why_human: "Bidirectional state wiring between DayPillNav and ItineraryMap requires runtime interaction to verify"
  - test: "Click an activity card in the itinerary list"
    expected: "The map flies/animates to that activity's pin; the clicked pin scales up (1.25x); the card shows coral ring highlight"
    why_human: "Map flyTo animation and active pin visual state require live rendering"
  - test: "Click a map pin"
    expected: "The itinerary list scrolls to the corresponding activity card (smooth scroll); card shows coral highlight"
    why_human: "scrollIntoView behavior and card highlight require runtime DOM interaction"
  - test: "On mobile viewport (< 768px), verify the tab toggle"
    expected: "'Itinerary' and 'Map' tabs appear at top; toggling shows/hides the correct panel; no layout overflow"
    why_human: "Responsive breakpoint behavior requires viewport resizing in a browser"
  - test: "Verify hotel cards display for activities with activity_type='hotel'"
    expected: "Hotel card shows 🏨 icon, hotel name from extra_data.hotel_name, star rating as ★ characters, check-in/out dates in umber text"
    why_human: "Requires an itinerary with hotel activities in the database — data-dependent"
  - test: "Map renders with OpenFreeMap tiles (no API key needed)"
    expected: "Map tiles load and display correctly; coral pins appear for geocoded activities; navy pins for hotel activities (requires NEXT_PUBLIC_MAPBOX_TOKEN for geocoding)"
    why_human: "Tile loading and geocoding are network-dependent; cannot verify in tests"
---

# Phase 9: Itinerary Page with Map Integration and Hotel Details — Verification Report

**Phase Goal:** Build the itinerary detail page with map integration, hotel details, and premium Teravue-inspired split layout UI
**Verified:** 2026-03-11T20:45:00Z
**Status:** human_needed (all automated checks passed; 8 items require human/browser verification)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | AI-generated itineraries include hotel accommodation data per day | VERIFIED | `schemas.ts` activity object has `activity_type`, `hotel_name`, `star_rating`, `check_in`, `check_out` — all `.nullable()`; trip-planner.ts has Hotel Accommodation Rules section |
| 2 | Hotel activities are persisted to DB with activity_type='hotel' and hotel metadata in extra_data | VERIFIED | `message/route.ts` line 127-135: `activity_type: act.activity_type ?? null`, `extra_data: act.activity_type === 'hotel' ? { hotel_name, star_rating, check_in, check_out } : {}` |
| 3 | No blue-* Tailwind classes in any itinerary or Phase 9 file | VERIFIED | `grep -rn "blue-" src/app/(authenticated)/itinerary/ src/components/itinerary/` returns no output |
| 4 | react-map-gl and maplibre-gl are installed and importable | VERIFIED | `package.json` lines 15, 21: `"maplibre-gl": "^5.20.0"`, `"react-map-gl": "^8.1.0"` |
| 5 | ItineraryMap component renders SSR-safe with coral/navy pins | VERIFIED | `ItineraryMap.tsx`: `'use client'` at top; imports from `react-map-gl/maplibre`; inline hex colors `#D67940` (coral) for activity pins, `#285185` (navy) for hotel pins |
| 6 | Geocoding helper checks extra_data cache before calling Mapbox API | VERIFIED | `geocoding.ts` lines 7-9: checks `cached?.lat && cached?.lng` before calling Mapbox API |
| 7 | Itinerary detail page has Teravue-inspired split layout with hero, sticky map, scrollable list | VERIFIED | `itinerary/[id]/page.tsx`: `ItineraryHero` rendered, split layout `flex h-[calc(100vh-4rem)] overflow-hidden`, left `overflow-y-auto`, right `h-full`, ItineraryMap dynamically imported |
| 8 | DayPillNav filters both list and map; hotel/activity cards render correctly | VERIFIED | `DaySection.tsx` dispatches `HotelCard` for `activity_type === 'hotel'`, `ActivityCard` for all others; `page.tsx` passes `activeDay` to both `DayPillNav` and `ItineraryMap` |
| 9 | All Phase 9 tests pass | VERIFIED | 9/9 tests pass across `itinerary-detail.test.tsx`, `itinerary-map.test.tsx`, `day-pill-nav.test.tsx`, `hotel-card.test.tsx`, `itinerary-hero.test.tsx` |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/ai/schemas.ts` | AIResponseSchema with hotel fields | VERIFIED | `activity_type`, `hotel_name`, `star_rating`, `check_in`, `check_out` all present and `.nullable()` |
| `src/lib/types.ts` | Activity type with extra_data field | VERIFIED | `extra_data: Record<string, unknown> \| null` on line 10; `GeneratedItinerary` has optional hotel fields |
| `src/app/api/chat/message/route.ts` | Hotel extra_data persistence on insert | VERIFIED | Lines 127-135 persist `activity_type` and hotel `extra_data` |
| `src/lib/ai/prompts/trip-planner.ts` | Hotel instructions in system prompt | VERIFIED | `## Hotel Accommodation Rules` section present with full hotel instructions |
| `src/components/itinerary/ItineraryMap.tsx` | MapLibre map with coral/navy pins, SSR-safe | VERIFIED | `'use client'`, exports `MapPin` type, `react-map-gl/maplibre`, inline hex pin colors, `flyTo` on `activeActivityId`, `NavigationControl` |
| `src/lib/geocoding.ts` | Geocoding helper with extra_data cache | VERIFIED | `resolveActivityCoordinates` with cache-first check, Mapbox API v6 fallback |
| `next.config.ts` | Unsplash and Google remotePatterns | VERIFIED | Both `images.unsplash.com` and `lh3.googleusercontent.com` in remotePatterns |
| `src/components/itinerary/ItineraryHero.tsx` | Cover image hero with title/destination overlay | VERIFIED | `data-testid="itinerary-hero"`, `next/image` with `fill`, gradient overlay, `font-serif text-white` title, `text-sky` destination |
| `src/components/itinerary/DayPillNav.tsx` | Scrollable day pills with coral active state | VERIFIED | `overflow-x-auto`, "All Days" pill + per-day pills, `bg-navy text-white` active, `bg-sand text-umber border-sky` inactive |
| `src/components/itinerary/ActivityCard.tsx` | Rich activity card with coral time badge | VERIFIED | `motion.div` with `layout`, coral sequence circle, `bg-coral/10 text-coral` time badge, `text-umber` location, `line-clamp-2` description |
| `src/components/itinerary/HotelCard.tsx` | Hotel card with star rating and check-in/out | VERIFIED | Reads `extra_data.hotel_name`, `star_rating` as `★`.repeat(), `check_in`/`check_out` text, `bg-sky/10` background |
| `src/components/itinerary/DaySection.tsx` | Timeline-style day section dispatching both card types | VERIFIED | `border-l-2 border-dashed border-sky` timeline, `border-l-4 border-coral` day header, dispatches `HotelCard`/`ActivityCard` by `activity_type`, each wrapped with `id="activity-{id}"` |
| `src/app/(authenticated)/itinerary/[id]/page.tsx` | Full split layout page with geocoding and bidirectional interaction | VERIFIED | Dynamic map import, geocoding `useEffect`, `handlePinClick` scrolls list, `handleCardClick` sets active activity, `activeDay` passed to both nav and map, mobile tab toggle |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `schemas.ts` | `message/route.ts` | `AIResponseSchema` in `zodResponseFormat` | WIRED | Line 4: `import { AIResponseSchema, zodResponseFormat }`, line 48: `zodResponseFormat(AIResponseSchema, 'ai_response')` |
| `message/route.ts` | `activities` DB table | `extra_data` in activities insert | WIRED | Lines 119-137: flatMap with `activity_type` and `extra_data` fields on every insert |
| `itinerary/[id]/page.tsx` | `ItineraryMap.tsx` | `dynamic()` with `ssr: false` | WIRED | Line 18: `const ItineraryMap = dynamic(() => import('@/components/itinerary/ItineraryMap'), { ssr: false })` |
| `itinerary/[id]/page.tsx` | `geocoding.ts` | `resolveActivityCoordinates` called in useEffect | WIRED | Line 13 import; line 86: `await resolveActivityCoordinates(act, data.destination ?? null)` |
| `DaySection.tsx` | `ActivityCard.tsx` | Renders for `activity_type !== 'hotel'` | WIRED | Lines 1, 51: imported and used for non-hotel activities |
| `DaySection.tsx` | `HotelCard.tsx` | Renders for `activity_type === 'hotel'` | WIRED | Lines 2, 40: imported and used when `activity.activity_type === 'hotel'` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| HOTEL-01 | 09-01, 09-04 | Hotel accommodation data in AI schema and rendered as HotelCard | SATISFIED | `schemas.ts` hotel fields; `message/route.ts` hotel persistence; `HotelCard.tsx` renders from `extra_data` |
| BLUE-01 | 09-02 | No blue-* Tailwind classes in itinerary files | SATISFIED | `grep -rn "blue-"` returns no output across all itinerary files |
| MAP-01 | 09-03, 09-04 | MapLibre map renders in itinerary detail page | SATISFIED | `ItineraryMap.tsx` exists, `'use client'`, uses `react-map-gl/maplibre`; dynamically imported in page |
| MAP-02 | 09-03, 09-04 | Day pill nav filters map and list to active day | SATISFIED | `DayPillNav.tsx` calls `onDayChange`; page passes `activeDay` to both `DayPillNav` and `ItineraryMap` |
| ITIN-01 | 09-04 | Itinerary detail page shows day-by-day structured view | SATISFIED | `DaySection` renders per-day with `DayPillNav`, backed by `groupByDay()`; test confirms days render |
| ITIN-02 | 09-04 | Each day shows activities with name, time, description, location | SATISFIED | `ActivityCard.tsx` renders all four fields; test confirms `Senso-ji Temple` and `Shibuya Crossing` render |
| HERO-01 | 09-03, 09-04 | Cover image hero with title overlay | SATISFIED | `ItineraryHero.tsx`: `next/image fill`, gradient overlay, `font-serif text-white` title, test confirms `data-testid="itinerary-hero"` renders |

**Note on requirement IDs:** HOTEL-01, BLUE-01, MAP-01, MAP-02, and HERO-01 are Phase 9-specific requirement IDs defined in ROADMAP.md. They do not appear in the central REQUIREMENTS.md (which uses a different naming scheme). This is by design — they are phase-local requirements added at roadmap time. ITIN-01 and ITIN-02 appear in REQUIREMENTS.md mapped to Phase 3 (original implementation); Phase 9 enhances them with the premium redesign. No orphaned requirements found.

### Anti-Patterns Found

No anti-patterns detected. Scanned all new and modified Phase 9 files for:
- TODO/FIXME/PLACEHOLDER comments — none found
- Empty implementations (`return null`, `return {}`, `return []`) — none found
- Stub handlers (`onClick={() => {}}`) — none found
- Blue-* Tailwind violations — none found

### Human Verification Required

#### 1. Cover Image Hero Visual

**Test:** Run `npm run dev`, navigate to `/itinerary/{id}` for any existing itinerary
**Expected:** Full-bleed cover image (or navy fallback) fills the top; white `font-serif` title overlaid on gradient; destination in sky-colored text below
**Why human:** Visual correctness of gradient overlay, font rendering, and `next/image fill` layout requires browser rendering

#### 2. Split Layout Scroll/Sticky Behavior

**Test:** On the itinerary detail page, scroll the left list panel
**Expected:** Left panel scrolls through all day sections; right map panel stays fixed at full viewport height throughout; no content overflow or layout breaks
**Why human:** CSS `overflow-hidden` + `overflow-y-auto` + `h-full` sticky layout requires browser rendering to verify — jsdom does not simulate scrolling

#### 3. Day Pill Filtering

**Test:** Click "Day 1" pill, then "Day 2" pill, then "All Days"
**Expected:** Itinerary list shows only the selected day's activities; map visible pins also filter to match the selected day
**Why human:** Requires live React state interaction in a browser

#### 4. Card-to-Pin Interaction (Activity Card Click)

**Test:** Click any activity card in the list
**Expected:** Map animates (flyTo, 800ms) to that activity's map pin; pin scales to 1.25x; card shows coral `ring-1 ring-coral/20` highlight
**Why human:** MapLibre flyTo animation, pin scale transform, and card active state require live map rendering

#### 5. Pin-to-Card Interaction (Map Pin Click)

**Test:** Click a map pin (requires geocoded activities — needs `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`)
**Expected:** Corresponding activity card in the left panel scrolls into view (smooth); card receives coral highlight border
**Why human:** `scrollIntoView` and map pin click require live DOM and map interaction

#### 6. Mobile Tab Toggle

**Test:** Set viewport to < 768px (mobile), navigate to itinerary detail
**Expected:** "Itinerary" and "Map" tabs appear at top; clicking "Map" hides the list and shows the full-viewport map; "Itinerary" restores the list
**Why human:** Responsive breakpoint behavior requires viewport resizing; jsdom does not support CSS media queries

#### 7. Hotel Card Display

**Test:** Generate a new itinerary via AI chat (triggers hotel generation), then view it on the itinerary detail page
**Expected:** A hotel card with 🏨 icon, hotel name, ★ star rating, and "Check-in: ... · Check-out: ..." text appears once per day
**Why human:** Requires a live itinerary in the database with `activity_type='hotel'` activities populated by the new AI schema

#### 8. Map Tile Rendering and Geocoded Pins

**Test:** With `NEXT_PUBLIC_MAPBOX_TOKEN` set in `.env.local`, open an itinerary detail page
**Expected:** OpenFreeMap tiles load in the right panel; coral pins appear for activity locations; navy pins for hotel locations; no console errors
**Why human:** Network requests for map tiles (OpenFreeMap) and geocoding (Mapbox API) cannot be verified without live services

## Commits Verified

All 8 documented task commits exist in the repository:
- `b3c7ddc` — feat(09-01): extend AIResponseSchema and types with hotel fields
- `c6c01c0` — feat(09-01): update AI prompt and message route for hotel persistence
- `f516e7e` — fix(09-02): replace blue-* violations with brand colors in itinerary pages
- `41ed46a` — fix(09-02): replace blue-* violations with brand colors in itinerary components
- `156fda4` — feat(09-03): install map libraries, configure next.config, geocoding helper, Wave 0 test scaffolds
- `10071eb` — feat(09-03): create ItineraryMap component with SSR-safe MapLibre integration
- `e32095d` — feat(09-04): create ItineraryHero, DayPillNav, ActivityCard, HotelCard components
- `b67075b` — feat(09-04): redesign DaySection and itinerary detail page with split layout

---

_Verified: 2026-03-11T20:45:00Z_
_Verifier: Claude (gsd-verifier)_
