# Phase 3: Core Pages - Research

**Researched:** 2026-03-10
**Domain:** Next.js App Router page implementation, OpenAI API integration, Supabase data access, Tailwind CSS UI patterns for travel apps
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**State management**
- All Supabase queries go through Next.js API Routes (`/api/*`). Client code never calls Supabase directly.
- In-flight chat messages live in local component state (useState inside ChatPage) — not in a global store
- No optimistic updates — wait for server confirmation before updating UI, show loading indicator during mutations

**Chat layout**
- Bubble chat: user messages right-aligned, AI messages left-aligned with an icon/avatar
- Input fixed at the bottom of the chat area
- Single persistent chat per user — one ongoing thread, history loaded from Supabase on page mount
- On itinerary generation: AI sends a plain text confirmation message ("Your itinerary is ready!"), then auto-navigates to the new itinerary detail page after a 2-3 second pause

**Dashboard layout**
- Cards grid: 2-3 columns on desktop, 1 column on mobile
- Each card shows: title, destination, date range, description snippet, and a delete button
- "Create new itinerary" navigates to `/itinerary/new` (a dedicated form page — title, destination, dates)
- Empty state: illustration + two CTAs — "Start a trip in Chat →" and "+ Create manually"

**Itinerary detail structure**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHAT-01 | Chat page displays a functional AI conversation interface (not placeholder) | Chat bubble layout patterns, useState message management, API route pattern |
| CHAT-02 | User can send a message and receive an AI response (non-streaming in Phase 3) | OpenAI SDK `chat.completions.create()`, API route POST handler |
| CHAT-03 | Chat messages are persisted and visible when user returns to the chat page | `GET /api/chat/history` → Supabase `chat_history` table, load on mount |
| CHAT-04 | After itinerary generation, user is navigated to the new itinerary detail view | `router.push('/itinerary/[id]')` after 2-3s, detect itinerary trigger in AI response |
| CHAT-05 | AI responses containing itinerary data are rendered as structured content, not raw text | Itinerary JSON in AI reply rendered as day-cards/activity lists instead of a string |
| DASH-01 | Dashboard page displays a list of the user's itineraries (not placeholder) | Cards grid layout, `GET /api/itineraries`, SWR or useState for data |
| DASH-02 | Dashboard fetches itineraries from backend on load | Route handler reads from Supabase `itineraries` table scoped to authenticated user |
| DASH-03 | User can navigate from Dashboard to itinerary detail view | Link to `/itinerary/[id]` on card click |
| DASH-04 | User can delete an itinerary from the Dashboard | `DELETE /api/itineraries/[id]`, remove from local state after confirmation |
| DASH-05 | Dashboard shows empty state when user has no itineraries | Illustration + two CTA buttons pattern |
| ITIN-01 | Itinerary detail page shows a day-by-day structured view (not placeholder) | Scrollable sections, Day N headers, activities list per day |
| ITIN-02 | Each day shows activities with name, time, description, and location | `Activity` type with those four fields, rendered in activity rows |
| ITIN-03 | User can create a new itinerary manually from the itinerary list | `/itinerary/new` page with title/destination/dates form, `POST /api/itineraries` |
| ITIN-04 | User can edit an itinerary's title and description | Inline edit or modal, `PATCH /api/itineraries/[id]` |
| ITIN-05 | Client-side state handles fetch/create/update/delete with consistent loading/error states | SWR `useSWR` + `mutate()` pattern or plain useState, same skeleton style everywhere |
| ITIN-06 | `Activity` type is properly typed with name, time, description, and location (no `any[]`) | TypeScript interface, stored in `public.activities` table |
</phase_requirements>

---

## Summary

Phase 3 replaces three placeholder pages with fully functional UIs. The work divides cleanly into four concerns: (1) a data layer with typed API routes and a consistent client-state pattern, (2) a chat page with bubble layout and OpenAI integration, (3) a dashboard with a card grid and empty state, and (4) an itinerary detail page with day-by-day sections and inline editing.

