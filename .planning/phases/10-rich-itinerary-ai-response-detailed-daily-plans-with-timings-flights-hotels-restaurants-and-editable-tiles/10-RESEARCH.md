# Phase 10: Rich Itinerary AI Response — Research

**Researched:** 2026-03-12
**Domain:** AI schema extension, itinerary UI enrichment, chat UI tab panels, inline editing
**Confidence:** HIGH (codebase fully read, decisions fully locked in CONTEXT.md)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Activity Data Model — New Fields**
- `duration`: nullable string, AI-generated plain text (e.g. "2–3 hours", "45 minutes") — not calculated
- `tips`: nullable string, optional and rare — a single plain-text tip only when genuinely useful — NOT mandatory per activity
- Distance from hotel: SKIPPED
- All existing fields kept: `name`, `time`, `description`, `location`, `activity_type`, `hotel_name`, `star_rating`, `check_in`, `check_out`

**Time Format**
- All activities must use specific clock times: `"9:00 AM"`, `"2:30 PM"`, `"7:00 PM"` — never `"morning"` / `"afternoon"` / `"evening"` labels
- Activities within each day must be in ascending time order
- Hotel check-in/check-out times also use clock times where possible

**Restaurant / Food Section**
- NOT embedded in activity tiles — lives as a separate "Eat & Drink" tab on the itinerary detail page
- Per day: one dinner recommendation (restaurant name, cuisine, area) + one local food tip
- Data structure: new top-level `daily_food` array on the itinerary: `[{ day_number, dinner_restaurant, dinner_area, dinner_cuisine, local_tip }]`
- Editable on the itinerary page from the Eat & Drink tab

**Flight Data Structure**
- Flights stored as a top-level `flights` array on the itinerary — NOT inside `days`/`activities`
- Each flight entry: `{ direction: 'outbound' | 'return', airline, flight_number, from_airport, to_airport, departure_time, arrival_time, is_suggested: boolean }`
- Outbound tied to Day 1, return tied to last day
- Rendered as FlightCards (distinct from activity cards)

**Flight Suggestion Logic**
- User fills Flights tab → data used verbatim, `is_suggested: false`
- User skips Flights tab → AI auto-suggests, `is_suggested: true` — card shows "Suggested — tap to edit"
- User says they have flights → AI still generates suggestion marked `is_suggested: true`

**Hotel Quality Inference**
- luxury / high-end → 5-star; mid / moderate → 4-star; budget / backpacker → 3-star; unknown → 4-star

**Chat UI — Flights & Hotels Tabs**
- Two optional bottom-bar tabs added to ChatPanel during intake: "Flights" and "Hotels"
- Tabs visible during `gathering_details` and `ready_for_summary` phases — hidden after `itinerary_complete`
- If user does not interact: AI generates suggestions automatically

**Itinerary Page — Editing**
- Activities (including `duration` and `tips`): edited via existing ActivityForm modal — gains two new fields
- Flight cards: inline editing — "Edit" button turns each field into editable input; save on blur or "Save" button; no modal
- Eat & Drink tab: all fields editable inline within the tab UI
- Edit mode: always per-tile, no global edit mode toggle

**Schema Changes (Zod + DB)**
- `Activity` type gains: `duration: string | null`, `tips: string | null`
- New top-level itinerary field: `flights: Flight[]` stored in `itinerary.extra_data` JSONB
- New top-level itinerary field: `daily_food: DailyFood[]` stored in `itinerary.extra_data` JSONB
- `Flight` type: `{ id, direction, airline, flight_number, from_airport, to_airport, departure_time, arrival_time, is_suggested }`
- `DailyFood` type: `{ day_number, dinner_restaurant, dinner_area, dinner_cuisine, local_tip }`

### Claude's Discretion

None explicitly listed — all major decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- Live flight search (Skyscanner/Amadeus API integration)
- Booking links on flight/hotel cards
- Multiple hotel options (3-tier picker)
- Lunch recommendations
- Distance from hotel to activities
- Per-day or per-activity AI regeneration (AIV2-04)
</user_constraints>

