# Phase 9: Itinerary Page with Map Integration and Hotel Details - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning
**Source:** Inline user intent

<domain>
## Phase Boundary

Redesign the itinerary detail page into a premium, mindtrip.ai-inspired experience:
- Interactive map showing all activity/hotel locations for the trip
- Hotel details section surfaced alongside the day-by-day itinerary
- Complete visual overhaul using the Barabula brand palette (no blue anywhere)
- Split or tab layout so the map and itinerary coexist elegantly
- Production-grade frontend with high design quality — not a generic AI aesthetic

This phase does NOT include new backend data models beyond what Phase 8 already provides.

</domain>

<decisions>
## Implementation Decisions

### Visual Design (Locked)
- Reference: mindtrip.ai layout — split view with map on one side, itinerary on the other (or sticky map with scrollable itinerary beside it)
- Brand palette strictly enforced: navy `#285185`, coral `#D67940`, umber `#6F4849`, sky `#CCD9E2`, sand `#F5EDE3` — **no blue-* Tailwind classes**
- Typography: `font-logo` (Abril Fatface), `font-serif` (DM Serif Display), `font-sans` (Inter)
- Hero header with cover image (already stored via Unsplash in Phase 8) — full-bleed or large card
- Day pills / tabs for navigation between days without full page scroll
- Activity cards redesigned: richer cards with icon, time badge, location chip, description
- Map pins clustered by day or color-coded per day
- Immersive, editorial feel — not a utility app aesthetic

### Map Integration (Claude's Discretion for vendor, but research required)
- Research best map library for Next.js: Google Maps JS API, Mapbox GL JS, or react-map-gl / Leaflet
- Key requirement: show location pins for each activity AND hotels with distinct pin styles
- Clicking a pin on the map highlights the corresponding activity card (and vice versa)
- Map must work with activity `location` string field (geocoding required if lat/lng not stored)
- Consider: does Barabula need to store lat/lng in DB, or geocode on the fly?

### Hotel Details (Locked direction)
- Hotel section displayed in the itinerary — either as a special card type per day, or a dedicated "Accommodation" section
- Hotel name, star rating, check-in/check-out, address shown
- Phase 8 AI already generates hotel data in the itinerary schema — confirm field names from schemas.ts and ensure they're persisted to activities table or a separate hotels table
- Research: best approach to surface hotel data given current DB schema

### Layout Approach (Claude's Discretion for exact breakpoints)
- Desktop: sticky map (right or left ~40%) + scrollable itinerary list (~60%)
- Mobile: tab toggle between Map view and List view
- Sticky day header remains from Phase 3 (top-16 offset)

### Interaction (Locked direction)
- Pin-to-card and card-to-pin bidirectional highlight/focus
- Day filter on map (show only day N's pins)
- Smooth transitions using existing motion library

### Frontend Skills
- Use the `frontend-design` skill patterns: distinctive, production-grade, avoid generic AI aesthetics
- Apply composition patterns where appropriate

### Claude's Discretion
- Exact map vendor (must research licensing, Next.js compatibility, SSR safety)
- Geocoding strategy (on-the-fly vs. store lat/lng)
- Whether hotel data needs a schema migration or can be derived from existing activity records
- Specific animation timing and easing values
- Responsive breakpoints

</decisions>

<specifics>
## Specific Ideas

**Primary Design Reference:** Teravue itinerary page (user-provided screenshot, 2026-03-11)

Layout structure (adapt to Barabula palette):
- **Left panel (~50%):** Scrollable itinerary list on `sand` (`#F5EDE3`) background
  - Breadcrumb "← Itinerary Detail" + action icons (share, download, more) in top bar
  - Large title in `font-serif` (DM Serif Display), description in `font-sans`
  - Metadata chips: destination flag, dates, group size, budget — styled with `sky` border, `umber` text
  - Day selector dropdown (coral accent)
  - Timeline: vertical **dashed** line with numbered circles (coral `#D67940`) connecting cards
  - Activity cards: thumbnail image left, time + name + location + cost right, CTA button (`coral`) far right
  - Hotel check-in cards styled distinctly (special hotel icon, "per night" cost badge)
- **Right panel (~50%):** Full-height sticky map (dark tile style from MapLibre)
  - Route polyline in **coral** `#D67940` (not blue)
  - Numbered circle pins matching timeline numbers — coral fill, white text
  - Photo bubble floating at active/hovered pin (circular with white border)
  - Day navigation arrows top-right: "← Day 1 - Name →"
  - Route info card bottom-right: travel time, transport mode badge
  - Map controls: zoom +/-, compass

**Color translation (Teravue dark → Barabula warm):**
- Dark background panels → `sand` `#F5EDE3`
- Blue route line → `coral` `#D67940`
- Blue numbered pins → `coral` filled circles
- Blue CTA buttons → `coral` bg, white text
- Headings (white on dark) → `navy` `#285185` on sand
- Secondary text (grey) → `umber` `#6F4849`
- Map: use MapLibre with a light/neutral tile style OR keep dark for contrast
- Timeline dashed line → `sky` `#CCD9E2` with `coral` numbered nodes

**Interaction details from reference:**
- Clicking activity card → map flies to that pin, highlights it with photo bubble
- Clicking map pin → scrolls left panel to that activity card
- Day selector → filters both list and map to show only that day's activities
- Number badges in timeline align with map pin numbers (same sequence per day)

**Cover image:** Already fetched from Unsplash and stored in `cover_image_url` field (Phase 8). Use it as a hero banner at the top of the itinerary page.

**Current itinerary page** (`src/app/(authenticated)/itinerary/[id]/page.tsx`): Plain, uses `bg-gray-50`, has blue classes throughout — full redesign needed.

**Existing components to reuse or extend:**
- `DaySection` — redesign visual treatment
- `ActivityForm` — modal for add/edit, keep but restyle
- SWR data fetching already in place

**AI-generated schema (from Phase 8):** Activities have `location` string, `time`, `description`, `name`. Hotels may be embedded as special activity type or separate — MUST confirm from `src/lib/ai/schemas.ts`.

</specifics>

<deferred>
## Deferred Ideas

- Collaboration features on itinerary page (Phase 4 scope)
- Real-time concurrent editing
- Pre-defined global itinerary cards on landing (deferred per memory — needs real data first)
- ContextPanel itinerary click navigation (deferred per memory)
- Booking integration / actual hotel reservation flow

</deferred>

---

*Phase: 09-itinerary-page-with-map-integration-and-hotel-details*
*Context gathered: 2026-03-11 via inline user intent*