All Supabase access goes through Next.js Route Handlers (`src/app/api/*/route.ts`). Every handler uses the server-side Supabase client (`src/lib/supabase/server.ts`) which already exists and is the established pattern from Phase 2. Client pages call these API routes via `fetch`. For client-state management, **SWR** is the recommended choice: it is the smallest-footprint option in this stack, ships from Vercel (same team as Next.js), handles cache invalidation via `mutate()`, and its minimal API maps directly onto the requirements (fetch on mount, revalidate after mutation). Chat message state stays in local `useState` as decided.

The UI patterns from top travel apps (Wanderlog, Sygic, TripIt) converge on a small set of reusable decisions: card grids with destination thumbnail and date metadata, day-section headers with activity timeline cards, and chat bubbles with left-AI / right-user alignment. The Tailwind utility classes for these patterns are well-documented and require no component library.

**Primary recommendation:** Build data layer first (API routes + types + SWR hooks), then compose pages from those hooks. This lets all three pages share the same loading/error/skeleton pattern before any page-specific UI is written.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^16.1.6 | App Router, Route Handlers, `useRouter` | Already installed (Phase 2) |
| React | ^19.0.0 | Client Components, useState, useEffect | Already installed |
| Tailwind CSS | ^3.4.1 | All styling | Already installed, no component library in use |
| @supabase/ssr | ^0.9.0 | Server-side Supabase client for Route Handlers | Already installed, established pattern |
| openai | latest | OpenAI SDK for API routes | Needs installation |
| swr | ^2.x | Client-side data fetching and cache invalidation | Needs installation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^2.x | Unit tests for Client Components and API utilities | Phase 3 (nyquist_validation is enabled) |
| @vitejs/plugin-react | latest | Vitest React support | With vitest |
| @testing-library/react | latest | Component test utilities | With vitest |
| @testing-library/dom | latest | DOM query utilities | With vitest |
| vite-tsconfig-paths | latest | Resolves `@/` alias in test files | With vitest + TypeScript |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SWR | TanStack Query | TanStack Query has more features (DevTools, garbage collection, pagination) but larger bundle and steeper API. SWR is sufficient for this app's CRUD needs and aligns with Vercel ecosystem. |
| SWR | useState + useEffect + fetch | Viable for simple cases but loses automatic deduplication, revalidation, and `mutate()`. Inconsistent loading patterns become hard to maintain across three pages. |
| SWR | Zustand | Zustand is a global store — appropriate for cross-page shared state. Chat messages are local-only (decided), and itinerary data is already server-state. Using Zustand here would over-engineer the problem. |

**Installation:**
```bash
npm install openai swr
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (authenticated)/
│   │   ├── chat/
│   │   │   └── page.tsx              # Client Component — chat UI
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Client Component — itinerary list
│   │   └── itinerary/
│   │       ├── page.tsx              # Redirect or list (existing placeholder)
│   │       ├── new/
│   │       │   └── page.tsx          # Client Component — create form
│   │       └── [id]/
│   │           └── page.tsx          # Client Component — detail + edit
│   └── api/
│       ├── itineraries/
│       │   ├── route.ts              # GET (list), POST (create)
│       │   └── [id]/
│       │       └── route.ts          # GET (single), PATCH (update), DELETE
│       └── chat/
│           ├── message/
│           │   └── route.ts          # POST — send message, get AI reply
│           └── history/
│               └── route.ts          # GET — load chat history
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Existing browser client
│   │   └── server.ts                 # Existing server client
│   └── types.ts                      # Shared TypeScript interfaces
└── components/
    ├── chat/
    │   ├── MessageBubble.tsx
    │   ├── ItineraryCard.tsx         # Structured itinerary in chat
    │   └── ChatInput.tsx
    ├── dashboard/
    │   ├── ItineraryCard.tsx
    │   └── EmptyState.tsx
    ├── itinerary/
    │   ├── DaySection.tsx
    │   ├── ActivityRow.tsx
    │   └── ActivityForm.tsx
    └── ui/
        ├── Skeleton.tsx
        └── ErrorMessage.tsx
```

### Pattern 1: Route Handler with Supabase Auth (API routes)
**What:** Every API route creates a server Supabase client, calls `getUser()` to authenticate, then queries with RLS enforced automatically.
**When to use:** All `/api/*` route handlers.
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
// src/app/api/itineraries/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabase
    .from('itineraries')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