---

## Summary

Phase 10 enriches an already working itinerary AI pipeline end-to-end across four distinct layers: (1) the Zod + TypeScript schema for activities, flights, and food; (2) the AI system prompt to produce richer, clock-time-sorted output; (3) the chat page UI with activatable Flights and Hotels tab panels; and (4) the itinerary detail page with a new Eat & Drink tab, FlightCard component with inline editing, and expanded ActivityForm modal.

All four layers are tightly coupled — schema changes cascade through AI schema → API persistence → TypeScript types → UI components. The correct build order is: types/schema first, then AI prompt, then persistence in the chat API route, then itinerary page UI additions. The existing `extra_data` JSONB column on `itineraries` already exists in the schema and is the designated storage location for both `flights` and `daily_food` — no DB migration is needed for those arrays. The `activities` table does NOT have `duration` or `tips` columns yet; those require a migration.

**Primary recommendation:** Build in strict layer order — schema/types → AI schema + prompt → chat/message route persistence → itinerary page UI. Don't build the FlightCard UI before the AI is emitting the `flights` array from the prompt.

---

## Standard Stack

### Core (all already installed — no new dependencies needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^3 | Schema validation + OpenAI structured output shape | Already used for all AI schemas in `src/lib/ai/schemas.ts` |
| openai | ^6 | `chat.completions.parse()` with zodResponseFormat | Already wired in `src/app/api/chat/message/route.ts` |
| motion/react | ^12.35.2 | Animated card transitions + inline edit reveal | Already used throughout itinerary components |
| swr | ^2 | Itinerary data fetching + cache invalidation with `mutate()` | Already used in `src/app/(authenticated)/itinerary/[id]/page.tsx` |
| @supabase/supabase-js | ^2 | DB reads/writes via Supabase client | Already wired in all API routes |
| react | ^18 | Component tree, `useState`, `useCallback`, `useMemo` | App baseline |

### No New Libraries Required
All functionality in Phase 10 can be built with the existing dependency tree. The inline editing pattern for FlightCard uses controlled React inputs — no external form library is needed. The tab UI uses the same pill-tab pattern already present in the itinerary page mobile tabs and DayPillNav.

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
src/
├── lib/
│   ├── ai/
│   │   ├── schemas.ts              # ADD: Flight, DailyFood Zod schemas; extend Activity schema
│   │   └── prompts/
│   │       └── trip-planner.ts     # UPDATE: add flight + food + time format rules
│   └── types.ts                    # UPDATE: Flight, DailyFood interfaces; extend Activity
├── components/
│   ├── itinerary/
│   │   ├── FlightCard.tsx          # NEW: inline-editable flight card
│   │   ├── EatDrinkTab.tsx         # NEW: per-day food cards with inline edit
│   │   └── ActivityForm.tsx        # UPDATE: add Duration + Tips fields
│   └── chat/
│       ├── BottomTabBar.tsx        # UPDATE: Flights + Hotels tabs become interactive
│       ├── FlightsTabPanel.tsx     # NEW: expandable flights intake form
│       └── HotelsTabPanel.tsx      # NEW: expandable hotels preference panel
└── app/
    ├── api/
    │   ├── chat/
    │   │   └── message/route.ts    # UPDATE: persist flights + daily_food into extra_data
    │   └── itineraries/
    │       └── [id]/route.ts       # UPDATE: PATCH supports extra_data fields
    └── (authenticated)/
        └── itinerary/
            └── [id]/page.tsx       # UPDATE: tab state, Eat & Drink tab, FlightCard rendering
```

### Pattern 1: extra_data JSONB as Phase-10 Storage
**What:** `itineraries.extra_data` (already `JSONB DEFAULT '{}'`) stores both `flights` and `daily_food` arrays as top-level keys. Activities table gets two new TEXT columns: `duration` and `tips`.
**When to use:** For itinerary-level structured data that doesn't warrant a new table. Activity-level fields that map cleanly to columns get real columns (not extra_data).

Storage strategy:
```typescript
// Itinerary extra_data shape after Phase 10
{
  flights: Flight[],
  daily_food: DailyFood[],
}

