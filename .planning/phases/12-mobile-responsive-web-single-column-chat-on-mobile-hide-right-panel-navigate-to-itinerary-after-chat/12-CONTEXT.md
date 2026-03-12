# Phase 12: Mobile Responsive Web - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the Barabula web app work well on mobile browsers. On mobile (< 768px):
- The chat window is full-screen, single-column — the right panel (ContextPanel) is hidden entirely
- Landing page stays identical on mobile (no change)
- When itinerary generation completes, auto-navigate to `/itinerary/:id`
- The itinerary page itself is not redesigned in this phase — only navigation to it is changed

</domain>

<decisions>
## Implementation Decisions

### Mobile Navigation Trigger
- Auto-navigate to `/itinerary/:id` immediately when itinerary generation completes on mobile
- No "Accept" step on mobile — skip it entirely (desktop keeps the Accept button in the right panel)
- Before navigating, show a brief full-screen overlay: "Building your itinerary..." with a coral spinner for ~1-2s
- After landing on the itinerary page, show a mobile-only floating "Chat again" button (FAB or bottom bar) that navigates back to `/chat` for refinement

### In-Progress Feedback on Mobile
- No extra progress UI during the gathering phase — just the chat and typing indicator dots
- No separate trip state summary UI — the AI reflects state in chat messages naturally
- No itinerary preview card in the chat thread — auto-navigation replaces it
- Typing indicator dots are sufficient even during itinerary generation (the longer wait)

### Bottom Tab Bar on Mobile
- Flights/Hotels tabs remain at the bottom of the chat, same as desktop
- Tapping a tab slides up the panel above the input (existing behavior) — no change
- Tab panels should be scrollable and appropriately sized for small screens — Claude handles overflow
- Tabs only visible during `itinerary_complete` phase, same rule as desktop

### Breakpoint
- `md: 768px` (Tailwind default) — below this is mobile single-column, at/above is desktop split layout
- Mobile = single-column chat only; desktop (≥768px) = split layout with right ContextPanel

### Full-Screen Chat on Mobile
- Chat is full-screen on mobile — no separate nav bar visible
- The Barabula. logo + "AI Trip Planner" label remain in the chat header
- Same inset-0 layout as desktop, right panel simply not rendered

### Touch Interactions
- Standard tap interactions only — no custom swipe gestures or pull-to-refresh
- Native browser scroll

### Reference
- mildtrip.com cited as general feel reference — clean, full-width single-column chat on mobile
- Not copying any specific features — just the minimal, clean aesthetic

### Claude's Discretion
- Exact implementation of the "Building your itinerary..." overlay (animation, duration, dismiss logic)
- Exact placement and style of the "Chat again" FAB on the itinerary page (mobile only)
- How to conditionally render/hide the right panel and drag handle via Tailwind responsive classes
- Tab panel overflow/scroll handling for small screen heights

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SplitLayout.tsx` — the split layout component; needs `hidden md:flex` / `flex` pattern to hide right panel on mobile, show on md+
- `chat/page.tsx` — `leftPanel` JSX is already a self-contained column; right panel is passed to `SplitLayout` separately
- `ContextPanel.tsx` — the right panel component; simply not rendered on mobile (SplitLayout handles this)
- `BottomTabBar.tsx` + `FlightsTabPanel.tsx` + `HotelsTabPanel.tsx` — stay in the left panel, no changes needed to their logic
- `QuickActionChips.tsx` — already in the left panel, works on mobile as-is

### Established Patterns
- Brand palette: navy `#285185`, coral `#D67940`, umber `#6F4849`, sky `#CCD9E2`, sand `#F5EDE3` — no blue-* classes
- Typography: `font-logo` (Abril Fatface), `font-serif` (DM Serif Display), `font-sans` (Inter)
- Chat layout uses `fixed inset-0 z-30` — already full-screen
- `motion/react` is installed for animations (overlay transitions)

### Integration Points
- `callApi()` in `chat/page.tsx`: when `data.itineraryId` is set → this is where mobile auto-navigation triggers (currently sets state; on mobile, also call `router.push(/itinerary/${data.itineraryId})` after overlay)
- `useRouter` from `next/navigation` for programmatic navigation (already imported pattern exists in codebase)
- Itinerary page (`src/app/(authenticated)/itinerary/[id]/page.tsx`) — add mobile-only "Chat again" FAB there

</code_context>

<specifics>
## Specific Ideas

- **mildtrip.com reference** — general mobile feel: clean, full-width chat, minimal chrome. No specific features to copy.
- **"Building your itinerary..." overlay** — coral spinner, white or sand background, brief (1-2s), then router.push
- **"Chat again" FAB** — mobile only (`md:hidden`), appears on itinerary page, coral color, navigates to `/chat`
- **SplitLayout responsive approach** — modify to accept a `hideRight` prop or use a Tailwind wrapper to hide the right panel and drag handle at < 768px. Left panel should take full width on mobile.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-mobile-responsive-web-single-column-chat-on-mobile-hide-right-panel-navigate-to-itinerary-after-chat*
*Context gathered: 2026-03-12*
