# Phase 8: AI Chat Functionality with OpenAI - Research

**Researched:** 2026-03-11
**Domain:** OpenAI API, stateful conversation design, structured JSON extraction, Next.js App Router streaming
**Confidence:** HIGH (core API patterns), MEDIUM (system prompt engineering best practices)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use OpenAI API; API key in `OPENAI_API_KEY` env var (already set in Vercel)
- Extract structured travel data from free-form user messages
- Track trip state across the conversation — persist in DB or session
- Ask only for missing information; never repeat already-known fields
- Reflect back a concise "trip understanding summary" before the full itinerary
- Offer guided next-step suggestion chips in the UI
- Tone: warm, confident, concise, lightly witty — never cheesy, never salesy, never support-bot-like
- Trip state schema fields: destination, origin, dates.start, dates.end, duration_days, travelers.count, travelers.type, budget, interests[], travel_style, pace, constraints[], notes
- Conversation flow: ask destination first, then who/dates/origin/interests; parse all provided at once
- Return "trip understanding summary" then offer suggestion chips; generate itinerary after confirmation
- Itinerary: day-by-day, morning/afternoon/evening, practical details, clear formatting
- Response length: 2–8 sentences except for itinerary generation

### Claude's Discretion
- Choice of OpenAI model (gpt-4o recommended for quality)
- System prompt engineering and formatting
- How trip state is persisted (session vs DB — likely use existing chat_history or a new column)
- Streaming vs non-streaming (streaming preferred for perceived speed)
- How suggestion chips are sent back as user messages
- Exact JSON schema for trip state storage/extraction
- Error handling for OpenAI API failures

### Deferred Ideas (OUT OF SCOPE)
- Collaborative itinerary editing / multi-user planning (Phase 4)
- Saving itineraries to DB and navigating them in the right panel (deferred until AI pipeline live)
- Destination cards on landing page linking to pre-generated itineraries
- Real-time streaming token-by-token display (can start with full response, add streaming later)
</user_constraints>

---

## Summary

The existing `/api/chat/message` route already calls gpt-4o, persists messages to `chat_history`, and detects an itinerary JSON blob to save it to Supabase. The system prompt is minimal and stateless — it only tells the model to output a JSON envelope when enough data is present. Phase 8 replaces this with a fully stateful, guided conversation loop.

The core design challenge is a "dual output" problem: each AI turn needs to produce (a) a natural language reply for the chat bubble, AND (b) a structured JSON trip state delta so the server can track what the user has shared. The cleanest approach for the current stack is to use OpenAI Structured Outputs (`openai.beta.chat.completions.parse()` with `zodResponseFormat`) so the response schema is enforced reliably. The schema wraps both the prose reply and the state delta in a single top-level object. This eliminates the fragile `JSON.parse(aiContent)` try/catch already in the route.

Trip state is best persisted as a `JSONB` column (`trip_state`) on the existing `chat_history` table — or as a separate `trip_sessions` table — rather than reconstructed from message history on every turn. Storing it in the DB means any server restart, new tab, or return visit has full continuity without replaying conversation. The `chat_history` table already has a `user_id` but no per-session grouping; a simple `conversations` table or an `extra_data` column augment on `chat_history` rows can hold the running state without a schema overhaul.

**Primary recommendation:** Use `openai.beta.chat.completions.parse()` + `zodResponseFormat` for structured dual-output (prose + state delta). Persist the accumulated trip state in a `trip_state` JSONB column. Do NOT stream in Phase 8 (streaming is explicitly deferred). Wire the existing `QuickActionChips` component to make chips context-aware (render different chips based on `conversationPhase`).

---

## What Already Exists (Codebase Audit)