// Activity columns added (via migration)
// ALTER TABLE public.activities ADD COLUMN duration TEXT;
// ALTER TABLE public.activities ADD COLUMN tips TEXT;
```

### Pattern 2: Zod Schema Extension for OpenAI Structured Outputs
**What:** Extend the existing `AIResponseSchema` in `src/lib/ai/schemas.ts` to include `flights` and `daily_food` at the itinerary level, and `duration`/`tips` on each activity.
**When to use:** Any new AI-generated field must go through Zod first — OpenAI `chat.completions.parse()` rejects schemas with `optional()` fields; all fields must be in `required` and use `.nullable()` for optional semantics.

```typescript
// Source: existing pattern in src/lib/ai/schemas.ts
// Extend the activity object inside AIResponseSchema:
z.object({
  name: z.string(),
  time: z.string(),           // now enforced as clock time via prompt
  description: z.string(),
  location: z.string(),
  activity_type: z.enum(['activity', 'hotel']).nullable(),
  hotel_name: z.string().nullable(),
  star_rating: z.number().nullable(),
  check_in: z.string().nullable(),
  check_out: z.string().nullable(),
  duration: z.string().nullable(),   // NEW — "2–3 hours", "45 minutes"
  tips: z.string().nullable(),       // NEW — one tip or null
})

// New top-level schemas:
const FlightSchema = z.object({
  direction: z.enum(['outbound', 'return']),
  airline: z.string().nullable(),
  flight_number: z.string().nullable(),
  from_airport: z.string().nullable(),
  to_airport: z.string().nullable(),
  departure_time: z.string().nullable(),
  arrival_time: z.string().nullable(),
  is_suggested: z.boolean(),
})

const DailyFoodSchema = z.object({
  day_number: z.number(),
  dinner_restaurant: z.string().nullable(),
  dinner_area: z.string().nullable(),
  dinner_cuisine: z.string().nullable(),
  local_tip: z.string().nullable(),
})

