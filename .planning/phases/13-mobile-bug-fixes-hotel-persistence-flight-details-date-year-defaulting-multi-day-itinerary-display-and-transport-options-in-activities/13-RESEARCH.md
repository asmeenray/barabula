# Phase 13: Bug Fixes — Research

**Researched:** 2026-03-12
**Domain:** Next.js React state management, OpenAI prompt engineering, Next.js Image, Pexels/Unsplash APIs
**Confidence:** HIGH — all findings directly verified against the actual codebase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Hotel tab state persistence
- When user re-opens the Hotel tab, fully restore previous state: mode (Suggest / I have one), preference text, AND the found-hotel card if a specific hotel was previously searched
- The found-hotel card should show already-selected (with checkmark) — no re-lookup needed
- Store all hotel state in parent React state (`hotelSaveData` already exists in `chat/page.tsx`); pass the full `HotelSaveData` + found hotel object back to `HotelsTabPanel` as props
- Persistence is same session only (React state) — not persisted to Supabase; consistent with how flight data works

#### Multi-day display fix
- Fix approach: tighten the AI prompt with an explicit rule — "The days[] array MUST include ALL days from day 1 to duration_days. Never truncate the days array even if the response is long."
- Also add a server-side validation in the API route: after parsing, check if `days.length < duration_days` and log a warning; return a `partialItinerary: true` flag in the response if mismatch detected
- Consider also making activity descriptions in the structured JSON slightly more concise to reduce token pressure (while keeping the prose reply rich)

#### Date year defaulting
- Add `Current date: ${new Date().toISOString().split('T')[0]}` to the system prompt (injected at runtime in `buildSystemPrompt`)
- Add explicit AI rule: "If the user mentions dates without a year, always assume the current year unless the resulting date has already passed — in that case, use the next year."

#### Flight time fields
- Strengthen the AI prompt's Flights Rules section: "departure_time and arrival_time MUST be non-null when origin and destination are both known. Use realistic times for the route."
- Add Google Flights deep link in the Flights tab panel in the chat — always visible regardless of whether fields are filled
  - Format: `https://www.google.com/travel/flights?q=flights+from+{origin}+to+{destination}+on+{date}`
  - Show as a subtle link/button: "Search on Google Flights →"
- Flight and hotel data saved by the user must be reliably used by the AI when generating the itinerary — verify `buildUserProvidedContext()` in `system-prompt.ts` is correctly injected and strengthen the prompt instructions

#### Activity and cover images
- `PEXELS_API_KEY` is missing from `.env.local` — document this clearly; user must add it manually (free tier: pexels.com/api)
- `destination-image` route currently uses Pexels only; fix to also try Unsplash first (mirrors `unsplash.ts` `fetchImage()` pattern)
- Activity photo banners — `photo_url` is stored in `extra_data` on each activity but is NOT currently displayed on activity cards in the itinerary page; add the image as a banner/header to each activity card
- Activity image banner: show at the top of the `ActivityCard` component; use `next/image` with `fill` or fixed height (e.g. 120px); gracefully omit if `photo_url` is null (no placeholder needed)

#### Transport options in activity descriptions
- Transport info stays inside the description field — no new DB fields or schema migrations
- The existing "transport bridge" rule in the prompt is expanded to include multiple modes: walking (if ≤15 min), public transit (bus/metro number + frequency if known), and taxi/rideshare — in order of what's most common for that destination
- Include official transit website URL only when it's a well-known, stable official source
- Add a new "Getting around" optional intake chip to the chat:
  - Chip label: "Getting around"
  - When tapped: shows a small panel asking "How do you plan to get around?" with options: Public transport / Rent a car / Mix of both / I'll figure it out
  - Answer stored in `trip_state.notes` or a new `transport_mode` field
  - AI uses this in transport bridges
  - If user doesn't tap the chip: AI suggests the most popular option for that destination

### Claude's Discretion
- Exact wording of the expanded transport bridge prompt rule
- Whether to add `transport_mode` as a new field to `TripStateSchema` or store in `notes`
- Exact style/height of activity card photo banner
- Google Flights URL format (query string vs path params)
- How to display the "Search on Google Flights →" link in the Flights tab (inline text link vs button)