| File | What It Does | Phase 8 Change |
|------|-------------|----------------|
| `src/app/api/chat/message/route.ts` | Posts to gpt-4o, saves both messages, detects itinerary JSON | Full replacement: stateful system prompt, structured output, trip state load/save |
| `src/app/api/chat/history/route.ts` | Fetches all chat_history rows | Add trip_state fetch alongside history |
| `src/app/(authenticated)/chat/page.tsx` | Sends messages, renders bubbles, chips, passes itinerary data to ContextPanel | Add `conversationPhase` state, pass dynamic chips config, render trip summary block |
| `src/components/chat/QuickActionChips.tsx` | Static 3-chip list (Looks good / Change dates / Add a budget) | Make chips dynamic — accept `chips` prop driven by `conversationPhase` |
| `src/components/chat/ContextPanel.tsx` | Shows ambient image or final itinerary card | Extend to show "trip understanding" summary during planning phase |
| `src/lib/types.ts` | ChatMessage, Itinerary, Activity, GeneratedItinerary types | Add TripState type, ConversationPhase, AIResponse type |
| `supabase/schema.sql` | chat_history has no trip_state column | Add trip_state JSONB column (or new trip_sessions table) |

**Key insight:** The page already has `callApi()` / `sendMessage()` split and `QuickActionChips` accepts an `onSend` callback. The chip text just needs to be made dynamic.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai | ^6.27.0 (installed) | OpenAI API calls, structured outputs | Already installed; v6 supports `beta.chat.completions.parse()` and `zodResponseFormat` |
| zod | needs install | Schema definition for structured outputs | Required by `zodResponseFormat` helper; OpenAI SDK lists it as optional peer dep |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| openai/helpers/zod | bundled with openai | `zodResponseFormat` utility | Required for parse() structured output approach |

**Installation:**
```bash
npm install zod
```
(openai is already installed at ^6.27.0)

---

## Architecture Patterns

### Pattern 1: Dual-Output Structured Response Schema

Every AI turn returns a single structured object. The server extracts the prose for the chat bubble and the trip state delta to merge into persisted state.

```typescript
// Source: openai npm package, openai/helpers/zod
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'

const TripStateSchema = z.object({
  destination: z.string().nullable(),
  origin: z.string().nullable(),
  dates_start: z.string().nullable(),   // ISO date string
  dates_end: z.string().nullable(),
  duration_days: z.number().nullable(),
  travelers_count: z.number().nullable(),
  travelers_type: z.string().nullable(), // solo|couple|family|friends|group
  budget: z.string().nullable(),
  interests: z.array(z.string()),
  travel_style: z.string().nullable(),
  pace: z.string().nullable(),           // slow|moderate|packed
  constraints: z.array(z.string()),
  notes: z.string().nullable(),
})

export const AIResponseSchema = z.object({
  reply: z.string(),                              // prose for chat bubble
  trip_state: TripStateSchema,                    // full current state (not delta)
  conversation_phase: z.enum([                    // drives chip selection
    'gathering_destination',
    'gathering_details',
    'ready_for_summary',
    'summary_shown',
    'generating_itinerary',
    'itinerary_complete',
  ]),
  itinerary: z.object({                           // only populated when phase = itinerary_complete
    title: z.string(),
    destination: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    description: z.string(),
    days: z.array(z.object({
      day_number: z.number(),
      activities: z.array(z.object({
        name: z.string(),
        time: z.string(),
        description: z.string(),
        location: z.string(),
      })),
    })),
  }).nullable(),
})

// In API route:
const completion = await openai.beta.chat.completions.parse({
  model: 'gpt-4o',
  max_tokens: 4096,
  response_format: zodResponseFormat(AIResponseSchema, 'ai_response'),
  messages: [
    { role: 'system', content: buildSystemPrompt(currentTripState) },
    ...history,
    { role: 'user', content: userMessage },
  ],
})

const parsed = completion.choices[0].message.parsed // typed as z.infer<typeof AIResponseSchema>
```

**Why full state, not delta:** The model sees the full conversation and knows all context. Asking it to return a full state snapshot (with `null` for unknowns) is simpler and more reliable than a delta merge. The server just replaces the stored state with the latest snapshot.

### Pattern 2: Trip State Persistence (DB approach)

Add a `trip_state` JSONB column to `chat_history` only on assistant rows — or better, create a single `trip_sessions` row per user that stores the accumulating state.

**Recommended: `trip_sessions` table** (1 row per user, upserted on each turn)

```sql
-- Add to supabase/schema.sql
CREATE TABLE public.trip_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  trip_state JSONB DEFAULT '{}',
  conversation_phase TEXT DEFAULT 'gathering_destination',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trip_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own trip session"
  ON public.trip_sessions FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
```