// Added to itinerary object inside AIResponseSchema:
flights: z.array(FlightSchema),
daily_food: z.array(DailyFoodSchema),
```

### Pattern 3: Inline Editing (FlightCard)
**What:** FlightCard renders read view by default. When user clicks "Edit", each field becomes a `<input>` or `<select>`. On blur or explicit "Save" click, PATCH is called; then the component reverts to read view.
**When to use:** For card-level edits where a modal would feel heavy. Mirrors the existing `editingTitle` pattern in `itinerary/[id]/page.tsx`.

```typescript
// Existing precedent in src/app/(authenticated)/itinerary/[id]/page.tsx:
const [editingTitle, setEditingTitle] = useState(false)
const [titleDraft, setTitleDraft] = useState('')
// On blur → saveTitle() → fetch PATCH → mutate()
```

FlightCard inline edit follows the same pattern per-field, all within the card component itself (no lifting to parent needed — flight edits PATCH `/api/itineraries/[id]` to update `extra_data.flights`).

### Pattern 4: Tab Panel Expansion (Chat UI)
**What:** BottomTabBar is upgraded from static disabled buttons to interactive tabs. Clicking "Flights" or "Hotels" expands a panel above the input area (between QuickActionChips and ChatInput). Closing the panel returns to normal.
**When to use:** During `gathering_details` and `ready_for_summary` phases. Panel state lives in the chat page component (not lifted further).

```typescript
// State additions to ChatPageInner:
const [activeTab, setActiveTab] = useState<'flights' | 'hotels' | null>(null)
const [flightInputData, setFlightInputData] = useState<FlightInputData | null>(null)
const [hotelPreference, setHotelPreference] = useState<string | null>(null)
```

Tabs are hidden (rendered as null or disabled) when `conversationPhase === 'itinerary_complete'`.

### Pattern 5: Eat & Drink Tab on Itinerary Page
**What:** New tab alongside the "Itinerary" view (and mobile "Map" tab if enabled). Shows one card per day with dinner + local tip. Inline editable. PATCH saves to `itinerary.extra_data`.
**When to use:** Always visible once an itinerary exists. Defaults to "Itinerary" tab on load.

The itinerary page already has a tab pattern for mobile (list/map). The same `motion.div layoutId` pill indicator pattern should be reused for the new Itinerary / Eat & Drink / (Map when shown) tabs.

### Pattern 6: Activity Sort — Clock Time Parsing
**What:** The existing `groupByDay` function in `itinerary/[id]/page.tsx` uses `timeRank()` which handles both named times (`morning`, `afternoon`) and numeric (`09:00`). With Phase 10 mandating clock times only, a simpler sort suffices — but the existing parser already handles clock times correctly via `parseFloat(t.replace(':', '.'))`.

The prompt must enforce clock times strictly. The UI sort function needs no changes — it already handles `"9:00 AM"` style strings correctly since `parseFloat("9:00 AM".replace(':', '.'))` yields `9.0`, which sorts correctly.

**Caution:** `"12:00 PM"` → `12.00` and `"1:00 PM"` → `1.00` — this will sort 1 PM before 12 PM. The timeRank function should be updated to handle 12-hour clock format properly by converting to 24-hour equivalent before sorting.

### Anti-Patterns to Avoid
- **Putting `flights` or `daily_food` inside the `days` array:** The decision is top-level on the itinerary object. Don't nest them.
- **Using `optional()` in Zod schema for OpenAI:** OpenAI Structured Outputs requires all fields in `required`. Use `.nullable()` for optional values — established project pattern.
- **`activity_type: 'flight'` sentinel on activities table:** Flights are NOT activities. Store in `extra_data` on the itinerary row.
- **Global edit mode toggle:** Each tile edits independently. Existing pattern.
- **Lunch recommendations:** Explicitly deferred. Don't add.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON persistence for flights/food | Custom DB column + ORM | `extra_data JSONB` already on itineraries | Column exists, no migration needed |
| AI structured output validation | Manual JSON.parse + typeof checks | `zodResponseFormat` + `parse()` | Already established, handles schema drift |
| Tab state animation | Custom CSS transitions | `motion/react` `layoutId` pill indicator | Already used in itinerary page mobile tabs |
| Form field state management | Redux/Zustand for tab panels | `useState` in component | Same pattern as all existing forms |

---

## Common Pitfalls

### Pitfall 1: OpenAI Token Budget and Itinerary Size
**What goes wrong:** Adding `flights` (2 objects), `daily_food` (N objects), `duration` and `tips` on every activity increases response token count. For a 7-day trip with 4 activities/day, this adds ~30 extra fields. The current `max_tokens: 4096` may truncate on longer trips.
**Why it happens:** OpenAI truncates at `max_tokens` mid-JSON, causing a parse failure with structured outputs.
**How to avoid:** The route already uses `max_tokens: 4096`. Monitor for truncation. If the itinerary parse fails, the server guard returns a 500. Consider bumping to `max_tokens: 8192` for Phase 10 given the richer schema.
**Warning signs:** `parsed` is null in `/api/chat/message/route.ts` — the existing guard logs this.

### Pitfall 2: 12-hour Clock Sort Order
**What goes wrong:** `"1:00 PM"` sorts before `"12:00 PM"` with the current numeric sort (`parseFloat("1:00 PM".replace(':', '.')) = 1.0 < 12.0`).
**Why it happens:** The existing `timeRank` function treats the hour portion as a float, which doesn't account for AM/PM.
**How to avoid:** Update `timeRank` in `groupByDay` to parse 12-hour times correctly — convert `"1:00 PM"` → 13, `"12:00 PM"` → 12, `"12:00 AM"` → 0.
**Warning signs:** Afternoon activities showing before noon activities in the rendered list.

### Pitfall 3: extra_data Merge — Not Replace
**What goes wrong:** When PATCHing `extra_data.flights`, a naive `update({ extra_data: { flights: [...] } })` replaces the entire `extra_data` object, erasing `daily_food` (or vice versa).
**Why it happens:** JSONB column update replaces the whole value unless you use PostgreSQL's `jsonb_set` or merge at the application layer.
**How to avoid:** In the PATCH route, read existing `extra_data` first, merge the specific key, then write the merged object. Or use Supabase's RPC/`jsonb_set`. Application-layer merge is simpler:
```typescript
const existing = itinerary.extra_data ?? {}
await supabase.from('itineraries').update({
  extra_data: { ...existing, flights: updatedFlights }
}).eq('id', id)
```
**Warning signs:** Eat & Drink data disappears after editing a flight, or vice versa.

### Pitfall 4: Chat Tab Panels and Phase Gating
**What goes wrong:** Tabs shown after `itinerary_complete` confuse users — they've already generated an itinerary.
**Why it happens:** Phase state is managed in `ChatPageInner` but BottomTabBar doesn't currently receive it.
**How to avoid:** Pass `conversationPhase` to BottomTabBar (or the parent panel). Show Flights/Hotels tabs only when phase is `gathering_details` or `ready_for_summary`. The tab state (which tab is active) should reset to null when phase transitions to `itinerary_complete`.

### Pitfall 5: Activity PATCH route doesn't persist duration/tips
**What goes wrong:** ActivityForm sends `duration` and `tips` in the body but the PATCH route at `src/app/api/activities/[id]/route.ts` doesn't include them in the `updates` object.
**Why it happens:** The route only whitelists known fields explicitly. New fields are silently ignored.
**How to avoid:** Add `if (body.duration !== undefined) updates.duration = body.duration || null` and same for `tips` to the PATCH route.

### Pitfall 6: FlightCard inline edit and SWR cache
**What goes wrong:** Inline save on FlightCard calls PATCH but the page doesn't `mutate()` — the rendered data stays stale until a reload.
**Why it happens:** FlightCard won't have direct access to SWR's `mutate` unless it's passed as a prop.
**How to avoid:** Pass `onSave` callback from the page (which calls `mutate()`) into FlightCard, same pattern as `onDeleteActivity`/`onEditActivity` in DaySection.

### Pitfall 7: AI Prompt — `is_suggested` field reliability
**What goes wrong:** AI sets `is_suggested: true` for user-provided flights, or leaves it inconsistent.
**Why it happens:** The model may not reliably distinguish between "user gave me this" vs "I made this up" without explicit guidance.
**How to avoid:** The prompt must clearly state: "Set `is_suggested: false` only if the user explicitly provided flight details in this conversation. Otherwise, always set `is_suggested: true`." The API route, not the AI, is the authoritative source — it can override `is_suggested` based on whether `flightInputData` was user-submitted.

---

## Code Examples

### Existing Pattern: extra_data Merge (activities route)

Hotel data is already stored in activity `extra_data` via the chat message route:
```typescript
// Source: src/app/api/chat/message/route.ts (lines 127–133)
extra_data: (act.activity_type === 'hotel')
  ? {
      hotel_name: act.hotel_name,
      star_rating: act.star_rating,
      check_in: act.check_in,
      check_out: act.check_out,
    }
  : {},
