# Phase 9: Itinerary Page with Map Integration and Hotel Details - Context

**Gathered:** 2026-03-11 (updated 2026-03-11 with performance + glassmorphism requirements)
**Status:** Ready for planning
**Source:** Inline user intent + revision

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

### Visual Design (Locked — Updated with Glassmorphism)
- **Glassmorphism required** — design should match the landing hero page aesthetic: frosted glass panels, backdrop-blur, soft shadows, semi-transparent overlays
- Reference: landing hero page glassmorphism style (`backdrop-blur-sm`, `bg-white/10`, `border border-white/20`, layered translucency)
- Use `frontend-design` skill patterns: distinctive, production-grade, not generic AI aesthetic
- Brand palette strictly enforced: navy `#285185`, coral `#D67940`, umber `#6F4849`, sky `#CCD9E2`, sand `#F5EDE3` — **no blue-* Tailwind classes**
- Typography: `font-logo` (Abril Fatface), `font-serif` (DM Serif Display), `font-sans` (Inter)
- Hero header with cover image (already stored via Unsplash in Phase 8) — full-bleed hero with glassmorphism overlay for title/metadata
- Day pills / tabs for navigation between days — glass-style pills with blur effect
- Activity cards redesigned: glass-morphism cards with backdrop-blur, soft border, icon, time badge, location chip
- Map pins color-coded per day with coral as primary
- Immersive, editorial feel — modern, premium travel app aesthetic

### Map Integration (Updated — Lazy Load Required)
- **Map is NOT shown by default** — map is hidden on page load to avoid slow pin-loading delay
- A **"Show Map" button** (coral, prominent) is visible in the itinerary header area
- Clicking "Show Map" mounts the map component and begins geocoding pins
- This completely solves the slow pin loading UX issue — user opts in when ready
- Map vendor: `react-map-gl` + `maplibre-gl` (already researched — open-source, no billing)
- Key requirement: show location pins for each activity AND hotels with distinct pin styles
- Clicking a pin on the map highlights the corresponding activity card (and vice versa)
- Map must work with activity `location` string field (geocoding required if lat/lng not stored)
- Geocode results cached to `extra_data` JSONB to avoid re-geocoding on repeat views
- On mobile: "Show Map" toggles a full-screen map overlay (not a split panel)

### Hotel Details (Locked direction)
- Hotel section displayed in the itinerary — either as a special card type per day, or a dedicated "Accommodation" section
- Hotel name, star rating, check-in/check-out, address shown
- Phase 8 AI already generates hotel data in the itinerary schema — confirm field names from schemas.ts and ensure they're persisted to activities table or a separate hotels table
- Research: best approach to surface hotel data given current DB schema

### Layout Approach (Updated — Map Hidden by Default)
- **Default view:** Full-width scrollable itinerary list (no split layout initially)
- **"Show Map" button** in the itinerary header (coral, with map icon) toggles the map panel
- When map is shown on desktop: split layout — scrollable itinerary list (~60%) + sticky map panel (~40%)
- When map is shown on mobile: map slides in as a full-screen overlay with a "Close Map" X button
- "Show Map" button becomes "Hide Map" when map is visible
- Sticky day header remains from Phase 3 (top-16 offset)

### Interaction (Locked direction)
- Pin-to-card and card-to-pin bidirectional highlight/focus
- Day filter on map (show only day N's pins)
- Smooth transitions using existing motion library

### Frontend Skills (Locked)
- **Use the `frontend-design` skill** when implementing the itinerary page and components — invoke it to get production-grade glassmorphism component designs
- Apply composition patterns for complex components (DaySection, ActivityCard, HotelCard)
- Glassmorphism reference from landing hero: `backdrop-blur-sm`, `bg-white/10`, `bg-white/20`, `border-white/20`, `shadow-xl`, layered gradients on cover images
- Apply composition patterns where appropriate

### Claude's Discretion
- Map vendor already decided: `react-map-gl` + `maplibre-gl` (from prior research)
- Geocoding strategy: on-the-fly with DB caching to `extra_data` JSONB
- Whether hotel data needs a schema migration or can be derived from existing activity records
- Exact glassmorphism values (blur amount, opacity levels) — match landing hero feel
- Specific animation timing and easing values
- Responsive breakpoints

</decisions>

<specifics>
## Specific Ideas

**Primary Design Reference:** Landing hero glassmorphism style + Teravue itinerary layout

**Glassmorphism application:**
- Hero banner: full-bleed cover image with gradient overlay (`from-navy/70 via-navy/30 to-transparent`), title in glass card (`bg-white/10 backdrop-blur-sm border border-white/20`)
- Activity cards: glass effect on `sand` background — `bg-white/60 backdrop-blur-sm border border-white/40 shadow-sm hover:shadow-md hover:bg-white/80`
- Hotel cards: slightly different glass — `bg-navy/5 backdrop-blur-sm border border-navy/10` with star rating pill
- Day pill nav: `bg-white/40 backdrop-blur-sm` pills, active state `bg-navy text-white shadow-md`
- "Show Map" button: coral with glass shimmer — `bg-coral text-white shadow-lg hover:shadow-coral/30`

**Layout structure (default: full-width, no map):**
- Full-width scrollable itinerary list on `sand` (`#F5EDE3`) background
- Breadcrumb "← My Trips" in top bar
- Hero: full-bleed cover image with glassmorphism title overlay
- Metadata chips below hero: destination, dates, group size — `bg-white/60 backdrop-blur-sm` pills
- **"Show Map" coral button** in hero or sticky header
- Day pill nav (horizontal scrollable)
- Timeline: vertical dashed line with numbered coral circles connecting glass activity cards
- Hotel check-in cards styled distinctly with hotel icon
- When map shown: list shifts to ~60% width, map panel appears at ~40% (sticky)

**Map panel (shown on demand):**
- Lazy mounted via `dynamic(() => import(...), { ssr: false })` — no load until user clicks "Show Map"
- Coral route polyline (not blue)
- Numbered circle pins (coral fill, white text)
- Map controls: zoom +/-, compass
- "Hide Map" X button in corner

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