**Why not front-end state:** A page refresh, navigation away, or opening on a different device would lose state. The conversation history is in the DB; the trip state should be too.

**Why not reconstruct from message history:** Expensive and unreliable — would require re-parsing all past messages or calling the API again.

**Why `trip_sessions` over a JSONB column on `chat_history`:** Clean separation. Only one row per user, simple upsert. No need to track which chat_history row has the latest state.

**API route pattern — load/save cycle:**
```typescript
// 1. Load state at start of POST handler
const { data: session } = await supabase
  .from('trip_sessions')
  .select('trip_state, conversation_phase')
  .eq('user_id', user.id)
  .maybeSingle()

const currentTripState = session?.trip_state ?? {}
const currentPhase = session?.conversation_phase ?? 'gathering_destination'

// 2. Call OpenAI with state injected into system prompt
const completion = await openai.beta.chat.completions.parse({ ... })
const parsed = completion.choices[0].message.parsed

// 3. Upsert updated state
await supabase.from('trip_sessions').upsert({
  user_id: user.id,
  trip_state: parsed.trip_state,
  conversation_phase: parsed.conversation_phase,
  updated_at: new Date().toISOString(),
}, { onConflict: 'user_id' })
```

### Pattern 3: System Prompt Design

The system prompt must:
1. Declare the AI's persona and tone rules
2. Inject the current trip state as structured context so the model knows what's already known
3. Give explicit rules for the conversation flow (what to ask, when to summarize, when to generate)
4. Explain the output schema so the model populates it correctly

```
You are Barabula, a warm and witty AI travel planner. Your replies are concise (2–8 sentences),
confident, and lightly playful — never cheesy, never salesy, never like a support bot.

## Current Trip State
{JSON.stringify(currentTripState, null, 2)}

## Current Phase
{currentPhase}

## Rules
- If destination is unknown, ask for it (this is your only question in this turn).
- Once destination is known, gather: who is traveling, dates, origin city, and interests/vibe.
- If the user provides multiple fields at once, extract all of them — never ask for info already given.
- Do not ask more than one question per turn.
- Once destination + dates + travelers + at least one interest are known, set phase = ready_for_summary
  and include a concise trip understanding summary in your reply.
- After summary, set phase = summary_shown and stop asking questions.
- If the user confirms or says "looks good" (or similar), set phase = generating_itinerary and
  generate the full itinerary in the `itinerary` field.
- Always return the FULL trip_state with every known field populated and unknowns as null.
- Always set conversation_phase accurately.
- Keep `itinerary` null unless phase = itinerary_complete.
```

**Key insight:** Injecting `currentTripState` into the system prompt on every turn means the model never needs to re-read the full conversation history to know what's been collected. The conversation history (last 20 messages) provides the dialogue flow; the state object provides the facts.

### Pattern 4: Dynamic Suggestion Chips

`QuickActionChips` currently renders a static array. Phase 8 makes it context-aware.

```typescript
// In chat/page.tsx
const CHIP_SETS: Record<ConversationPhase, ChipConfig[]> = {
  gathering_destination: [],
  gathering_details: [],
  ready_for_summary: [
    { label: 'Looks good', message: 'Looks good! Generate my full itinerary.' },
    { label: 'Change dates', message: 'I want to change the dates.' },
    { label: 'Add budget', message: 'Can you factor in a budget for this trip?' },
    { label: 'More relaxed pace', message: 'Make it more relaxed — fewer activities.' },
    { label: 'Add hidden gems', message: 'Add some hidden gems and local spots.' },
  ],
  summary_shown: [
    { label: 'Looks good', message: 'Looks good! Generate my full itinerary.' },
    { label: 'Change dates', message: 'I want to change the dates.' },
    { label: 'Add budget', message: 'Can you factor in a budget for this trip?' },
    { label: 'Make it romantic', message: 'Make it more romantic.' },
    { label: 'Add hidden gems', message: 'Add some hidden gems and local spots.' },
  ],
  generating_itinerary: [],
  itinerary_complete: [],
}
```

`QuickActionChips` receives `chips={CHIP_SETS[conversationPhase]}` and renders only when chips array is non-empty.

