# Phase 8: AI Chat Functionality with OpenAI - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning
**Source:** User requirements from /gsd:add-phase

<domain>
## Phase Boundary

This phase wires up the chat UI to OpenAI, implementing the full conversational AI pipeline: structured trip state extraction, stateful multi-turn conversation, itinerary generation, and guided suggestion chips. The result is a working AI travel planner chat — users type naturally and get a complete itinerary.

</domain>

<decisions>
## Implementation Decisions

### AI Provider
- Use OpenAI API (user has API key ready)
- Store key in environment variable `OPENAI_API_KEY`

### Core Behavior
1. Extract structured travel data from free-form user messages
2. Track trip state across the conversation (persist in DB or session)
3. Ask only for missing information needed to progress — never repeat already-known fields
4. Reflect back a concise structured "trip understanding summary" before generating a full itinerary
5. Offer guided next-step suggestion chips in the UI
6. Tone: warm, confident, concise, lightly witty — never cheesy, never salesy, never support-bot-like

### Trip State Schema
Track these fields across the conversation:
```
- destination
- origin
- dates.start
- dates.end
- duration_days
- travelers.count
- travelers.type (solo, couple, family, friends, etc.)
- budget
- interests[]
- travel_style
- pace
- constraints[]
- notes
```

### Conversation Flow Rules
- If destination is missing, ask for it first
- Once destination is known, gather minimum viable planning info in natural order:
  - who is traveling
  - dates
  - origin/departure city
  - interests / vibe
- If the user provides multiple pieces of info in one message, parse all of them (don't ask one by one)
- Do not ask repetitive questions for already-known fields
- After enough information is gathered, return a "trip understanding summary" before generating the itinerary
- After summary, offer suggestion chips for user to confirm or adjust:
  - "Looks good"
  - "Change dates"
  - "Add budget"
  - "Make it more romantic"
  - "Add hidden gems"
- When generating itineraries, optimize for clarity and usefulness over verbosity

### Response Style
- Natural, polished, modern
- Light personality and occasional tasteful humor
- Never cheesy, never overly salesy
- Avoid sounding like a support bot
- Keep most replies between 2 and 8 sentences unless generating an itinerary

### Session Model
- One `trip_sessions` row per user (`UNIQUE user_id`) — intentional. The itinerary is the durable artifact; the session is ephemeral planning state.
- "Plan a new trip" resets the session, but must show a browser confirmation first: "This will clear your current [destination] planning — continue?" — no silent destructive overwrites.

### Conversation Phases
- `summary_shown` phase is DROPPED. Phases are: `gathering_destination` → `gathering_details` → `ready_for_summary` → `generating_itinerary` → `itinerary_complete`.
- The summary IS shown when phase = `ready_for_summary`. On the user's next message, the model transitions directly to `itinerary_complete` (if confirming) or stays in `ready_for_summary` (if adjusting).
- No client-driven phase PATCH needed — the model handles it on the next turn.

### Chips Visibility
- No chips during `gathering_destination` or `gathering_details` — intentional. The user is in dialogue rhythm; chips would be noise. The textarea fills the role.

### Server Guard: itinerary_complete
- If the model returns `conversation_phase = 'itinerary_complete'` but `itinerary` is null/empty in the structured output, the server overrides the phase back to `ready_for_summary` before persisting. This prevents a premature phase flip from skipping itinerary generation.

### Claude's Discretion
- Choice of OpenAI model (gpt-4o recommended for quality)
- System prompt engineering and formatting
- How suggestion chips are sent back as user messages
- Exact JSON schema for trip state storage/extraction
- Error handling for OpenAI API failures

</decisions>

<specifics>
## Specific Ideas

### System Prompt Design
The system prompt should:
- Instruct the model to behave as described above
- Include the current trip state as context on each turn
- Ask for ONE missing piece of info at a time (not a list of questions)
- Know when enough info is gathered to produce the summary
- Know when to generate the full itinerary

### Suggestion Chips
- Rendered in `ChatInput` or just above it after the AI's summary message
- Clicking a chip sends that text as a user message
- Chips only appear after certain AI response types (summary, itinerary)

### Itinerary Format
- Day-by-day breakdown
- Include morning / afternoon / evening slots
- Include practical details (transport, approximate costs if budget known)
- Clear, scannable formatting — not a wall of text

</specifics>

<deferred>
## Deferred Ideas

- Collaborative itinerary editing / multi-user planning (Phase 4 territory)
- Saving itineraries to DB and navigating them in the right panel (deferred until AI pipeline live)
- Destination cards on landing page linking to pre-generated itineraries (noted TODO)
- Real-time streaming token-by-token display (can start with full response, add streaming later)

</deferred>

---

*Phase: 08-ai-chat-functionality-with-openai-behavior-trip-state-itinerary-generation*
*Context gathered: 2026-03-11 from user requirements*