### Deferred Ideas (OUT OF SCOPE)
- Live flight search API integration (Skyscanner/Amadeus) — own phase
- Hotel booking links on itinerary cards — own phase
- Persisting flight/hotel preferences across page refreshes to Supabase — deferred; same-session is sufficient for now
</user_constraints>

---

## Summary

Phase 13 is a precision bug-fix phase across six distinct problem areas. Every fix is grounded in code that already exists — no new infrastructure is needed. The fixes divide into three categories: **state bugs** (hotel persistence, multi-day truncation), **AI prompt deficiencies** (date year defaulting, flight time nulls, transport bridges), and **asset/integration gaps** (Pexels key missing, destination-image Pexels-only, activity image banners not rendered).

The codebase is well-structured and has established the right patterns for all six fixes. `HotelsTabPanel` simply needs its internal `useState` hoisted to parent props. `buildSystemPrompt()` in `system-prompt.ts` needs a `currentDate` injection. `destination-image/route.ts` needs the `fetchImage()` helper from `lib/unsplash.ts` substituted for its hand-rolled Pexels call. `ActivityCard` already reads `photo_url` from `extra_data` and renders a banner — that code exists and already works.

The "Getting around" chip is the most novel UI addition but follows the exact chip-set pattern in `QuickActionChips.tsx`. The transport mode should be added as a new `transport_mode` field on `TripStateSchema` rather than concatenated into `notes`, which would be harder to consume in prompts.

**Primary recommendation:** Fix each bug in its own focused plan (one plan per bug group). No refactoring, no schema migrations. All changes are minimal surgical edits to existing files.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15+ (App Router) | Framework | Already installed; all routes are Next.js App Router |
| React | 19 (via Next.js) | UI state | All components are React function components with hooks |
| OpenAI SDK | 6.x | AI completions | `openai.chat.completions.parse()` in use (not beta) |
| Zod | 4.x | Schema validation | Used for `AIResponseSchema`, `TripStateSchema` |
| next/image | Built-in | Image rendering | Already used in `ActivityCard` for photo banners |
| motion/react | 12.35.2 | Animations | Already used for tab panels, overlays |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase JS | 2.x | DB + auth | All API routes; server-side client with `createClient()` |
| useSWR | 2.x | Data fetching | Itinerary detail page data fetching |
| Vitest | 4.x | Unit testing | All `src/__tests__/` files; use `vitest run` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `notes` field for transport_mode | New `transport_mode` field in TripStateSchema | New field is cleaner for prompt injection and AI extraction; `notes` is a freeform blob that would require parsing |
| Text link for Google Flights | Full button | Inline coral `<a>` link is less intrusive and consistent with "subtle" direction from context |

---

## Architecture Patterns

### Relevant File Map
```
src/
├── app/(authenticated)/chat/page.tsx          # Parent: holds hotelSaveData, flightInputData state
├── app/api/chat/message/route.ts              # POST handler: buildSystemPrompt(), days validation
├── app/api/destination-image/route.ts         # GET: Pexels-only, needs Unsplash fallback
├── components/chat/HotelsTabPanel.tsx         # Needs initialMode + initialFoundHotel props
├── components/chat/FlightsTabPanel.tsx        # Needs Google Flights link
├── components/chat/QuickActionChips.tsx       # "Getting around" chip addition
├── components/itinerary/ActivityCard.tsx      # photo_url banner already implemented
├── lib/ai/system-prompt.ts                    # buildSystemPrompt() — inject currentDate
├── lib/ai/prompts/trip-planner.ts             # TRIP_PLANNER_RULES — all prompt fixes
├── lib/ai/schemas.ts                          # TripStateSchema — add transport_mode field
└── lib/unsplash.ts                            # fetchImage() helper — reuse in destination-image
```