### Pattern 5: ContextPanel Trip Summary View

The right panel should show a "trip understanding" summary once `ready_for_summary` phase is reached, not just after itinerary generation. This requires passing `tripState` and `conversationPhase` from the chat page down to `ContextPanel`.

**Recommended approach:** Add a `TripSummaryPanel` to `ContextPanel` that activates when phase is `ready_for_summary` or `summary_shown`. It shows the known trip fields in a scannable card format. The `itinerary_complete` phase keeps the existing `ItineraryPanel`.

### Recommended Project Structure
```
src/
├── app/api/chat/
│   └── message/route.ts       # Replace: stateful system prompt, parse(), trip_sessions upsert
├── components/chat/
│   ├── QuickActionChips.tsx   # Update: accept chips prop, dynamic sets
│   └── ContextPanel.tsx       # Update: add TripSummaryPanel for ready_for_summary phase
├── lib/
│   ├── types.ts               # Add: TripState, ConversationPhase, AIResponse types
│   └── ai/
│       ├── schemas.ts         # New: Zod schemas (AIResponseSchema, TripStateSchema)
│       └── system-prompt.ts   # New: buildSystemPrompt(state, phase) function
└── supabase/
    └── schema.sql             # Add: trip_sessions table + RLS
```

### Anti-Patterns to Avoid
- **Parsing JSON from prose response:** The current `try { JSON.parse(aiContent) }` approach is fragile. Structured Outputs eliminates this entirely.
- **Sending full conversation history for state reconstruction:** Expensive and error-prone. Use the `trip_sessions` table.
- **Asking the model for only a delta:** Full state snapshot is simpler and avoids merge logic bugs.
- **Streaming in Phase 8:** Explicitly deferred. Start with full response (already works) and the UI already has a typing indicator. Add streaming in a future phase.
- **Importing zod from `openai/helpers/zod`:** zod must be installed separately — it is an optional peer dependency of the openai package.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation of AI response | Custom JSON validator | `zodResponseFormat` + `openai.beta.chat.completions.parse()` | 100% schema compliance via constrained decoding; automatic TypeScript types |
| JSON Schema from TypeScript types | Manual schema writing | `zod` schema definition | Type-safe, composable, runtime-validated |
| Trip state merge logic | Diff/patch algorithm | Full state snapshot from model | Model has all context; simpler to replace than merge |
| Conversation turn management | Custom state machine | `conversation_phase` enum in Zod schema | Model tracks its own phase reliably when given clear rules |

---

## Common Pitfalls

### Pitfall 1: Zod Not Installed
**What goes wrong:** `zodResponseFormat` import from `openai/helpers/zod` throws at runtime with "Cannot find module 'zod'" even though openai is installed.
**Why it happens:** Zod is an optional peer dependency of the openai package — not automatically installed.
**How to avoid:** Run `npm install zod` before writing any schema code.
**Warning signs:** TypeScript import error or runtime module-not-found on first test run.

### Pitfall 2: Structured Outputs Schema Restrictions
**What goes wrong:** `zodResponseFormat` throws at API call time with a schema validation error about `additionalProperties` or nullable types.
**Why it happens:** OpenAI Structured Outputs has constraints: all object properties must be listed in `required`, `additionalProperties` must be `false`, and nullable types use `anyOf: [{type: "null"}, ...]` internally (Zod handles this with `.nullable()`).
**How to avoid:** Use `.nullable()` not `.optional()` for optional fields. Keep schema flat where possible. Test the schema against the API before building the rest of the pipeline.
**Warning signs:** `400 Bad Request` from OpenAI with a message about JSON schema constraints.

### Pitfall 3: `parse()` vs `create()` Confusion
**What goes wrong:** Using `openai.chat.completions.create()` with `response_format: zodResponseFormat(...)` — this does NOT automatically parse and type the response.
**Why it happens:** `create()` accepts `response_format` but returns raw content string. `parse()` is the method that validates and types the response.
**How to avoid:** Use `openai.beta.chat.completions.parse()` (note: `beta` namespace) whenever you want typed, validated structured output.
**Warning signs:** TypeScript type is `string` on `choices[0].message.content` instead of the Zod schema type.