```

### Pattern 2: Dynamic Route Handler with Params
**What:** Route handlers with URL params must `await params` (Next.js 15+ change).
**When to use:** `/api/itineraries/[id]/route.ts`
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route (version 16.1.6)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // Must await — breaking change in Next.js 15+
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { error } = await supabase
    .from('itineraries')
    .delete()
    .eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
```

### Pattern 3: SWR Data Fetching in Client Components
**What:** `useSWR` fetches and caches list data; `mutate()` invalidates cache after mutations.
**When to use:** Dashboard (itinerary list), itinerary detail page.
**Example:**
```typescript
// Source: https://swr.vercel.app/docs/mutation
'use client'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function DashboardPage() {
  const { data: itineraries, error, isLoading, mutate } = useSWR('/api/itineraries', fetcher)

  async function handleDelete(id: string) {
    await fetch(`/api/itineraries/${id}`, { method: 'DELETE' })
    mutate() // Re-fetch list from server (no optimistic update per decision)
  }

  if (isLoading) return <SkeletonGrid />
  if (error) return <ErrorMessage message="Failed to load itineraries" />
  if (!itineraries?.length) return <EmptyState />
  return (/* card grid */)
}
```

### Pattern 4: Chat Page with Local useState
**What:** Messages array lives in component state. On send: append user message, POST to API, append AI response. History loaded on mount via separate fetch.
**When to use:** Chat page only (decided: no global store for in-flight messages).
**Example:**
```typescript
'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Message = { id: string; role: 'user' | 'assistant'; content: string }

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load history on mount
  useEffect(() => {
    fetch('/api/chat/history')
      .then(r => r.json())
      .then(data => setMessages(data))
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || sending) return
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)
    const res = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input }),
    })
    const data = await res.json()
    const aiMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: data.content }
    setMessages(prev => [...prev, aiMsg])
    setSending(false)
    // If itinerary was generated, navigate after delay
    if (data.itineraryId) {
      setTimeout(() => router.push(`/itinerary/${data.itineraryId}`), 2500)
    }
  }
}
```

### Pattern 5: OpenAI Chat Completion in API Route
**What:** Use `openai.chat.completions.create()` with conversation history. Detect itinerary intent and generate structured JSON when triggered.
**When to use:** `POST /api/chat/message`
**Example:**
```typescript
// Source: https://github.com/openai/openai-node
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// For regular chat response:
const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ],
})
const responseText = completion.choices[0].message.content

// For itinerary generation (structured JSON):
const itineraryCompletion = await openai.chat.completions.create({
  model: 'gpt-4o',
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: ITINERARY_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ],
})
const itineraryData = JSON.parse(itineraryCompletion.choices[0].message.content!)
```

### Pattern 6: Tailwind CSS Chat Bubbles
**What:** User messages right-aligned (blue bubble), AI messages left-aligned (gray bubble) with avatar.
**When to use:** MessageBubble component.
**Example:**
```typescript
// Source: https://flowbite.com/docs/components/chat-bubble/ + https://preline.co/docs/chat-bubbles.html
// User message (right-aligned):
<div className="flex justify-end">
  <div className="max-w-xs lg:max-w-md px-4 py-2 bg-blue-600 text-white rounded-2xl rounded-br-sm text-sm">
    {content}
  </div>
</div>

// AI message (left-aligned with avatar):
<div className="flex items-start gap-2.5">
  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-sm">
    AI
  </div>
  <div className="max-w-xs lg:max-w-md px-4 py-2 bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm text-sm">
    {content}
  </div>
</div>
```