### Pattern 1: Hotel State Restoration via Props
**What:** Lift the internal `foundHotel` state out of `HotelsTabPanel` into parent `chat/page.tsx`. Add `initialMode`, `initialFoundHotel` props to the panel. Initialize `useState` from props.
**When to use:** Any time a tab panel must restore its state when reopened.

Current `HotelsTabPanel` signature:
```typescript
// CURRENT — only hotelPreference is passed down
interface HotelsTabPanelProps {
  tripState: Partial<TripState>
  hotelPreference: string | null     // derived from hotelSaveData in parent
  onSave: (data: HotelSaveData) => void
  onClose: () => void
}
```

Target signature (add these props):
```typescript
interface HotelsTabPanelProps {
  tripState: Partial<TripState>
  hotelPreference: string | null
  initialMode?: 'specific' | 'preference'
  initialFoundHotel?: { full_name: string; area: string; city: string; star_rating: number } | null
  onSave: (data: HotelSaveData) => void
  onClose: () => void
}
```

Parent `chat/page.tsx` call site becomes:
```typescript
// hotelSaveData is already HotelSaveData | null in parent state
// foundHotel data needs to be separately stored: add foundHotelData state
<HotelsTabPanel
  tripState={tripState}
  hotelPreference={hotelPreference}
  initialMode={hotelSaveData?.mode ?? 'preference'}
  initialFoundHotel={foundHotelData}   // new state field in parent
  onSave={(data) => setHotelSaveData(data)}
  onClose={() => setActiveTab(null)}
/>
```

The simplest approach: save `foundHotel` back to parent via a separate `onFoundHotel` callback OR include the found hotel object inside the `HotelSaveData` interface. The second is cleaner — extend `HotelSaveData` to include optional `_foundHotelCard` for round-trip restoration.

**Cleanest approach per context decisions:** Add a `foundHotelData` state in parent, pass it as `initialFoundHotel`. When `HotelsTabPanel.handleSave()` fires, also call `onFoundHotel(foundHotel)` if mode is `specific`. Parent stores it.

### Pattern 2: Runtime Date Injection in buildSystemPrompt
**What:** Pass `currentDate` as a new parameter to `buildSystemPrompt()`, inject it into the prompt prefix.
**When to use:** Any runtime-dynamic context that must appear in the system prompt.

```typescript
// system-prompt.ts
export function buildSystemPrompt(
  tripState: Partial<TripState>,
  phase: ConversationPhase | string,
  flightInputData?: FlightInputData | null,
  hotelSaveData?: HotelSaveData | null,
): string {
  const currentDate = new Date().toISOString().split('T')[0]  // "2026-03-12"
  const dateLine = `Current date: ${currentDate}\n\n`
  const base = buildTripPlannerPrompt(JSON.stringify(tripState, null, 2), phase)
  const userContext = buildUserProvidedContext(flightInputData, hotelSaveData)
  return dateLine + base + userContext
}
```

No signature change needed — the injection is internal. The prompt template in `trip-planner.ts` does NOT need `currentDate` as a template variable; the prefix injection in `system-prompt.ts` is sufficient.

### Pattern 3: destination-image Route Fix — Reuse fetchImage()
**What:** Replace the inline Pexels-only fetch in `destination-image/route.ts` with `fetchImage()` from `lib/unsplash.ts`.
**When to use:** Any API route that needs an image URL.

```typescript
// destination-image/route.ts — AFTER fix
import { NextRequest, NextResponse } from 'next/server'
import { fetchCityImage } from '@/lib/unsplash'

export async function GET(request: NextRequest) {
  const destination = request.nextUrl.searchParams.get('destination')
  if (!destination) return NextResponse.json({ url: null })

  const url = await fetchCityImage(destination)
  return NextResponse.json({ url: url ?? null })
}
```

Note: `fetchCityImage` returns `null` if both keys are missing — same fallback behavior as the current route. The route response drops `photographer` and `photographerUrl` fields (they were Pexels-specific and nothing in the codebase uses them).

### Pattern 4: transport_mode in TripStateSchema
**What:** Add `transport_mode` as a nullable string field to `TripStateSchema`.
**When to use:** New trip attribute that the AI must extract and use.

