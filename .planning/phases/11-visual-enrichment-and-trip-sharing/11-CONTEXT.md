# Phase 11: Visual Enrichment & Trip Sharing - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Close the three critical competitive gaps identified by the travel AI competitive analysis: (1) activity cards have no photos — itineraries read as formatted lists, not trips; (2) there's no way to share a trip with companions or the internet — zero viral loop; (3) activity cards have no real-world ratings or hours — no utility signal beyond the AI's text. This phase does NOT include PWA, real-time collaboration, booking affiliate links, or budget rollup — those belong in future phases.

</domain>

<decisions>
## Implementation Decisions

### Photos on Activity Cards

- **Source:** Unsplash Source URL — `https://source.unsplash.com/800x500/?{query}` (no API key required; same pattern as `fetchCityImage()` in `src/lib/unsplash.ts`)
- **Query:** Activity name + destination — e.g., `"Eiffel Tower Paris"`. Follows redirect to get stable URL for storage.
- **Fallback:** If Unsplash returns nothing for the activity query, fall back to destination-only query (e.g., `"Paris"`).
- **Placement:** Top of each activity card, full-width, ~160–200px tall. Same pattern as Twitter/Airbnb activity cards.
- **Storage:** `photo_url` stored in activity `extra_data` JSONB column (consistent with existing hotel metadata pattern from Phase 9). NOT a new column.
- **Fetch timing:** At AI generation time — when activities are inserted in the chat message route (`src/app/api/chat/message/route.ts`). Same flow as `cover_image_url` fetched before activity insert.
- **Scope:** Activity cards on the itinerary page AND destination cards on the landing page (`src/components/landing/DestinationCards.tsx` or equivalent). Both enriched in this phase.

### Shareable Trip Links

- **Privacy model:** Off by default. Owner enables sharing via a coral "Share" button in the itinerary page header. Simple `is_public` boolean column on `itineraries` table — DB migration required.
- **URL pattern:** `/itinerary/[id]?share=true` — the existing itinerary route, not a new route. The page component detects the `share=true` param, skips auth check for read operations, and renders in read-only mode.
- **Revocation:** Owner can toggle sharing off — sets `is_public = false`, immediately returns 403/404 for anyone with the old link.
- **What guests see:** Full itinerary — all days, activity cards (with photos + ratings), hotels, flights, map — read-only. No editing controls shown.
- **Acquisition CTA:** Sticky banner at the bottom for unauthenticated viewers: "Love this trip? Plan yours with Barabula" + Sign Up button (coral). Non-intrusive soft CTA, not a paywall.
- **Share button UX:** Clicking Share copies the URL to clipboard + shows a toast: "Link copied — anyone with this link can view your trip." If already shared, clicking again offers to disable sharing.

### Google Places Ratings

- **Data shown:** Star rating (e.g., ★ 4.6) + review count (e.g., 2,847 reviews). Displayed on activity cards below the photo.
- **API:** Google Places Text Search API — query by activity name + destination (e.g., "Eiffel Tower, Paris"). Uses the $200/month free credit (covers ~5,800 requests/month — sufficient for early-stage usage).
- **Fetch timing:** At AI generation time, alongside the photo fetch. Stored in activity `extra_data` JSONB.
- **Storage keys in extra_data:** `places_rating` (number), `places_review_count` (number), `places_price_level` (0–4 integer). Price level shown on cards as $ / $$ / $$$ / $$$$.
- **Fallback:** If Places Text Search returns no match, gracefully omit — card shows photo but no rating. No placeholder stars, no fake data.
- **No opening hours in Phase 11:** Ratings + price level only. Hours require a separate Places Details API call (additional cost). Defer hours to a future phase.

