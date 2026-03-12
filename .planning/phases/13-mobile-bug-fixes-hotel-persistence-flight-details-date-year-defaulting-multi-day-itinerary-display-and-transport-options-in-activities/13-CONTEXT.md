# Phase 13: Bug fixes — Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix 6 confirmed bugs and add transport context enrichment to activities. Bugs affect both desktop and mobile:

1. **Hotel tab state persistence** — saved hotel disappears when user navigates away and comes back to the tab
2. **Multi-day itinerary display** — only Day 1 shows on the itinerary page; other days are missing (visible in chat text but not in structured output)
3. **Date year defaulting** — AI defaults to 2023/2024 when user omits the year (e.g. "3rd March to 5th March")
4. **Flight time fields** — departure_time and arrival_time often come back null even when origin/destination are known
5. **Activity/cover images not loading** — Pexels API key missing from .env.local; `destination-image` route uses Pexels only (no Unsplash fallback); activity photo banners not displayed on activity cards
6. **Transport options** — activity descriptions need richer multi-modal transport info; add "getting around" chip to intake

This phase does NOT include: live flight booking, real-time pricing, Google Flights API integration.

</domain>

<decisions>
## Implementation Decisions

### Hotel tab state persistence
- When user re-opens the Hotel tab, **fully restore previous state**: mode (Suggest / I have one), preference text, AND the found-hotel card if a specific hotel was previously searched
- The found-hotel card should show already-selected (with checkmark) — no re-lookup needed
- Store all hotel state in parent React state (`hotelSaveData` already exists in `chat/page.tsx`); pass the full `HotelSaveData` + found hotel object back to `HotelsTabPanel` as props
- Persistence is **same session only** (React state) — not persisted to Supabase; consistent with how flight data works

### Multi-day display fix
- Fix approach: **tighten the AI prompt** with an explicit rule — "The days[] array MUST include ALL days from day 1 to duration_days. Never truncate the days array even if the response is long."
- Also add a **server-side validation** in the API route: after parsing, check if `days.length < duration_days` and log a warning; return a `partialItinerary: true` flag in the response if mismatch detected
- Consider also making activity descriptions in the structured JSON slightly more concise to reduce token pressure (while keeping the prose reply rich)

### Date year defaulting
- Add `Current date: ${new Date().toISOString().split('T')[0]}` to the system prompt (injected at runtime in `buildSystemPrompt`)
- Add explicit AI rule: "If the user mentions dates without a year, always assume the current year unless the resulting date has already passed — in that case, use the next year."

### Flight time fields
- Strengthen the AI prompt's Flights Rules section: "departure_time and arrival_time MUST be non-null when origin and destination are both known. Use realistic times for the route (e.g. morning departure for short-haul, red-eye for long-haul)."
- Add Google Flights deep link in the **Flights tab panel** in the chat — always visible regardless of whether fields are filled
  - Format: `https://www.google.com/travel/flights?q=flights+from+{origin}+to+{destination}+on+{date}` (pre-fill with available trip state)
  - Show as a subtle link/button: "Search on Google Flights →"
- Flight and hotel data saved by the user **must be reliably used by the AI** when generating the itinerary — verify `buildUserProvidedContext()` in `system-prompt.ts` is correctly injected and strengthen the prompt instructions to make it clear the AI should prioritize user-provided over AI-suggested values

### Activity and cover images
- **`PEXELS_API_KEY` is missing from `.env.local`** — document this clearly in the fix; user must add it manually (free tier: pexels.com/api)
- **`destination-image` route** (`/api/destination-image`) currently uses Pexels only; fix to also try Unsplash first (mirrors `unsplash.ts` `fetchImage()` pattern)
- **Activity photo banners** — `photo_url` is stored in `extra_data` on each activity but is NOT currently displayed on activity cards in the itinerary page; add the image as a banner/header to each activity card (similar to how the itinerary hero works)
- Activity image banner: show at the top of the `ActivityCard` component; use `next/image` with `fill` or fixed height (e.g. 120px); gracefully omit if `photo_url` is null (no placeholder needed — just no banner)
- Cover image for itinerary hero: already fetched via `fetchCityImage()` after itinerary insert; this path should continue working once Unsplash key is valid