```typescript
// schemas.ts addition
export const TripStateSchema = z.object({
  // ... existing fields ...
  notes: z.string().nullable(),
  transport_mode: z.string().nullable(),  // "public_transport" | "rent_a_car" | "mix" | null
})
```

OpenAI Structured Outputs requires `.nullable()` not `.optional()` (established project pattern — verified in STATE.md decisions).

### Pattern 5: Getting Around Chip — Expand CHIP_SETS
**What:** Add a new "Getting around" chip to the `gathering_details` phase. Tapping it opens a new `TransportChipPanel` (analogous to `HotelsTabPanel` / `FlightsTabPanel`) with radio-style options.
**When to use:** Any new intake chip that opens a sub-panel.

The chip chip set for `gathering_details` is currently empty `[]` in `CHIP_SETS`. Adding a chip there means it appears during the trip details gathering phase, which is the correct moment.

```typescript
// QuickActionChips.tsx — add to CHIP_SETS
gathering_details: [
  { label: 'Getting around', message: '__show_transport_panel__' },
],
```

The sentinel `__show_transport_panel__` (like `__reset_session__`) should be intercepted in `sendMessage()` in `chat/page.tsx` — NOT sent to the API. It triggers `setActiveTab('transport')`.

### Anti-Patterns to Avoid
- **Storing foundHotel only inside HotelsTabPanel:** The panel unmounts when `activeTab !== 'hotels'`, so all local state is lost on close. State must live in the parent.
- **Using `.optional()` for new Zod fields:** Always use `.nullable()` for OpenAI Structured Outputs compatibility (project-established rule).
- **Fetching Pexels in destination-image AND unsplash.ts:** The `fetchImage()` helper already provides Unsplash → Pexels fallback. The destination-image route was redundantly reimplementing this.
- **Sending transport sentinel to OpenAI:** The `__show_transport_panel__` sentinel must be caught in `sendMessage()` before `callApi()` is reached, same pattern as `__reset_session__`.
- **Adding `blue-*` Tailwind classes:** Brand palette enforced — use inline hex or `text-navy`, `text-coral`, `text-umber`, `bg-sky`, `bg-sand` only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image fetching with fallback | Custom fetch chain | `fetchImage()` / `fetchCityImage()` in `lib/unsplash.ts` | Already handles Unsplash → Pexels fallback, error handling, and missing key guard |
| Activity photo rendering | Custom `<img>` | `next/image` with `fill` | Already used in ActivityCard and ItineraryHero; automatic optimization |
| Date normalization | Custom parser | `new Date(raw).toISOString().split('T')[0]` | Already used in `api/chat/message/route.ts` at line 97 |
| Animation for tab panels | CSS transitions | `motion/react` `AnimatePresence` + `motion.div` | Already used for FlightsTabPanel and HotelsTabPanel in chat/page.tsx |

**Key insight:** Every piece of infrastructure this phase needs already exists. The fixes are surgical edits to existing files, not new abstractions.

---

## Common Pitfalls

### Pitfall 1: foundHotel State Lost on Panel Close
**What goes wrong:** `HotelsTabPanel` is wrapped in `AnimatePresence` and conditionally rendered. When `activeTab` becomes `null`, the component unmounts. All `useState` inside it is destroyed.
**Why it happens:** React state does not survive unmount.
**How to avoid:** Move `foundHotel` state to the parent `ChatPageInner`. Pass it down as `initialFoundHotel` prop. Initialize `useState` from props: `useState(initialFoundHotel ?? null)`.
**Warning signs:** Reopening the Hotels tab shows empty state even after a successful hotel lookup.

### Pitfall 2: HotelsTabPanel Prop Contract Change Breaks Existing Usage
**What goes wrong:** Adding new required props to `HotelsTabPanel` without defaults will cause TypeScript errors.
**Why it happens:** The component is used in `chat/page.tsx` and may be referenced in tests.
**How to avoid:** Make `initialMode` and `initialFoundHotel` optional with defaults (`initialMode = 'preference'`, `initialFoundHotel = null`). Check `src/__tests__/` for any `HotelsTabPanel` tests that need updating.