### Pattern 7: Skeleton Loading
**What:** Animate-pulse gray placeholder blocks that match the shape of real content.
**When to use:** Consistent across all three pages during initial data fetch.
**Example:**
```typescript
// Source: https://tailwindcss.com/docs/animation + https://flowbite.com/docs/components/skeleton/
// Card skeleton for dashboard:
function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white rounded-xl border border-gray-200 p-4">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-full" />
    </div>
  )
}
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Calling Supabase from client components directly:** All DB access goes through `/api/*` routes. Client components only call `fetch('/api/...')`.
- **Using `getSession()` in Route Handlers:** Always use `getUser()` — `getSession()` does not revalidate against Supabase Auth server and can be spoofed.
- **Not awaiting `params` in dynamic route handlers:** In Next.js 15+, `params` is a Promise. `const { id } = params` (without await) will fail — always `await params` first.
- **Storing chat history in a global store:** Decided — chat state is local to ChatPage component only.
- **Optimistic updates:** Not in this phase. Show loading indicator during mutations, update UI only after server confirms.
- **Tabs for itinerary days:** Decided — single scrollable page with day section headers, no tab navigation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Client-side data fetching + caching | Custom fetch + useState + useEffect cache | `useSWR` | SWR handles deduplication, revalidation, error states, loading states, and `mutate()` — all built-in |
| Supabase server client setup | Custom cookie handling | `@supabase/ssr` `createClient()` | Already established in Phase 2; handles cookie reading/setting for Route Handlers correctly |
| UUID generation for temp message IDs | `Math.random()` hacks | `crypto.randomUUID()` | Available natively in modern browsers and Node.js — no package needed |
| OpenAI API calls | Raw `fetch` to `api.openai.com` | `openai` npm SDK | SDK handles auth headers, type safety, retry logic, and response parsing |
| Structured itinerary JSON | Custom regex parsing of AI prose | `response_format: { type: 'json_object' }` | Forces OpenAI to return valid JSON — eliminates parsing failures on malformed output |

**Key insight:** The biggest trap in this phase is accidentally calling Supabase from the client. The established `@supabase/ssr` pattern with Route Handlers is the correct architecture — resist the shortcut of importing the browser Supabase client and querying directly from page components.

---

## Common Pitfalls

### Pitfall 1: `params` Not Awaited in Dynamic Route Handlers
**What goes wrong:** `const { id } = context.params` throws a type error or returns undefined in Next.js 15+.
**Why it happens:** Next.js 15 made `context.params` a Promise (breaking change from 14).
**How to avoid:** Always `const { id } = await params` in every dynamic route handler.
**Warning signs:** TypeScript error on `params.id`, or `id` is `undefined` at runtime.

### Pitfall 2: `getSession()` Instead of `getUser()` in Route Handlers
**What goes wrong:** Authentication appears to work locally but is insecure — session cookie could be manipulated.
**Why it happens:** `getSession()` trusts the cookie without server-side revalidation.
**How to avoid:** Use `supabase.auth.getUser()` in all Route Handlers and Server Components. Only use `getSession()` in client-side code where it's acceptable.
**Warning signs:** Auth "working" even with an expired or invalid token.

### Pitfall 3: Itinerary JSON Truncation from OpenAI
**What goes wrong:** A 5-day itinerary generates fine but a 10-day itinerary's JSON is cut off mid-object, causing `JSON.parse()` to throw.
**Why it happens:** Default `max_tokens` may be too low for large itineraries.
**How to avoid:** Set `max_tokens: 4096` (or higher, up to model limit) in the itinerary generation call. Wrap `JSON.parse()` in try/catch and return a 500 with a clear message.
**Warning signs:** JSON parse errors only on longer trips.

### Pitfall 4: Chat History Not Scoped to User
**What goes wrong:** User A sees User B's chat messages.
**Why it happens:** Forgetting to filter by `user_id` in the `GET /api/chat/history` route, or RLS not enforced.
**How to avoid:** Always call `getUser()` first, then query `chat_history` — Supabase RLS (`user_id = auth.uid()`) will enforce this automatically when using the server client with a valid session.
**Warning signs:** Chat shows messages from other users, or all users share one thread.

### Pitfall 5: Missing `'use client'` Directive on Interactive Pages
**What goes wrong:** `useState`, `useEffect`, `useRouter` throw "You're importing a component that needs..." error at build time.
**Why it happens:** Next.js App Router defaults to Server Components. Any component using React hooks must be a Client Component.
**How to avoid:** All three main pages (Chat, Dashboard, Itinerary Detail) need `'use client'` at the top. Components that are pure presentation with no hooks can stay as Server Components.
**Warning signs:** Build error mentioning "hooks only work in client components."

### Pitfall 6: Uncontrolled Textarea in Chat Input
**What goes wrong:** Chat input doesn't clear after sending, or pressing Enter both sends and adds newline.
**Why it happens:** Not handling `keyDown` events and not resetting input state after send.
**How to avoid:** Use `value={input}` + `onChange` (controlled), handle `onKeyDown` with `e.key === 'Enter' && !e.shiftKey` to send, call `setInput('')` after sending.
**Warning signs:** Users see their message remain in the box after sending, or pressing Enter adds blank lines.

### Pitfall 7: SWR Key Collision
**What goes wrong:** Multiple SWR hooks with the same key share data unexpectedly, or mutations on one page silently invalidate unrelated data.
**Why it happens:** SWR uses the fetch URL as the cache key — identical URLs across pages share one cache entry.
**How to avoid:** Use specific, stable keys: `/api/itineraries` for list, `/api/itineraries/${id}` for single item. Call `mutate('/api/itineraries')` explicitly after create/delete.
**Warning signs:** Deleting an item on the dashboard also appears to affect the detail page, or vice versa.

---

## Code Examples

Verified patterns from official sources:

### Shared TypeScript Types (`src/lib/types.ts`)
```typescript
// These types mirror the Supabase schema (supabase/schema.sql)
export interface Activity {
  id: string
  itinerary_id: string
  day_number: number
  name: string
  time: string | null
  description: string | null
  location: string | null
  activity_type: string | null
}

export interface Itinerary {
  id: string
  user_id: string
  title: string
  description: string | null
  destination: string | null
  start_date: string | null  // ISO date string from Supabase DATE column
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// Shape of AI-generated itinerary JSON (for response_format: json_object)
export interface GeneratedItinerary {
  title: string
  destination: string
  start_date: string
  end_date: string
  description: string
  days: Array<{
    day_number: number
    activities: Array<{
      name: string
      time: string
      description: string
      location: string
    }>
  }>
}
```

### `POST /api/chat/message` Route Handler
```typescript
// src/app/api/chat/message/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are Barabula, an AI travel planning assistant.
Help users plan trips. When a user has given enough detail (destination, dates, rough preferences),
generate a complete day-by-day itinerary.
When generating an itinerary, respond ONLY with JSON matching this schema:
{"type": "itinerary", "data": { GeneratedItinerary shape }}`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json()

  // Fetch conversation history for context
  const { data: history } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(20)  // Keep context window manageable

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history ?? []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content },
    ],
    max_tokens: 4096,
  })

  const aiContent = completion.choices[0].message.content ?? ''

  // Persist both messages
  await supabase.from('chat_history').insert([
    { user_id: user.id, role: 'user', content },
    { user_id: user.id, role: 'assistant', content: aiContent },
  ])

  // Check if AI returned an itinerary
  try {
    const parsed = JSON.parse(aiContent)
    if (parsed.type === 'itinerary') {
      const itineraryData = parsed.data
      // Insert itinerary and activities into Supabase
      const { data: newItinerary } = await supabase
        .from('itineraries')
        .insert({ user_id: user.id, ...itineraryData })
        .select()
        .single()
      // Insert activities (flatten days)
      const activities = itineraryData.days.flatMap((day: any) =>
        day.activities.map((act: any) => ({ itinerary_id: newItinerary.id, day_number: day.day_number, ...act }))
      )
      await supabase.from('activities').insert(activities)
      return Response.json({
        content: "Your itinerary is ready! Taking you there now...",
        itineraryId: newItinerary.id,
      })
    }
  } catch {
    // Not JSON — regular chat response
  }

  return Response.json({ content: aiContent })
}
```

### Dashboard Empty State Component
```typescript
// Source: Empty state pattern from industry research — two CTAs (Wanderlog/Sygic pattern)
// src/components/dashboard/EmptyState.tsx
import Link from 'next/link'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {/* Simple SVG illustration or emoji placeholder */}
      <div className="text-6xl mb-6">🗺️</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h2>
      <p className="text-gray-500 mb-8 max-w-sm">
        Describe your dream trip to the AI or create one manually.
      </p>
      <div className="flex gap-3">
        <Link
          href="/chat"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Start a trip in Chat →
        </Link>
        <Link
          href="/itinerary/new"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          + Create manually
        </Link>
      </div>
    </div>
  )
}
```

### Itinerary Detail Day Section
```typescript
// Pattern: single scrollable page, day headers, activity rows
// Based on Wanderlog/Sygic day-by-day vertical list pattern
export function DaySection({ dayNumber, activities }: { dayNumber: number; activities: Activity[] }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3 sticky top-0 bg-gray-50 py-2">
        Day {dayNumber}
      </h2>
      <div className="space-y-3">
        {activities.map(activity => (
          <ActivityRow key={activity.id} activity={activity} />
        ))}
      </div>
    </section>
  )
}