### Pitfall 4: Existing Tests Break
**What goes wrong:** Existing `src/__tests__/api/chat.test.ts` mocks `openai` as a class with `chat.completions.create`. After Phase 8, the route uses `beta.chat.completions.parse` — the mock no longer matches.
**Why it happens:** The mock was written for the Phase 3 route shape.
**How to avoid:** Update the mock in `chat.test.ts` to mock `beta.chat.completions.parse` instead. The mock class needs a `beta` property.
**Warning signs:** Tests pass (because mock returns undefined, not throwing) but the test is not actually testing the new code path.

### Pitfall 5: History Limit + State Size
**What goes wrong:** Conversation grows beyond 20 messages; history is truncated; model loses context of early conversation even though state is injected.
**Why it happens:** The current route fetches `.limit(20)`. With trip state injected into the system prompt, the 20-message window is enough for dialogue context (state covers facts). But if history is truncated mid-summary the model may re-ask questions.
**How to avoid:** The `trip_sessions` state injection means facts are always preserved even when history is truncated. Keep the 20-message limit for now — it is sufficient for the dialogue flow. The system prompt should say "the trip_state below is authoritative — do not re-ask for information that is non-null."
**Warning signs:** Model asks for destination again mid-conversation.

### Pitfall 6: Trip Session Not Cleared on New Trip
**What goes wrong:** User completes a trip, wants to plan a new one, but the old trip state is still in `trip_sessions` — the model starts in "itinerary_complete" phase.
**How to avoid:** Add a "Start new trip" chip (or button) that calls a `DELETE /api/chat/session` route to clear the `trip_sessions` row. Or reset automatically when a new conversation is detected (e.g., first message after itinerary_complete).
**Warning signs:** User types "I want to plan a trip to Tokyo" but gets a response referencing the previous itinerary.

---

## Code Examples

### Full API Route Pattern
```typescript
// src/app/api/chat/message/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { AIResponseSchema } from '@/lib/ai/schemas'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const { content } = await req.json()
  if (!content?.trim()) return Response.json({ error: 'Message content is required' }, { status: 400 })

  // Load trip state
  const { data: session } = await supabase
    .from('trip_sessions')
    .select('trip_state, conversation_phase')
    .eq('user_id', user.id)
    .maybeSingle()

  const currentTripState = session?.trip_state ?? {}
  const currentPhase = session?.conversation_phase ?? 'gathering_destination'

  // Load last 20 messages for dialogue context
  const { data: history } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(20)

  // Call OpenAI with structured output
  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o',
    max_tokens: 4096,
    response_format: zodResponseFormat(AIResponseSchema, 'ai_response'),
    messages: [
      { role: 'system', content: buildSystemPrompt(currentTripState, currentPhase) },
      ...(history ?? []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content },
    ],
  })

  const parsed = completion.choices[0].message.parsed
  if (!parsed) return Response.json({ error: 'AI response failed to parse' }, { status: 500 })

  // Persist chat messages
  await supabase.from('chat_history').insert([
    { user_id: user.id, role: 'user', content },
    { user_id: user.id, role: 'assistant', content: parsed.reply },
  ])

  // Upsert trip state
  await supabase.from('trip_sessions').upsert({
    user_id: user.id,
    trip_state: parsed.trip_state,
    conversation_phase: parsed.conversation_phase,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  // If itinerary was generated, save it
  if (parsed.itinerary && parsed.conversation_phase === 'itinerary_complete') {
    const { days, ...itineraryFields } = parsed.itinerary
    const { data: newItinerary } = await supabase
      .from('itineraries')
      .insert({ user_id: user.id, ...itineraryFields })
      .select()
      .single()

    if (newItinerary) {
      const activities = days.flatMap(day =>
        day.activities.map(act => ({
          itinerary_id: newItinerary.id,
          day_number: day.day_number,
          ...act,
        }))
      )
      if (activities.length > 0) {
        await supabase.from('activities').insert(activities)
      }
      return Response.json({
        content: parsed.reply,
        itineraryId: newItinerary.id,
        conversationPhase: parsed.conversation_phase,
        tripState: parsed.trip_state,
      })
    }
  }

  return Response.json({
    content: parsed.reply,
    conversationPhase: parsed.conversation_phase,
    tripState: parsed.trip_state,
  })
}
```