### Pitfall 3: currentDate Injection Misplaced
**What goes wrong:** If the date is injected in `buildTripPlannerPrompt()` as a template string parameter, it would need to be threaded through an extra function argument.
**Why it happens:** Over-engineering the injection point.
**How to avoid:** Inject the date line in `buildSystemPrompt()` in `system-prompt.ts` as a string prefix before `base`. No parameter changes needed. The model reads system prompt top-to-bottom; date context at the top is effective.

### Pitfall 4: Multi-Day Validation Log vs. Response Flag
**What goes wrong:** Adding `partialItinerary: true` to the API response requires the client to handle it — but `chat/page.tsx` currently ignores this field. Logging the server-side warning without client handling is sufficient for diagnosis.
**Why it happens:** Adding client handling without a UI for it.
**How to avoid:** Phase 13 adds server-side logging only (`console.warn`). The `partialItinerary` flag in the response is a future enhancement — for now, just log the discrepancy. The real fix is the stricter prompt rule preventing truncation.

### Pitfall 5: Google Flights URL Encoding
**What goes wrong:** Spaces and special characters in origin/destination city names break the URL.
**Why it happens:** Raw string interpolation into a URL.
**How to avoid:** Use `encodeURIComponent()` for the query string value. The format `?q=flights+from+${encodeURIComponent(origin)}+to+...` handles spaces correctly (Google Flights also accepts `%20`).

### Pitfall 6: transport_mode Sentinel Not Intercepted
**What goes wrong:** If `__show_transport_panel__` reaches `callApi()`, the AI receives a nonsensical user message and tripState gets corrupted.
**Why it happens:** Forgetting to add the sentinel check in `sendMessage()`.
**How to avoid:** In `sendMessage()`, add a check for `content === '__show_transport_panel__'` that calls `setActiveTab('transport')` and returns early — same pattern as `content === '__reset_session__'`.

### Pitfall 7: Pexels API Key Documentation
**What goes wrong:** User cannot see images even after the code fix because `PEXELS_API_KEY` is not in `.env.local`.
**Why it happens:** The key was never added; `destination-image/route.ts` returns early when `!pexelsKey`.
**How to avoid:** The fix plan must include a clear note to add `PEXELS_API_KEY=your_key` to `.env.local`. Pexels free tier: https://www.pexels.com/api/. No git commit for the key — it stays in `.env.local` only.

---

## Code Examples

Verified patterns from the actual codebase:

### Extending HotelSaveData for Round-Trip Persistence
```typescript
// HotelsTabPanel.tsx — CURRENT HotelSaveData interface
export interface HotelSaveData {
  mode: 'specific' | 'preference'
  preference: string | null
  specific_hotel_name: string | null
  specific_hotel_area: string | null
  specific_hotel_city: string | null
  specific_hotel_stars: number | null
}

// PROPOSED: Add optional found hotel card for parent restoration
// (alternative to a separate foundHotelData state in parent)
export interface HotelSaveData {
  mode: 'specific' | 'preference'
  preference: string | null
  specific_hotel_name: string | null
  specific_hotel_area: string | null
  specific_hotel_city: string | null
  specific_hotel_stars: number | null
  // For state restoration — null when mode is 'preference'
  _found_hotel_card?: {
    full_name: string
    area: string
    city: string
    star_rating: number
  } | null
}
```

The CONTEXT.md decision says to pass a "full HotelSaveData + found hotel object" — extending HotelSaveData is cleaner than a separate state field. The `_found_hotel_card` prefix signals it's a UI concern only (not sent to AI).

### Adding initialFoundHotel to HotelsTabPanel
```typescript
// PROPOSED new props
interface HotelsTabPanelProps {
  tripState: Partial<TripState>
  hotelPreference: string | null
  initialMode?: 'specific' | 'preference'
  initialFoundHotel?: { full_name: string; area: string; city: string; star_rating: number } | null
  onSave: (data: HotelSaveData) => void
  onClose: () => void
}

export function HotelsTabPanel({
  tripState,
  hotelPreference,
  initialMode = 'preference',
  initialFoundHotel = null,
  onSave,
  onClose
}: HotelsTabPanelProps) {
  const [mode, setMode] = useState<'specific' | 'preference'>(initialMode)
  // Restore foundHotel from prop on mount
  const [foundHotel, setFoundHotel] = useState<{...} | null>(initialFoundHotel)
  // ...
}
```