export function ActivityRow({ activity }: { activity: Activity }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900">{activity.name}</p>
          {activity.time && (
            <p className="text-sm text-blue-600 mt-0.5">{activity.time}</p>
          )}
          {activity.location && (
            <p className="text-sm text-gray-500 mt-1">📍 {activity.location}</p>
          )}
          {activity.description && (
            <p className="text-sm text-gray-600 mt-2">{activity.description}</p>
          )}
        </div>
        {/* Edit/delete actions go here in Phase 3 */}
      </div>
    </div>
  )
}
```

---

## UI/UX Patterns from Top Travel Apps

This section documents patterns from Wanderlog, Sygic Travel, TripIt, and Rome2Rio that inform Barabula's design.

### Chat Interface Patterns

**Message differentiation (Expedia, AI travel apps pattern):**
- User messages: right-aligned, colored background (brand blue), no avatar
- AI messages: left-aligned, neutral background (light gray), small icon/avatar at start
- Message width: `max-w-xs lg:max-w-md` — prevents full-width bubbles that are hard to read
- Bubble corners: asymmetric rounding (sharp corner on the "tail" side) gives natural chat feel
- Timestamps: below each bubble in muted gray, `text-xs`

**Typing indicator (standard chat pattern):**
- Three animated dots (`animate-bounce` with staggered delays) inside an AI-styled bubble
- Show while `sending === true`, replace with actual response when received

**Itinerary in chat (CHAT-05 — structured rendering instead of raw text):**
- When AI returns an itinerary JSON, render a compact "itinerary preview card" in the chat bubble instead of the raw JSON string
- Card shows: trip title, destination, date range, and a count ("5 days, 15 activities")
- Below the card: "Your itinerary is ready! Taking you there now..." message
- Do NOT try to render all days/activities in-chat — the detail page is for that

**Input area (fixed-bottom pattern):**
- Sticky to chat container bottom, not viewport bottom (chat container is `flex flex-col h-full`, messages take `flex-1 overflow-y-auto`)
- Textarea with `resize-none`, 1 row default, max 4 rows
- Send button right of textarea, disabled when empty or sending
- Keyboard: `Enter` sends, `Shift+Enter` adds newline

### Dashboard Patterns

**Card grid (Wanderlog, Sygic pattern):**
- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Card: white background, subtle border (`border border-gray-200`), rounded corners (`rounded-xl`), gentle shadow (`shadow-sm`)
- Card content (top to bottom): destination line (bold), date range (secondary text), description snippet (2 lines, truncated), action row (delete button right-aligned)
- Hover state: slight shadow elevation (`hover:shadow-md transition-shadow`)
- Delete: text/icon button, shows confirm dialog or inline confirm before executing (prevent accidental deletes)

**Navigation to detail:** Full card is clickable (wrap in `<Link>` or add `onClick` with `router.push`)

**Create button:** Prominent "New Trip" or "+ Create manually" button in page header, above the card grid

### Itinerary Detail Patterns

**Page structure (Sygic Travel / Wanderlog pattern):**
- Header section: title (editable h1), destination + date range (metadata row), description (editable paragraph)
- Edit mode: inline editing — clicking title/description transforms them into input/textarea
- Day sections: each day is a `<section>` with sticky `h2` header while scrolling
- Activity cards: compact vertical list, activity name as primary text, time as secondary colored label, location with pin icon, description as body text

**Day header design:**
- `Day 1 — Monday, March 10` (if dates available, show day name)
- Sticky on scroll: `position: sticky; top: [navbar height]` so day context is always visible

**Activity management (add/edit/delete):**
- Add activity: "+ Add activity" button at the bottom of each day section
- Edit activity: clicking an activity card opens an inline form (expand-in-place, not modal) or a modal
- Delete activity: X button on card, no confirm needed for activities (low-stakes action)

**Color/typography approach (Wanderlog-inspired):**
- Primary action color: blue (`blue-600`) — main CTAs, time labels
- Neutral palette: white cards, `gray-50` page background, `gray-200` borders
- Typography: system font stack (Tailwind default), `font-semibold` for headings, `text-sm` for metadata
- Accent: destination and location use gray-500 with icons

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pages/api/*.ts` (Pages Router) | `app/api/*/route.ts` (App Router Route Handlers) | Next.js 13+ | Route Handlers use Web `Request`/`Response` APIs, not Node.js `req`/`res` |
| `context.params.id` (sync) | `await context.params` then `.id` | Next.js 15 (breaking change) | Must await params in all dynamic route handlers |
| `getSession()` for auth validation | `getUser()` for auth validation | Supabase SSR guidance | `getUser()` validates against Supabase Auth server; `getSession()` only reads cookie |
| Redux / class components for state | SWR / TanStack Query + React hooks | 2022–2024 | Server-state libraries eliminate most Redux use cases |
| Streaming AI responses (Phase 5) | Non-streaming in Phase 3 | Architectural decision | Streaming deferred to Phase 5 (Vercel AI SDK) |