```

Phase 10 extends this pattern for itinerary-level `extra_data`:
```typescript
// Persist flights + daily_food into itinerary extra_data
await supabase.from('itineraries').update({
  extra_data: {
    flights: parsed.itinerary.flights ?? [],
    daily_food: parsed.itinerary.daily_food ?? [],
  }
}).eq('id', newItinerary.id)
```

### Existing Pattern: Inline Edit (title)
```typescript
// Source: src/app/(authenticated)/itinerary/[id]/page.tsx (lines 167–181)
const [editingTitle, setEditingTitle] = useState(false)
const [titleDraft, setTitleDraft] = useState('')

const saveTitle = useCallback(async () => {
  if (!titleDraft.trim() || titleDraft === data?.title) { setEditingTitle(false); return }
  setEditingTitle(false)
  await fetch(`/api/itineraries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: titleDraft.trim() }),
  })
  mutate()
}, [id, titleDraft, data?.title, mutate])
```

FlightCard replicates this per-field within the card component. Each field gets its own draft state.

### Existing Pattern: Tab Pill Indicator
```typescript
// Source: src/app/(authenticated)/itinerary/[id]/page.tsx (lines 312–326)
{(['list', 'map'] as const).map(tab => (
  <button key={tab} onClick={() => handleSetMobileTab(tab)}
    className="relative flex-1 py-2.5 text-xs font-semibold text-umber capitalize tracking-wide">
    {mobileTab === tab && (
      <motion.div layoutId="mobile-tab-indicator"
        className="absolute bottom-0 left-4 right-4 h-0.5 bg-coral rounded-full" />
    )}
    {tab === 'list' ? 'Itinerary' : 'Map'}
  </button>
))}
```

Eat & Drink tab uses the same `layoutId` motion pill pattern.

### Zod nullable pattern (established project rule)
```typescript
// Source: src/lib/ai/schemas.ts — all nullable fields follow this pattern
hotel_name: z.string().nullable(),
// NOT: hotel_name: z.string().optional()
// OpenAI Structured Outputs requires all fields in required[], .nullable() maps to anyOf: [null, ...]
```

---

## State of the Art

| Old Approach | Current Approach | Applies To | Impact |
|--------------|------------------|------------|--------|
| `morning`/`afternoon` labels | Specific clock times `"9:00 AM"` | `activity.time` | Enables proper sort, better UI display |
| No flight data in itinerary | Top-level `flights` array | Itinerary schema | FlightCard rendered above/below day sections |
| No food data | Top-level `daily_food` array | Itinerary schema | Separate Eat & Drink tab |
| Hotel time "All day" or descriptive | Clock times for check-in/check-out | Hotel activity | Consistent with all-clock-time mandate |
| `activity_type: null` for activities | `activity_type: 'activity'` or `'hotel'` | AI prompt | Now explicit |

---

## DB Migration Required

The `activities` table needs two new columns. This IS a migration (unlike `flights`/`daily_food` which use existing `itineraries.extra_data`).

```sql
-- supabase/migrations/20260312000000_add_activity_duration_tips.sql
ALTER TABLE public.activities ADD COLUMN duration TEXT;
ALTER TABLE public.activities ADD COLUMN tips TEXT;
```

The `itineraries.extra_data` column already exists as `JSONB DEFAULT '{}'` — no migration needed for flights or daily_food storage.

---

## Open Questions

1. **max_tokens budget for richer schema**
   - What we know: Current `max_tokens: 4096` is in place. Phase 10 adds ~30–50 tokens per activity (duration + tips) plus the flights and daily_food arrays.
   - What's unclear: Whether 4096 is sufficient for a 7-day trip with all new fields.
   - Recommendation: Increase to `max_tokens: 8192` in the chat message route as part of this phase to prevent truncation.

2. **Flight user-input data flow into AI prompt**
   - What we know: User fills FlightsTabPanel → data stored in ChatPageInner state → sent to AI somehow.
   - What's unclear: Whether user-provided flight details are injected into the AI prompt (as part of the system prompt / trip_state) or handled purely client-side (ChatPage captures them, stores in state, and passes to the persistence route separately).
   - Recommendation: Simplest approach — add `user_flights` and `hotel_preference` fields to `TripStateSchema` and `trip_sessions`. The chat API route then reads them from session and passes to the prompt. This keeps everything server-side and consistent.

3. **FlightCard edit — API endpoint**
   - What we know: Editing a flight updates `itinerary.extra_data.flights` array.
   - What's unclear: Should this go through `/api/itineraries/[id]` PATCH (already exists) or a new dedicated `/api/itineraries/[id]/flights` route?
   - Recommendation: Use the existing PATCH route — add `extra_data` as a supported update field with safe merge logic. Keeps surface area small.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (globals: true, jsdom environment) |
| Config file | `/Users/asmeenray/projects/barabula/vitest.config.mts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Baseline State
- 74 passing, 4 failing (pre-existing failures in `chat-page.test.tsx`, `hotel-card.test.tsx`, `split-layout.test.tsx` — NOT caused by Phase 10)
- Phase 10 must not increase the failing count

### Phase Requirements → Test Map

| Behavior | Test Type | Target File | Automated Command |
|----------|-----------|-------------|-------------------|
| FlightCard renders airline, route, times | unit | `flight-card.test.tsx` | `npx vitest run src/__tests__/flight-card.test.tsx` |
| FlightCard shows "Suggested — tap to edit" badge when `is_suggested: true` | unit | `flight-card.test.tsx` | same |
| FlightCard inline edit: clicking Edit reveals inputs | unit | `flight-card.test.tsx` | same |
| ActivityForm renders Duration and Tips fields | unit | `activity-form.test.tsx` | `npx vitest run src/__tests__/activity-form.test.tsx` |
| EatDrinkTab renders one card per day with restaurant + tip | unit | `eat-drink-tab.test.tsx` | `npx vitest run src/__tests__/eat-drink-tab.test.tsx` |
| EatDrinkTab fields are editable | unit | `eat-drink-tab.test.tsx` | same |
| BottomTabBar Flights/Hotels tabs activate correct panel | unit | `bottom-tab-bar.test.tsx` | `npx vitest run src/__tests__/bottom-tab-bar.test.tsx` |
| Activity sort: clock times sort correctly including 12-hour PM edge case | unit | `itinerary-detail.test.tsx` | `npx vitest run src/__tests__/itinerary-detail.test.tsx` |
| Itinerary detail page renders Eat & Drink tab button | integration | `itinerary-detail.test.tsx` | same |
| Zod schema accepts `duration` and `tips` as nullable strings | unit | `api/schemas.test.ts` | `npx vitest run src/__tests__/api/schemas.test.ts` |

### Sampling Rate
- **Per task commit:** `npx vitest run` (full suite, ~14s)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite — no new failures above the 4 pre-existing baseline

### Wave 0 Gaps
- [ ] `src/__tests__/flight-card.test.tsx` — FlightCard component (new component, no test yet)
- [ ] `src/__tests__/eat-drink-tab.test.tsx` — EatDrinkTab component (new component, no test yet)
- [ ] `src/__tests__/activity-form.test.tsx` — ActivityForm with new fields (currently untested)
- [ ] `src/__tests__/bottom-tab-bar.test.tsx` — BottomTabBar with interactive tabs (currently untested — only `chip.test.tsx` covers chips)
- [ ] `src/__tests__/api/schemas.test.ts` — Zod schema shape tests for Flight/DailyFood/Activity extension

---

## Sources

### Primary (HIGH confidence)
- Codebase read directly — `src/lib/ai/schemas.ts`, `src/lib/types.ts`, `src/app/api/chat/message/route.ts`, `src/app/(authenticated)/itinerary/[id]/page.tsx`, `src/components/itinerary/DaySection.tsx`, `src/components/itinerary/ActivityForm.tsx`, `src/components/chat/BottomTabBar.tsx`, `supabase/schema.sql`
- `.planning/phases/10-rich-itinerary-ai-response-detailed-daily-plans-with-timings-flights-hotels-restaurants-and-editable-tiles/10-CONTEXT.md` — all implementation decisions locked

### Secondary (MEDIUM confidence)
- Vitest test baseline run: 74 passing / 4 failing (pre-existing)

### Tertiary (LOW confidence — from training)
- OpenAI Structured Outputs token budget guidance (max_tokens truncation behavior) — recommend validating empirically after prompt expansion

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, versions confirmed by reading actual files
- Architecture: HIGH — all patterns derived from existing code, no speculation
- Pitfalls: HIGH (codebase-derived) / MEDIUM (AI token budget — empirical)
- DB migration: HIGH — schema.sql read directly

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable stack)