### Google Flights Link in FlightsTabPanel
```typescript
// Inside FlightsTabPanel render — at top of the panel, always visible
{(tripState.origin || tripState.destination) && (
  <a
    href={buildGoogleFlightsUrl(tripState)}
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs font-semibold text-coral hover:text-coral/80 transition-colors"
  >
    Search on Google Flights →
  </a>
)}

function buildGoogleFlightsUrl(tripState: Partial<TripState>): string {
  const from = encodeURIComponent(tripState.origin ?? '')
  const to = encodeURIComponent(tripState.destination ?? '')
  const date = tripState.dates_start ? encodeURIComponent(tripState.dates_start) : ''
  return `https://www.google.com/travel/flights?q=flights+from+${from}+to+${to}+on+${date}`
}
```

### Multi-Day Prompt Rule
```typescript
// TRIP_PLANNER_RULES addition in trip-planner.ts — add to end of ## Phase Rules section
// "IMPORTANT: The itinerary days[] array MUST contain ALL trip days without exception.
// For a 4-day trip, include day_number 1, 2, 3, and 4. For a 7-day trip, include 1 through 7.
// Do NOT stop the array early even if the response is approaching length limits —
// shorten individual activity descriptions instead if needed."
```

### Server-Side Days Validation in API Route
```typescript
// api/chat/message/route.ts — add after parsing, before inserting activities
if (safePhase === 'itinerary_complete' && parsed.itinerary) {
  const { days } = parsed.itinerary
  const durationDays = parsed.trip_state?.duration_days
  if (durationDays && days.length < durationDays) {
    console.warn(
      `[chat/message] Partial itinerary: expected ${durationDays} days, got ${days.length}.`
    )
  }
  // ... continue with insert
}
```

### transport_mode Addition to TripStateSchema
```typescript
// schemas.ts — add field to TripStateSchema
export const TripStateSchema = z.object({
  // ... existing fields ...
  notes: z.string().nullable(),
  transport_mode: z.string().nullable(),  // "public_transport" | "rent_a_car" | "mix" | null
})
```

### Getting Around Chip Sentinel Pattern
```typescript
// chat/page.tsx sendMessage() — add before callApi()
if (content === '__show_transport_panel__') {
  setActiveTab('transport')
  return
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pexels-only in destination-image | Should be Unsplash → Pexels (fetchImage) | Phase 11 added fetchImage() helper | Fix is trivial — 8 lines replace 25 |
| No photo banner on ActivityCard | Photo banner is already implemented | ActivityCard already has photo banner code at line 33 | Photo banners render automatically once Pexels key exists |
| No date context in system prompt | Need to inject currentDate | Phase 8 established buildSystemPrompt() | 2-line fix in system-prompt.ts |

**Deprecated/outdated:**
- The Pexels-only inline fetch in `destination-image/route.ts`: should have been updated when Phase 11 introduced `fetchImage()` — it was an oversight.

---

## Open Questions

1. **Should `_found_hotel_card` be added to `HotelSaveData` or stored as separate parent state?**
   - What we know: CONTEXT.md says "pass the full HotelSaveData + found hotel object back to HotelsTabPanel as props"
   - What's unclear: Whether this means extending `HotelSaveData` or a new separate state variable
   - Recommendation: Extend `HotelSaveData` with optional `_found_hotel_card` field. Keeps the prop surface minimal (one callback, one state). The underscore prefix signals UI-only usage.

2. **transport_mode: free string or enum?**
   - What we know: CONTEXT.md lists four options — "Public transport / Rent a car / Mix of both / I'll figure it out"
   - What's unclear: Whether a strict Zod enum is better than `z.string().nullable()`
   - Recommendation: Use `z.string().nullable()` not a Zod enum. OpenAI is better at filling free strings than strict enums for this type of user preference. The prompt will guide the model to use specific values.

3. **Does `partialItinerary: true` need client handling in Phase 13?**
   - What we know: CONTEXT.md says "return a `partialItinerary: true` flag in the response if mismatch detected"
   - What's unclear: What the client should do with this flag
   - Recommendation: Add the flag to the API response for future use, but do NOT add client handling in Phase 13. The server console.warn is sufficient for diagnosis in this phase.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.mts` in project root |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map
| Area | Behavior | Test Type | Automated Command | File Exists? |
|------|----------|-----------|-------------------|-------------|
| Hotel persistence | HotelsTabPanel accepts and restores initialMode + initialFoundHotel props | unit | `npx vitest run src/__tests__/hotels-tab-panel.test.tsx` | ❌ Wave 0 |
| destination-image route | Route calls Unsplash first, falls back to Pexels | unit | `npx vitest run src/__tests__/api/destination-image.test.ts` | ❌ Wave 0 |
| Transport chip | `__show_transport_panel__` sentinel opens transport panel, not sent to AI | unit | `npx vitest run src/__tests__/chat-page.test.tsx` (extend existing) | ✅ (extend) |
| Activity banner | ActivityCard renders photo_url as banner image (already implemented) | unit | `npx vitest run src/__tests__/activity-card.test.tsx` | ❌ Wave 0 |
| TripStateSchema | transport_mode field is nullable string | unit | `npx vitest run src/__tests__/api/schemas.test.ts` (extend) | ✅ (extend) |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/hotels-tab-panel.test.tsx` — covers hotel prop restoration
- [ ] `src/__tests__/api/destination-image.test.ts` — covers Unsplash → Pexels fallback in route
- [ ] `src/__tests__/activity-card.test.tsx` — covers photo banner rendering

*(Note: `src/__tests__/api/unsplash.test.ts` already covers `fetchCityImage` and `fetchActivityImage` at HIGH confidence — those do not need new tests.)*

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src/components/chat/HotelsTabPanel.tsx`, `FlightsTabPanel.tsx`, `chat/page.tsx`, `lib/ai/system-prompt.ts`, `lib/ai/prompts/trip-planner.ts`, `lib/ai/schemas.ts`, `lib/unsplash.ts`, `app/api/destination-image/route.ts`, `app/api/chat/message/route.ts`, `components/itinerary/ActivityCard.tsx`
- `.planning/phases/13-*/13-CONTEXT.md` — locked decisions
- `.planning/STATE.md` — project conventions (Zod .nullable(), inline hex colors, no blue-* Tailwind)

### Secondary (MEDIUM confidence)
- OpenAI Structured Outputs documentation (verified via STATE.md pattern: all fields `.nullable()` not `.optional()`)
- Google Flights URL format: `https://www.google.com/travel/flights?q=...` — well-known public URL pattern

### Tertiary (LOW confidence)
- None — all claims are directly verified against codebase or established conventions

---

## Metadata

**Confidence breakdown:**
- Hotel persistence fix: HIGH — complete code path understood end-to-end
- Multi-day prompt fix: HIGH — prompt location identified, fix text specified in CONTEXT.md
- Date year fix: HIGH — injection point (`buildSystemPrompt`) identified, 2-line change
- Flight time prompt fix: HIGH — `TRIP_PLANNER_RULES` location confirmed
- Google Flights link: HIGH — `FlightsTabPanel` structure fully read
- Pexels key missing: HIGH — confirmed `!pexelsKey` early return in destination-image/route.ts
- destination-image Unsplash fix: HIGH — `fetchCityImage()` helper confirmed in unsplash.ts
- Activity image banners: HIGH — `ActivityCard.tsx` already has complete banner implementation
- Transport chip: HIGH — chip sentinel pattern verified in QuickActionChips + chat/page.tsx
- transport_mode field: HIGH — TripStateSchema location confirmed, `.nullable()` pattern established

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable codebase, 30-day validity)