**Deprecated/outdated:**
- `pages/api/` directory: Not used in this project (App Router only)
- `useEffect` for data fetching: Replaced by SWR `useSWR` for server state
- Direct Supabase client calls from React components: Replaced by API route pattern (project decision)

---

## Open Questions

1. **Itinerary intent detection in chat**
   - What we know: The AI must distinguish between "regular chat reply" and "here is a generated itinerary"
   - What's unclear: Prompt engineering reliability — can a system prompt reliably produce `{"type": "itinerary", ...}` vs. prose?
   - Recommendation: Use a two-call approach if needed: first classify intent, then call with `response_format: json_object` only when itinerary is requested. Or use a reliable system prompt and validate the response; fall back to displaying as prose if JSON parse fails.

2. **Activities stored separately vs. in `extra_data` JSONB**
   - What we know: The schema has a separate `activities` table with `day_number`, `name`, `time`, `description`, `location` columns. `itineraries.extra_data` is JSONB but unused for activities.
   - What's unclear: Whether to store activities in the `activities` table (normalized, queryable) or in `itineraries.extra_data` (simpler writes for AI-generated content)
   - Recommendation: Use the `activities` table as designed. It supports proper RLS, typed queries, and Phase 4 collaboration access control. `extra_data` is for unstructured metadata only.