### System Prompt Builder
```typescript
// src/lib/ai/system-prompt.ts
export function buildSystemPrompt(tripState: Record<string, unknown>, phase: string): string {
  return `You are Barabula, a warm and witty AI travel planner. Your replies are concise (2–8 sentences unless generating an itinerary), confident, and lightly playful — never cheesy, never salesy, never like a support bot.

## Current Trip State (authoritative — do not re-ask for non-null fields)
${JSON.stringify(tripState, null, 2)}

## Current Phase
${phase}

## Conversation Rules
- NEVER ask for information already present (non-null) in the trip state above.
- If destination is null, ask for it — this is your only question in this turn.
- Once destination is known, gather (in natural order): who is traveling, dates, origin city, and interests/vibe.
- If the user provides multiple fields at once, extract all of them.
- Do not ask more than one question per turn.
- Once destination + dates + travelers + at least one interest are all non-null, set conversation_phase = "ready_for_summary" and include a natural-language trip understanding summary in your reply.
- After the summary is shown (phase = summary_shown), wait for the user to confirm or adjust.
- When the user confirms ("looks good", "generate it", etc.), set conversation_phase = "generating_itinerary", then immediately set conversation_phase = "itinerary_complete" and populate the itinerary field.
- The itinerary should be day-by-day with morning/afternoon/evening activities. Include practical details (transport suggestions, cost notes if budget known). Format for clarity, not verbosity.
- Always return the FULL trip_state reflecting all known fields. Unknowns are null.
- Always set conversation_phase accurately based on the above rules.
- Keep itinerary null unless conversation_phase = "itinerary_complete".`
}
```

### Updated Mock Pattern for Tests
```typescript
// In chat.test.ts — mock for beta.chat.completions.parse
vi.mock('openai', () => {
  class MockOpenAI {
    beta = {
      chat: {
        completions: {
          parse: vi.fn().mockResolvedValue({
            choices: [{
              message: {
                parsed: {
                  reply: 'Where would you like to go?',
                  trip_state: { destination: null },
                  conversation_phase: 'gathering_destination',
                  itinerary: null,
                }
              }
            }]
          })
        }
      }
    }
  }
  return { default: MockOpenAI }
})
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `response_format: { type: "json_object" }` | `zodResponseFormat` + `beta.chat.completions.parse()` | 100% schema reliability vs. prompt-only enforcement |
| Try/catch JSON.parse on prose response | Structured Outputs with constrained decoding | Eliminates parse failures, provides TypeScript types |
| Stateless system prompt | State-injected system prompt per turn | Model never re-asks for known fields |
| Static suggestion chips | Dynamic chips driven by conversation_phase | Chips relevant to where user is in the flow |

**Model note:** `gpt-4o` (latest, not a dated snapshot) is appropriate for this use case. It supports Structured Outputs and has a 128K context window. At ~20 messages of history + system prompt (~1K tokens) + max 4096 output, a typical conversation uses well under 10K tokens total — well within budget.

---

## Open Questions

1. **Trip session reset on new trip**
   - What we know: `trip_sessions` table is 1 row per user; `itinerary_complete` phase is a terminal state.
   - What's unclear: Should starting a new trip auto-clear the session (detect a new destination in an itinerary_complete session), or require an explicit "New trip" action?
   - Recommendation: Add an explicit "Plan a new trip" chip when phase = `itinerary_complete`. Clicking it calls `DELETE /api/chat/session` and refreshes the page. Simpler and less surprising than auto-detection.

2. **ContextPanel trip summary display**
   - What we know: `ContextPanel` currently shows ambient image (during gathering) and itinerary card (after generation). The CONTEXT.md specifies the right panel should show a "trip understanding summary."
   - What's unclear: Should the trip summary appear in the right panel during `ready_for_summary`/`summary_shown` phases, or only in the chat bubble?
   - Recommendation: Show it in both: the chat bubble gets the natural language summary; the right panel (`ContextPanel`) transitions from ambient to a `TripSummaryPanel` showing the structured fields in card form. This leverages the existing `AnimatePresence` transition.

3. **Vitest mock depth for `beta.chat.completions.parse`**
   - What we know: The existing mock in `chat.test.ts` mocks `chat.completions.create`. The new route uses `beta.chat.completions.parse`.
   - Recommendation: Update the mock to add a `beta` property to `MockOpenAI` (see Code Examples above). The mock also needs to account for `trip_sessions` Supabase queries (`.maybeSingle()` pattern).

---

## Validation Architecture

`nyquist_validation` is `true` in `.planning/config.json`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run src/__tests__/api/chat.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| AI-CHAT-01 | POST /api/chat/message returns parsed structured output | unit | `npx vitest run src/__tests__/api/chat.test.ts` | ✅ (needs update) |
| AI-CHAT-02 | Route returns `conversationPhase` and `tripState` in response | unit | `npx vitest run src/__tests__/api/chat.test.ts` | ✅ (needs new case) |
| AI-CHAT-03 | Trip state is upserted to trip_sessions on each turn | unit | `npx vitest run src/__tests__/api/chat.test.ts` | ✅ (needs new case) |
| AI-CHAT-04 | Itinerary is saved and itineraryId returned when phase=itinerary_complete | unit | `npx vitest run src/__tests__/api/chat.test.ts` | ✅ (needs update) |
| AI-CHAT-05 | QuickActionChips renders correct chips for each phase | unit | `npx vitest run src/__tests__/quick-action-chips.test.tsx` | ✅ (needs update) |
| AI-CHAT-06 | ContextPanel shows TripSummaryPanel when ready_for_summary | unit | `npx vitest run src/__tests__/context-panel.test.tsx` | ✅ (needs new case) |
| AI-CHAT-07 | Chat page sends conversationPhase to QuickActionChips | unit | `npx vitest run src/__tests__/chat-page.test.tsx` | ✅ (needs update) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/api/chat.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/ai/schemas.ts` — Zod schema definitions (new file, no tests yet)
- [ ] `src/lib/ai/system-prompt.ts` — system prompt builder (new file, no tests yet)
- [ ] `supabase/schema.sql` `trip_sessions` table — must be added before route tests pass
- [ ] `zod` npm dependency — must be installed before schemas.ts can be imported