### Transport options in activity descriptions
- Transport info stays **inside the description field** — no new DB fields or schema migrations
- The existing "transport bridge" rule in the prompt is expanded to include **multiple modes**: walking (if ≤15 min), public transit (bus/metro number + frequency if known), and taxi/rideshare — in order of what's most common for that destination
- Include **official transit website URL** only when it's a well-known, stable official source (e.g. TfL for London, RATP for Paris, rome2rio.com for general routing). Do NOT include URLs for obscure or potentially broken links.
- Add a new **"Getting around" optional intake chip** to the chat:
  - Chip label: "Getting around"
  - When tapped: shows a small panel asking "How do you plan to get around?" with options: Public transport / Rent a car / Mix of both / I'll figure it out
  - Answer stored in `trip_state.notes` or a new `transport_mode` field
  - AI uses this in transport bridges (e.g. if "Rent a car" → skip public transit tips, focus on parking/driving time)
  - If user doesn't tap the chip: AI suggests the most popular option for that destination

### Claude's Discretion
- Exact wording of the expanded transport bridge prompt rule
- Whether to add `transport_mode` as a new field to `TripStateSchema` or store in `notes`
- Exact style/height of activity card photo banner
- Google Flights URL format (query string vs path params)
- How to display the "Search on Google Flights →" link in the Flights tab (inline text link vs button)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HotelsTabPanel.tsx` — needs `initialMode`, `initialPreference`, `initialFoundHotel` props added; currently only `hotelPreference: string | null` is passed
- `HotelSaveData` (exported interface) — already has all fields for specific hotel; parent state already holds this
- `buildSystemPrompt()` in `system-prompt.ts` — inject `Current date:` here at runtime
- `buildUserProvidedContext()` in `system-prompt.ts` — already formats hotel/flight data for AI; review and strengthen
- `fetchUnsplashImage()` / `fetchPexelsImage()` in `unsplash.ts` — `fetchImage()` already tries Unsplash → Pexels; reuse for `destination-image` route
- `destination-image/route.ts` — currently Pexels-only; needs Unsplash fallback added
- `ActivityCard` component (in itinerary page) — needs `photo_url` from `extra_data` surfaced as a banner image
- `FlightsTabPanel.tsx` — add Google Flights link here
- `TRIP_PLANNER_RULES` in `trip-planner.ts` — all AI prompt fixes go here

### Established Patterns
- Brand palette enforced: navy/coral/umber/sky/sand — no blue-* classes
- All Zod fields use `.nullable()` not `.optional()` (required for OpenAI Structured Outputs)
- `next/image` with `fill` used for hero images; same pattern for activity card banners
- Inline style hex values for colors (not Tailwind classes) for any new image/map overlay code
- `motion/react` available for animations

### Integration Points
- `chat/page.tsx` → `HotelsTabPanel` prop contract change for full state restoration
- `system-prompt.ts` `buildSystemPrompt()` → inject `currentDate` parameter
- `api/chat/message/route.ts` → server-side days count validation after parse
- `lib/ai/prompts/trip-planner.ts` → expanded prompt rules (date year, flight times, transport, multi-day)
- `api/destination-image/route.ts` → add Unsplash fallback
- Itinerary page `ActivityCard` → render `extra_data.photo_url` as banner

</code_context>

<specifics>
## Specific Ideas

- **Google Flights link in Flights tab**: "Search on Google Flights →" as a coral text link at the top of the FlightsTabPanel, always visible. Pre-fill URL with origin + destination + dates from `tripState` when available.
- **Activity banner**: `photo_url` from `extra_data` → shown as a 120px tall `next/image` header at the top of each ActivityCard. No placeholder if null — card just shows without a banner.
- **Date year rule** in prompt: "Today is {YYYY-MM-DD}. If a user mentions dates without a year, use the current year unless that date has already passed — then use next year."
- **Multi-day prompt rule**: "IMPORTANT: The days[] array must contain ALL trip days. For a 4-day trip, include day_number 1, 2, 3, and 4. Do not stop early."
- **Transport bridge example to add to prompt**: "Walk 12 min from the hotel (google.com/maps directions), or take Metro Line 3 (runs every 8 min) — alight at Wenceslas Square. Alternatively, a taxi takes 5 min."

</specifics>

<deferred>
## Deferred Ideas

- Live flight search API integration (Skyscanner/Amadeus) — own phase
- Hotel booking links on itinerary cards — own phase
- Persisting flight/hotel preferences across page refreshes to Supabase — deferred; same-session is sufficient for now

</deferred>

---

*Phase: 13-mobile-bug-fixes-hotel-persistence-flight-details-date-year-defaulting-multi-day-itinerary-display-and-transport-options-in-activities*
*Context gathered: 2026-03-12*