3. **Activity edit UX: inline vs. modal**
   - What we know: Full edit (add/edit/delete activities) is in scope for Phase 3
   - What's unclear: Inline expand-in-place editing is smoother UX but harder to implement than a modal
   - Recommendation: Modal dialog for activity edit/create (simpler state management), inline delete button. This avoids layout reflow complexity.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (not yet installed) |
| Config file | `vitest.config.mts` — Wave 0 gap |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test -- --run --coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | ChatPage renders message thread container | unit | `npm run test -- --run src/__tests__/chat-page.test.tsx` | ❌ Wave 0 |
| CHAT-02 | `/api/chat/message` returns AI content | manual/smoke | Manual: POST with Postman/curl | N/A |
| CHAT-03 | `/api/chat/history` returns messages array | manual/smoke | Manual: GET with curl | N/A |
| CHAT-04 | ChatPage calls `router.push` after itinerary response | unit | `npm run test -- --run src/__tests__/chat-navigation.test.tsx` | ❌ Wave 0 |
| CHAT-05 | ItineraryCard in chat renders title/destination/dates | unit | `npm run test -- --run src/__tests__/itinerary-card.test.tsx` | ❌ Wave 0 |
| DASH-01 | DashboardPage renders card grid when data present | unit | `npm run test -- --run src/__tests__/dashboard-page.test.tsx` | ❌ Wave 0 |
| DASH-04 | Delete button calls DELETE API then re-fetches | unit | `npm run test -- --run src/__tests__/dashboard-page.test.tsx` | ❌ Wave 0 |
| DASH-05 | DashboardPage renders EmptyState when no itineraries | unit | `npm run test -- --run src/__tests__/dashboard-page.test.tsx` | ❌ Wave 0 |
| ITIN-01 | ItineraryDetailPage renders day sections | unit | `npm run test -- --run src/__tests__/itinerary-detail.test.tsx` | ❌ Wave 0 |
| ITIN-02 | ActivityRow renders name, time, location, description | unit | `npm run test -- --run src/__tests__/activity-row.test.tsx` | ❌ Wave 0 |
| ITIN-05 | useSWR hook shows loading skeleton, error message | unit | `npm run test -- --run src/__tests__/loading-states.test.tsx` | ❌ Wave 0 |
| ITIN-06 | Activity type has all four required fields | unit (type check) | `npx tsc --noEmit` | N/A (TypeScript build) |