### Claude's Discretion
- Loading skeleton design for activity card photos
- Exact card photo aspect ratio and object-fit behavior
- Error handling for failed Unsplash or Places API calls (null-safe, fail silently)
- Whether to run photo + Places fetches in parallel or sequentially during itinerary generation

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/unsplash.ts` — `fetchCityImage(city)` already uses Unsplash Source URL pattern with redirect-follow to get stable URLs. Phase 11 extends this with `fetchActivityImage(activityName, destination)`.
- `src/app/api/chat/message/route.ts` — already calls `fetchCityImage()` and stores `cover_image_url` on the itinerary before inserting activities. Same insertion point for `photo_url` + Places data on each activity.
- `extra_data` JSONB column on `activities` table — already used for hotel metadata (Phase 9) and flight data (Phase 10). `photo_url`, `places_rating`, `places_review_count`, `places_price_level` follow the same pattern.
- `src/app/(authenticated)/itinerary/[id]/page.tsx` — the existing itinerary detail page. Phase 11 adds `?share=true` detection here to toggle read-only mode and unauthenticated access.

### Established Patterns
- Unsplash Source URL with `redirect: 'follow'` → store stable CDN URL in DB. Already proven in Phase 8.
- `extra_data` JSONB for activity enrichment — Phase 9 (hotel data) and Phase 10 (flight data) establish this as the extension pattern. No new columns needed for photo_url or Places data.
- Supabase Row Level Security — itineraries currently require auth. The `is_public` flag must be reflected in RLS policy: `SELECT` allowed when `is_public = true` (no auth required for public reads).

### Integration Points
- `activities` table `extra_data` JSONB — add `photo_url`, `places_rating`, `places_review_count`, `places_price_level` keys
- `itineraries` table — add `is_public` boolean column (default `false`). DB migration required.
- `src/app/api/chat/message/route.ts` — extend activity insertion loop to call `fetchActivityImage()` and Places Text Search per activity
- `src/app/(authenticated)/itinerary/[id]/page.tsx` — detect `?share=true`, bypass auth for public reads, render read-only mode
- `src/app/api/itineraries/[id]/route.ts` — PATCH endpoint to toggle `is_public`
- `src/components/landing/` — DestinationCards component for landing page photos
- Supabase RLS policy on `itineraries` — update to allow `SELECT` when `is_public = true`

</code_context>

<specifics>
## Specific Ideas

- "An itinerary is a formatted list, not a trip" without photos — the competitive research framing. Photos are the emotional trigger.
- Mindtrip shows photos, ratings, and a magazine-quality layout on every card. That's the visual bar.
- The Wanderlog share link is its documented primary growth mechanic — every shared link drives acquisition at zero cost. Replicate that mechanic.
- Soft CTA banner on shared view: "Love this trip? Plan yours with Barabula" — same tone as the brand, not aggressive.
- The strategic moat per research: AI-structured JSON + edit-in-place + persistence + sharing = Notion-for-travel-planning. This phase completes the "sharing" leg of that moat.

</specifics>

<deferred>
## Deferred Ideas

- **PWA (manifest + service worker)** — not in Phase 11; 2-week effort but standalone. Phase 12 candidate.
- **Opening hours** — Google Places Details API call (additional cost per request). Defer until usage justifies cost.
- **Booking affiliate links** — Booking.com/Viator links on activity cards. Low-effort, revenue-positive. Phase 12+ candidate.
- **Budget rollup display** — aggregate cost estimate across activities. Requires price data enrichment. Future phase.
- **Weather snippets** — weather forecast per day. Future phase.
- **Real-time collaboration** — Phase 4 in original roadmap (still pending).
- **Trip persistence dashboard improvements** — "My Trips" sidebar. Currently the Dashboard page exists; improvements deferred.
- **Vibe-first conversation opener** — "How do you want to feel?" before logistics questions. Noted in research as an improvement to the AI conversation entry point. Future AI phase.
- **Native iOS app** — Tier 3 strategic bet per research.

</deferred>

---

*Phase: 11-visual-enrichment-and-trip-sharing*
*Context gathered: 2026-03-12*
