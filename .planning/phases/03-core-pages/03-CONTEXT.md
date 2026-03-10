# Phase 3: Core Pages - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the three placeholder pages with real, functional UIs: Chat (AI conversation + itinerary generation), Dashboard (itinerary list), and Itinerary Detail (day-by-day view). This phase owns the user-facing product experience. Collaboration features are Phase 4; AI streaming is Phase 5.

</domain>

<decisions>
## Implementation Decisions

### State management
- Claude decides the specific library/approach (Zustand, TanStack Query, SWR, or hooks — pick what fits)
- Consistent loading and error state patterns across all three pages (same skeleton style, same error message pattern)
- No optimistic updates — wait for server confirmation before updating UI, show loading indicator during mutations
- All Supabase queries go through Next.js API Routes (`/api/*`). Client code never calls Supabase directly.
- In-flight chat messages live in local component state (useState inside ChatPage) — not in a global store

### Chat layout
- Bubble chat: user messages right-aligned, AI messages left-aligned with an icon/avatar
- Input fixed at the bottom of the chat area
- Single persistent chat per user — one ongoing thread, history loaded from Supabase on page mount
- On itinerary generation: AI sends a plain text confirmation message ("Your itinerary is ready!"), then auto-navigates to the new itinerary detail page after a 2-3 second pause

### Dashboard layout
- Cards grid: 2-3 columns on desktop, 1 column on mobile
- Each card shows: title, destination, date range, description snippet, and a delete button
- "Create new itinerary" navigates to `/itinerary/new` (a dedicated form page — title, destination, dates)
- Empty state: illustration + two CTAs — "Start a trip in Chat →" and "+ Create manually"

### Itinerary detail structure
- Single scrollable page with day sections (Day 1, Day 2, etc. as section headers — no tabs)
- Header shows: title, destination, date range, description
- Activity row shows: name, time, location, description
- Edit scope: title, description, AND individual activities (add, edit, delete activities) — full edit in Phase 3

### Claude's Discretion
- Specific state management library choice (Zustand / TanStack Query / SWR / React hooks)
- Loading skeleton design and exact visual style
- Error state handling and messaging copy
- Exact spacing, typography, and card visual design
- AI icon/avatar in chat bubbles

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/supabase/client.ts`: `createClient()` browser client — available for any client component that needs it
- `src/lib/supabase/server.ts`: `createClient()` server client — used in Server Components and API Routes
- `src/app/(authenticated)/layout.tsx`: Authenticated layout with nav bar (Barabula logo, Dashboard + Chat links, user email) and `max-w-6xl` container — wraps all three pages automatically
- `src/app/globals.css`: Tailwind CSS only (`@tailwind base/components/utilities`) — no component library

### Established Patterns
- Tailwind CSS for all styling (no MUI, no component library)
- Supabase `@supabase/ssr` for server-side client (established in Phase 2)
- No Redux — state management decided here in Phase 3
- `src/app/(authenticated)/` route group is already protected by middleware — all new pages go here

### Integration Points
- `/chat/page.tsx`, `/dashboard/page.tsx`, `/itinerary/page.tsx` — three placeholder pages to replace
- New routes needed: `/itinerary/[id]/page.tsx` (detail), `/itinerary/new/page.tsx` (create form)
- New API routes needed: `/api/itineraries`, `/api/itineraries/[id]`, `/api/chat/message`, `/api/chat/history`
- OpenAI calls go in Next.js API routes (replacing the old FastAPI `chat.py`) — `OPENAI_API_KEY` is already set in Vercel env vars

</code_context>

<specifics>
## Specific Ideas

- After AI generates an itinerary: show "Your itinerary is ready!" in chat, wait 2-3s, then `router.push('/itinerary/[id]')`
- Itinerary detail page scrolls vertically through all days — no tabs
- Dashboard cards show all four fields: title, destination, date range, description snippet

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-core-pages*
*Context gathered: 2026-03-10*