### Sampling Rate
- **Per task commit:** `npm run test -- --run` (fast unit tests only)
- **Per wave merge:** `npm run test -- --run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.mts` — Vitest config does not exist yet
- [ ] `package.json` test script — needs `"test": "vitest"` added
- [ ] `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`
- [ ] `src/__tests__/setup.ts` — mock `next/navigation` (`useRouter`, `usePathname`)
- [ ] `src/__tests__/chat-page.test.tsx` — covers CHAT-01, CHAT-04
- [ ] `src/__tests__/itinerary-card.test.tsx` — covers CHAT-05
- [ ] `src/__tests__/dashboard-page.test.tsx` — covers DASH-01, DASH-04, DASH-05
- [ ] `src/__tests__/itinerary-detail.test.tsx` — covers ITIN-01, ITIN-02
- [ ] `src/__tests__/activity-row.test.tsx` — covers ITIN-02
- [ ] `src/__tests__/loading-states.test.tsx` — covers ITIN-05

---

## Sources

### Primary (HIGH confidence)
- Next.js 16.1.6 official docs (`nextjs.org/docs/app/api-reference/file-conventions/route`) — Route Handler patterns, dynamic params as Promise, `params` must be awaited
- Supabase SSR docs (`supabase.com/docs/guides/auth/server-side/creating-a-client`) — `getUser()` vs `getSession()`, Route Handler client setup
- Next.js Vitest guide (`nextjs.org/docs/app/guides/testing/vitest`, version 16.1.6) — setup, limitations with async Server Components, mock requirements
- SWR docs (`swr.vercel.app/docs/mutation`) — `useSWR`, `useSWRMutation`, `mutate()` pattern

### Secondary (MEDIUM confidence)
- OpenAI Node SDK GitHub (`github.com/openai/openai-node`) — `chat.completions.create()`, `choices[0].message.content`, `response_format: { type: 'json_object' }`
- Flowbite chat bubble docs (`flowbite.com/docs/components/chat-bubble/`) — Tailwind CSS chat bubble structure and classes
- Wanderlog behavioral design analysis (`designli.co`) — orange primary CTAs, neutral palette, progressive disclosure pattern, Google Docs-style simplicity
- Industry research on travel app UI patterns (Wanderlog, Sygic Travel, TripIt) — card grids, day-by-day sections, activity timeline, empty states

### Tertiary (LOW confidence — needs validation)
- Itinerary intent detection via system prompt (documented as open question) — no official source; based on OpenAI `response_format` behavior patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are current versions with official docs verified
- Architecture: HIGH — Route Handler + Supabase server client pattern matches existing Phase 2 code exactly
- UI patterns: MEDIUM — derived from research into real travel apps; exact implementations are Claude's discretion
- Pitfalls: HIGH — params-as-Promise and getUser() vs. getSession() are documented breaking changes in official Next.js/Supabase docs
- Validation architecture: HIGH — Vitest setup verified against Next.js 16.1.6 official guide

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable libraries — Next.js, Supabase, SWR, OpenAI SDK change slowly)
