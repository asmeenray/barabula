# Phase 10: Rich Itinerary AI Response — Context

**Gathered:** 2026-03-12
**Status:** Ready for planning
**Source:** /gsd:discuss-phase 10

<domain>
## Phase Boundary

Phase 10 enriches the AI itinerary generation pipeline end-to-end:
- Richer activity schema (duration, optional tips, specific times)
- Structured flight data (top-level `flights` array, AI-suggested or user-provided)
- Daily food recommendations (dinner + local tip per day, shown on itinerary page as a tab)
- Optional Flights + Hotels chat tabs for user input before generation
- Expanded edit modal for new activity fields
- Inline editing on FlightCard tiles
- All activities sorted ascending by specific clock times (9:00 AM, 2:30 PM, etc.)

This phase does NOT include: live flight/hotel search APIs, booking integrations, real-time pricing.
</domain>

<decisions>
## Implementation Decisions

### Activity Data Model — New Fields
- **`duration`**: nullable string, AI-generated plain text (e.g. "2–3 hours", "45 minutes") — not calculated
- **`tips`**: nullable string, optional and rare — a single plain-text tip only when genuinely useful (e.g. "Book tickets online 2 weeks ahead") — NOT mandatory per activity
- **Distance from hotel**: SKIPPED — too complex, not this phase
- All existing fields kept: `name`, `time`, `description`, `location`, `activity_type`, `hotel_name`, `star_rating`, `check_in`, `check_out`

### Time Format
- All activities must use specific clock times: `"9:00 AM"`, `"2:30 PM"`, `"7:00 PM"` — never `"morning"` / `"afternoon"` / `"evening"` labels
- Activities within each day must be in ascending time order
- Hotel check-in/check-out times also use clock times where possible

### Restaurant / Food Section
- NOT embedded in activity tiles — lives as a **separate "Eat & Drink" tab** on the itinerary detail page
- Per day: one **dinner recommendation** (restaurant name, cuisine, area) + one **local food tip** (e.g. "Try the street corn from the vendor outside the main square")
- Data structure: new top-level `daily_food` array on the itinerary: `[{ day_number, dinner_restaurant, dinner_area, dinner_cuisine, local_tip }]`
- Editable on the itinerary page from the Eat & Drink tab

### Flight Data Structure
- Flights stored as a **top-level `flights` array** on the itinerary — NOT inside the `days`/`activities` structure
- Each flight entry: `{ direction: 'outbound' | 'return', airline, flight_number, from_airport, to_airport, departure_time, arrival_time, is_suggested: boolean }`
- **Outbound** flight logically tied to Day 1, **return** flight logically tied to last day
- Rendered on the itinerary page as FlightCards (distinct from activity cards)

### Flight Suggestion Logic
- If user fills in the Flights tab during chat: their data is used verbatim, `is_suggested: false`
- If user skips the Flights tab: AI auto-suggests a realistic flight (best-guess airline + morning departure) based on origin city and trip dates, `is_suggested: true` — card shows "Suggested — tap to edit"
- If user says they already have flights: AI still generates a suggestion marked `is_suggested: true` — user can override inline

### Hotel Quality Inference
- AI infers hotel star rating from `travel_style` and `budget` fields — no extra intake question
  - luxury / high-end → 5-star
  - mid / moderate → 4-star
  - budget / backpacker → 3-star
  - unknown → default 4-star

### Chat UI — Flights & Hotels Tabs
- Two optional bottom-bar tabs added to the **Chat page** during the intake/gathering phase: **"Flights"** and **"Hotels"**
- These are optional — user can ignore them and the AI will auto-suggest
- **Flights tab**: expands a mini-panel asking for origin city (if not yet collected), then outbound + return flight details. User fills in airline, times, airports — this populates the `flights` array on generation
- **Hotels tab**: expands a mini-panel showing AI's inferred hotel suggestion (based on travel_style/budget) — user can confirm or change hotel name/area preference
- Tabs visible during `gathering_details` and `ready_for_summary` phases — hidden after `itinerary_complete`
- If user does not interact with either tab: AI generates suggestions for both automatically

### Itinerary Page — Editing
- **Activities** (including new `duration` and `tips` fields): edited via **existing ActivityForm modal** — modal gains two new fields: Duration (text input) and Tips (textarea, optional)
- **Flight cards**: inline editing — FlightCard shows an "Edit" button that turns each field into an editable input in place; save on blur or explicit "Save" button; no modal
- **Eat & Drink tab**: restaurant name, cuisine, area, and local tip fields editable inline within the tab UI
- **Edit mode**: always per-tile, no global edit mode toggle — same pattern as existing itinerary page

### Itinerary Page — Eat & Drink Tab
- New tab on the itinerary detail page alongside the existing day-by-day view
- Shows a card per day with: dinner restaurant (name, area, cuisine), local food tip
- User can edit all fields inline within this tab

</decisions>

<specifics>
## Specific Implementation Notes

### Schema Changes (Zod + DB)
1. `Activity` type gains: `duration: string | null`, `tips: string | null`
2. New top-level itinerary field: `flights: Flight[]` (stored in itinerary `extra_data` JSONB or new column)
3. New top-level itinerary field: `daily_food: DailyFood[]` (stored in itinerary `extra_data` JSONB)
4. `Flight` type: `{ id, direction, airline, flight_number, from_airport, to_airport, departure_time, arrival_time, is_suggested }`
5. `DailyFood` type: `{ day_number, dinner_restaurant, dinner_area, dinner_cuisine, local_tip }`

### AI Prompt Changes
- System prompt updated to instruct: always use specific clock times, sort ascending by time
- Activity instruction: add `duration` (plain text) and `tips` (only when genuinely useful, leave null otherwise)
- Hotel instruction: infer star rating from travel_style/budget
- New prompt section: generate `flights` array with outbound + return suggestions
- New prompt section: generate `daily_food` array with dinner + local tip per day

### Chat UI Changes
- Add "Flights" and "Hotels" bottom-bar tabs to ChatPanel (similar to QuickActionChips)
- Each tab expands a small form panel above the input area
- Flights form: origin city (pre-filled if known), outbound flight fields, return flight fields
- Hotels form: shows inferred hotel (name, area, star rating) — user can adjust

### Itinerary Page Changes
- Add "Eat & Drink" tab to itinerary detail page navigation
- Add FlightCard component rendered above or below the day sections
- Expand ActivityForm modal with Duration + Tips fields
- FlightCard gets inline-edit mode
</specifics>

<deferred>
## Deferred Ideas

- Live flight search (Skyscanner/Amadeus API integration) — out of scope for this phase
- Booking links on flight/hotel cards — future phase
- Multiple hotel options to choose from (3-tier picker) — deferred; single AI suggestion + edit is sufficient for now
- Lunch recommendations — keeping food section light (dinner + tip only) per user decision
- Distance from hotel to activities — deferred, requires geocoding complexity
- Per-day or per-activity AI regeneration (AIV2-04 from requirements) — v2
</deferred>

---

*Phase: 10-rich-itinerary-ai-response-detailed-daily-plans-with-timings-flights-hotels-restaurants-and-editable-tiles*
*Context gathered: 2026-03-12 via /gsd:discuss-phase 10*