---

## Sources

### Primary (HIGH confidence)
- openai npm package (openai@6.x) — `beta.chat.completions.parse()`, `zodResponseFormat` from `openai/helpers/zod`
- Supabase Docs — JSONB column storage, upsert patterns
- Project codebase audit — `/api/chat/message/route.ts`, `/api/chat/history/route.ts`, `chat/page.tsx`, `lib/types.ts`, `supabase/schema.sql`

### Secondary (MEDIUM confidence)
- [Structured Outputs — OpenAI API docs](https://platform.openai.com/docs/guides/structured-outputs) — zodResponseFormat, json_schema response_format, constrained decoding
- [Using Zod and zodResponseFormat for Structured Outputs](https://hooshmand.net/zod-zodresponseformat-structured-outputs-openai/) — `openai/helpers/zod` import path, `.parse()` method
- [ReadableStream in Next.js App Router](https://github.com/vercel/next.js/discussions/50614) — streaming pattern reference (relevant to future streaming phase)
- [OpenAI streaming structured outputs community post](https://community.openai.com/t/streaming-structured-outputs-in-node-js/979688) — confirms streaming + structured outputs is supported (deferred to future phase)

### Tertiary (LOW confidence)
- Trip state design pattern (OpenAI Cookbook travel concierge example) — system prompt injection approach for stateful agents

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — openai@6 is installed, zod is the standard pair, `beta.chat.completions.parse()` is the documented API
- Architecture (structured output schema): HIGH — verified against openai-node API surface
- Trip state persistence: HIGH — Supabase JSONB upsert is well-documented, pattern is straightforward
- System prompt engineering: MEDIUM — best practices informed by OpenAI Cookbook and community; exact wording requires iteration
- Pitfalls: HIGH — all identified from codebase audit and known SDK constraints

**Research date:** 2026-03-11
**Valid until:** 2026-06-11 (openai SDK v6 API surface is stable; structured outputs GA since August 2024)
