# Architecture Research

**Domain:** Travel AI App (React SPA + FastAPI, two-tier, brownfield revamp)
**Researched:** 2026-03-09
**Confidence:** HIGH (FastAPI + OpenAI patterns from official docs; MEDIUM for collaboration patterns — no single authoritative source)

---

## Standard Architecture

### System Overview After MCP Retirement

```
┌────────────────────────────────────────────────────────────────┐
│                     BROWSER (React SPA)                        │
│                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Auth    │  │ Dashboard│  │Itineraries│  │   Chat AI    │  │
│  │  Pages   │  │  Page    │  │  Pages   │  │    Page      │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │             │               │           │
│  ┌────┴──────────────┴─────────────┴───────────────┴───────┐   │
│  │           Redux Store (auth / itineraries / chat)        │   │
│  └──────────────────────────────┬────────────────────────┘   │
│                                  │                            │
│  ┌───────────────────────────────┴────────────────────────┐   │
│  │       ApiService (frontend/src/services/api.ts)         │   │
│  │     fetch + EventSource (SSE for AI streaming)          │   │
│  └───────────────────────────────┬────────────────────────┘   │
└──────────────────────────────────┼─────────────────────────────┘
                                   │ HTTP / SSE
                                   │ (port 8000)
┌──────────────────────────────────┼─────────────────────────────┐
│                FastAPI Backend   │                              │
│                                  ↓                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 main.py (app entrypoint)                  │  │
│  │         CORS, middleware, router registration             │  │
│  └──────┬──────────┬──────────┬──────────┬──────────────────┘  │
│         │          │          │          │                      │
│  ┌──────┴─┐  ┌─────┴─┐  ┌────┴──┐  ┌────┴────────────────┐   │
│  │ auth   │  │itiner-│  │ chat  │  │ collab / users /    │   │
│  │ router │  │ aries │  │ router│  │ recommendations     │   │
│  └──────┬─┘  └───┬───┘  └──┬───┘  └────┬────────────────┘   │
│         │        │          │           │                      │
│  ┌──────┴────────┴──────────┴───────────┴──────────────────┐  │
│  │                    Service Layer                          │  │
│  │  AIService (AsyncOpenAI)   CollaborationService          │  │
│  └──────────────────┬──────────────────────────────────────┘  │
│                     │                                          │
│  ┌──────────────────┴──────────────────────────────────────┐  │
│  │              SQLAlchemy ORM (models/user.py)             │  │
│  └──────────────────┬──────────────────────────────────────┘  │
└─────────────────────┼──────────────────────────────────────────┘
                      │
┌─────────────────────┴──────────────────────────────────────────┐
│                    PostgreSQL                                   │
│  users / itineraries / itinerary_collaborators                 │
│  activities / chat_history                                     │
└────────────────────────────────────────────────────────────────┘
```

**What is removed:** The `mcp-server/` Node.js process (port 3001), Socket.IO, the MCP protocol layer, Redis, and MongoDB. Nothing depends on them after the revamp.

---

### Component Responsibilities

| Component | Responsibility | Boundary |
|-----------|----------------|----------|
| React SPA | All UI rendering, client state, API calls | No business logic; reads/writes via REST only |
| Redux Store | Client-side state for auth, itineraries, chat | Single source of truth for UI; no direct DB access |
| ApiService | All HTTP calls to FastAPI; SSE connection for streaming AI | One module per domain (auth, itineraries, chat) |
| FastAPI routers | Route definitions, request validation via Pydantic, auth dependency injection | No business logic beyond orchestration |
| Service layer | Business logic: AI calls, collaboration rules, external APIs | Injected into routes; no direct HTTP awareness |
| SQLAlchemy ORM | Data access, schema, relationships | Called only from service layer, never from routers directly |
| PostgreSQL | Persistent storage | Authoritative state for all collaboration |

---

## Recommended Project Structure

### Frontend

```
frontend/src/
├── pages/               # One folder per route
│   ├── Auth/            # Login, Register
│   ├── Dashboard/       # Itineraries overview
│   ├── Itineraries/     # List, detail, create
│   └── Chat/            # AI chat interface
├── components/          # Shared UI components
├── store/               # Redux slices
│   ├── authSlice.ts     # Auth state + thunks
│   ├── itinerarySlice.ts # Itinerary state + thunks (add async thunks)
│   └── chatSlice.ts     # Chat state + thunks
├── services/
│   └── api.ts           # All HTTP + SSE calls (fix base URL to :8000)
└── types/               # Shared TypeScript interfaces (Activity, Itinerary, etc.)
```

### Backend

```
backend/
├── main.py              # App creation, CORS, router registration
├── config.py            # Settings (fix hardcoded env_file path)
├── database.py          # Engine, session factory, Base (fix declarative_base import)
├── api/                 # Route handlers only — thin
│   ├── auth.py
│   ├── itineraries.py
│   ├── chat.py          # Fix OpenAI SDK calls + add streaming endpoint
│   ├── users.py
│   └── recommendations.py
├── services/            # Business logic — extracted from route handlers
│   ├── ai_service.py    # AsyncOpenAI wrapper (moved from api/chat.py)
│   └── collab_service.py # Collaborator invite, access checks
├── models/
│   └── user.py          # ORM models (fix duplicate relationship, extra_data)
└── schemas/
    └── schemas.py       # Pydantic schemas (fix metadata → extra_data alignment)
```

### Structure Rationale

- **services/ extracted from api/:** The current `AIService` class lives inside `api/chat.py` which mixes route logic and business logic. Extracting it to `services/ai_service.py` makes routes thin and the service independently testable.
- **types/ on frontend:** Currently `activities: any[]` in `itinerarySlice.ts` discards all type safety. Shared interfaces let the store, components, and API service all reference the same types.
- **No new top-level folders:** The existing structure is already well-organized. The changes are additive, not structural rewrites.

---

## Architectural Patterns

### Pattern 1: SSE Streaming for AI Chat Responses

**What:** The AI chat endpoint streams token-by-token output to the frontend using Server-Sent Events (SSE) via FastAPI's native `EventSourceResponse`. The frontend uses the browser-native `EventSource` API or `fetch` with `ReadableStream` to render tokens incrementally.

**When to use:** AI chat messages (`POST /api/v1/chat/message`). Itinerary generation can also stream if generation exceeds 2–3 seconds.

**Trade-offs:** Better perceived UX for long AI responses. Adds complexity to frontend handling (need to manage stream state in Redux). SSE is one-directional (server to client) which is all that's needed here.

**Backend pattern:**

```python
# backend/services/ai_service.py
from openai import AsyncOpenAI
from collections.abc import AsyncIterable
from fastapi.sse import ServerSentEvent

client = AsyncOpenAI(api_key=settings.openai_api_key)

async def stream_chat_response(messages: list[dict]) -> AsyncIterable[ServerSentEvent]:
    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield ServerSentEvent(data=delta, event="token")
    yield ServerSentEvent(data="[DONE]", event="done")
```

```python
# backend/api/chat.py
from fastapi.sse import EventSourceResponse

@router.post("/message/stream", response_class=EventSourceResponse)
async def stream_message(
    request: ChatMessage,
    current_user: User = Depends(get_current_active_user),
):
    messages = build_message_history(current_user, request)
    return EventSourceResponse(ai_service.stream_chat_response(messages))
```

**Note:** FastAPI's built-in `EventSourceResponse` (added as a first-class feature) handles keep-alive pings, `Cache-Control: no-cache`, and `X-Accel-Buffering: no` automatically. Confidence: HIGH (from official FastAPI SSE docs).

---

### Pattern 2: Non-Streaming Itinerary Generation with Background Persistence

**What:** Itinerary generation is a single `await` call that returns the complete JSON, not a stream. The AI response is returned to the client and persisted to the database in a `BackgroundTask` to avoid blocking the response.

**When to use:** `POST /api/v1/chat/generate-itinerary`. Generation should use `stream=False` for structured JSON output because streaming and reliable JSON parsing are difficult to combine.

**Trade-offs:** Simpler JSON handling than streaming; client waits for full response (acceptable for a one-time generation action). Background persistence means the client gets the response slightly before the DB write completes — this is fine because the frontend can store the returned itinerary in Redux immediately.

**Important:** The current 2000-token limit frequently causes JSON parse failures on multi-day trips. Increase `max_tokens` to 4096 (GPT-4o's context allows it) and use structured outputs (`response_format={"type": "json_object"}`) to force valid JSON.

```python
# backend/api/chat.py
from fastapi import BackgroundTasks

@router.post("/generate-itinerary", response_model=ItineraryResponse)
async def generate_itinerary(
    request: ItineraryGenerationRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    result = await ai_service.generate_itinerary(request)
    background_tasks.add_task(persist_itinerary, db, current_user.id, result)
    return result
```

**Note:** Do NOT use `BackgroundTasks` for the AI call itself — the streaming concern above explains the tradeoff. `BackgroundTasks` is appropriate for post-response work like DB writes or analytics, not for long-running I/O that the client is waiting on. Confidence: HIGH (FastAPI docs + observed pattern).

---

### Pattern 3: Optimistic Updates for Collaboration (No Real-Time)

**What:** When a user edits an itinerary (reorder activity, rename trip, add note), the UI updates immediately (optimistic), then a REST call is made to persist. On error, the change is rolled back. Collaborators see changes only on next load or manual refresh — there is no push.

**When to use:** All itinerary mutation operations. This is the agreed replacement for Socket.IO.

**Trade-offs:** No real-time feel for collaborators — they must refresh to see changes made by others. Acceptable for a small-group app where collaboration is asynchronous (planning a trip together over hours/days, not editing simultaneously in real time). Implementing this correctly avoids conflicts: use a `updated_at` timestamp on `Itinerary`; if a `PUT` arrives with a stale `updated_at`, return `409 Conflict` so the client knows to re-fetch.

**Frontend pattern (Redux Toolkit):**

```typescript
// Optimistic update in itinerarySlice.ts
export const updateItineraryTitle = createAsyncThunk(
  'itineraries/updateTitle',
  async ({ id, title }: { id: string; title: string }, { dispatch, getState, rejectWithValue }) => {
    // 1. Optimistically update local state
    dispatch(itinerarySlice.actions.setTitle({ id, title }));
    try {
      // 2. Persist to backend
      await apiService.updateItinerary(id, { title });
    } catch (err) {
      // 3. Roll back on failure
      dispatch(itinerarySlice.actions.setTitle({ id, title: getPreviousTitle(getState(), id) }));
      return rejectWithValue(err.message);
    }
  }
);
```

**Backend conflict guard:**

```python
@router.put("/itineraries/{id}")
async def update_itinerary(
    id: str,
    update: ItineraryUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    itinerary = get_itinerary_or_404(db, id)
    verify_collaborator_or_owner(db, itinerary, current_user)  # authorization check
    if update.updated_at and itinerary.updated_at > update.updated_at:
        raise HTTPException(409, "Itinerary was updated by another collaborator")
    return update_itinerary_fields(db, itinerary, update)
```

Confidence: MEDIUM — pattern is well-established in REST APIs, but React optimistic update specifics based on TanStack Query docs and React community patterns.

---

### Pattern 4: REST-Based Collaboration (Invite + Access Check)

**What:** Collaboration is modeled as an `ItineraryCollaborator` join table (already exists). An owner can invite a user by username via `POST /api/v1/itineraries/{id}/collaborators`. Every mutation endpoint checks that the requesting user is owner or collaborator before proceeding.

**When to use:** All itinerary write operations; `GET` on other users' itineraries.

**Trade-offs:** Simple to implement and reason about. No distributed state problem. Collaborators must be known registered users (fits the "small known group" constraint).

**Access check as FastAPI dependency:**

```python
# backend/api/dependencies.py
async def get_itinerary_with_access(
    id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Itinerary:
    itinerary = db.query(Itinerary).filter(Itinerary.id == id).first()
    if not itinerary:
        raise HTTPException(404, "Not found")
    is_owner = itinerary.user_id == current_user.id
    is_collaborator = db.query(ItineraryCollaborator).filter_by(
        itinerary_id=id, user_id=current_user.id
    ).first()
    if not is_owner and not is_collaborator:
        raise HTTPException(403, "Access denied")
    return itinerary
```

Composing this as a dependency means it can be reused across all itinerary-scoped routes without repeating authorization logic.

---

## Data Flow

### AI Chat Flow (Streaming)

```
User submits message
    ↓
Chat.tsx dispatches sendMessage thunk
    ↓
ApiService opens EventSource to POST /api/v1/chat/message/stream
    ↓
FastAPI validates JWT (get_current_active_user dependency)
    ↓
chat.py router calls ai_service.stream_chat_response(messages)
    ↓
AsyncOpenAI client.chat.completions.create(stream=True)
    ↓
Tokens yielded as SSE events → client renders incrementally
    ↓
"done" event received → Redux chatSlice adds completed message
    ↓
BackgroundTask persists chat_history row to DB
```

### Itinerary Generation Flow (Non-Streaming)

```
User submits trip description
    ↓
Frontend POST /api/v1/chat/generate-itinerary
    ↓
FastAPI validates JWT, parses ItineraryGenerationRequest
    ↓
ai_service.generate_itinerary() awaits full GPT-4o JSON response
    (response_format=json_object, max_tokens=4096)
    ↓
Full ItineraryResponse returned to client
    ↓
BackgroundTask persists Itinerary + Activity rows to DB
    ↓
Frontend Redux itinerarySlice stores result; user sees itinerary
```

### Collaboration Flow (REST)

```
Owner visits share dialog → POST /api/v1/itineraries/{id}/collaborators
    ↓
collab_service adds ItineraryCollaborator row
    ↓
Invited user logs in, sees shared itinerary in GET /api/v1/itineraries
    (query filters by owner OR collaborator)
    ↓
Collaborator makes edit → optimistic Redux update
    ↓
PUT /api/v1/itineraries/{id}/activities/{actId}
    ↓
Dependency checks collaborator access (get_itinerary_with_access)
    ↓
409 if stale updated_at, else update persisted
```

### Auth Bootstrap Flow

```
App loads → AppRouter.tsx useEffect
    ↓
Token found in localStorage?
    ├── YES → dispatch getCurrentUser thunk → GET /api/v1/auth/me
    │         ↓ success → auth.isAuthenticated = true
    │         ↓ failure (expired/invalid) → localStorage.clear, redirect /login
    └── NO → auth.isAuthenticated = false → render login
```

Note: Current code sets `isAuthenticated: true` before the `/me` call resolves, causing a brief flash of protected pages on expired tokens. Fix: set `isAuthenticated: false` initially, only flip to `true` after `/me` succeeds.

---

## Build Order Implications

The two-tier architecture is already structurally correct — the revamp is about fixing broken wiring, not redesigning layers. Recommended phase order based on dependencies:

**Phase 1 — Fix foundations (unblocks everything)**
- Fix frontend `API_BASE_URL` (port 3001 → 8000) — unblocks all frontend testing
- Fix OpenAI SDK v0 → v1 (`AsyncOpenAI`, `client.chat.completions.create`) — unblocks all AI features
- Fix `metadata`/`extra_data` field mismatch — unblocks itinerary data integrity
- Fix security issues (remove password logging, generic registration errors, algorithm pinning)
- Fix SQLite fallback (remove; enforce PostgreSQL)

**Phase 2 — Build missing UIs (depends on Phase 1)**
- Implement Chat page (connects to now-working AI backend)
- Implement Dashboard (connects to now-working itinerary API)
- Implement Itineraries page (list, view, create)
- Add async thunks to `itinerarySlice.ts` (currently has none)

**Phase 3 — Collaboration (depends on Phase 2)**
- Add `POST /api/v1/itineraries/{id}/collaborators` endpoint
- Add `get_itinerary_with_access` dependency and apply to all itinerary mutations
- Add collaborator invite UI
- Add optimistic update pattern to itinerary mutations
- Add `updated_at` conflict guard to PUT endpoints

**Phase 4 — AI streaming (depends on Phase 1 + Phase 2)**
- Add streaming endpoint for chat (`/message/stream` with `EventSourceResponse`)
- Update frontend to consume SSE stream
- Increase itinerary generation token budget; add `response_format=json_object`

**Phase 5 — Retire MCP server + tests**
- Remove `mcp-server/` directory and all references
- Fix CORS to remove port 3001
- Add backend pytest suite
- Add frontend React Testing Library suite

**Rationale for this order:**
- Phase 1 must come first because broken auth and broken AI cascade into every other feature — no other work can be verified without them.
- Phase 2 before Phase 3 because there is no itinerary UI to test collaboration against.
- Phase 4 after Phase 2 because streaming is an enhancement to a working chat, not a foundation.
- Phase 5 last because retiring the MCP server is a cleanup step — it is already unused by the Python backend; removing it cannot break anything if done after the frontend points to port 8000.

---

## Scaling Considerations

| Scale | Approach |
|-------|----------|
| 0–100 users (current target) | Single FastAPI process (uvicorn), single PostgreSQL instance. No changes needed. |
| 1k–10k users | Add Gunicorn with multiple uvicorn workers. PostgreSQL connection pooling (PgBouncer or asyncpg pool). Cache frequent reads (itinerary list) with Redis. |
| 10k+ users | Horizontal FastAPI scaling (stateless, JWT-based — already fits). SSE streams require sticky sessions or a Redis-backed event bus. Add CDN for React SPA static assets. |

**First bottleneck:** The synchronous Google Maps API calls in `recommendations.py` under concurrent load. Fix: wrap with `asyncio.gather` for parallel calls or add response caching.

**Second bottleneck:** OpenAI API latency under concurrent itinerary generation. Fix: stream responses (Phase 4) reduces perceived wait time; actual throughput is rate-limited by OpenAI tier.

---

## Anti-Patterns

### Anti-Pattern 1: Business Logic in Route Handlers

**What people do:** Put all logic directly in `@router.post()` functions (current state of `api/chat.py` with `AIService` defined inside the same file).

**Why it's wrong:** Route handlers are untestable without making real HTTP requests. Mixing concerns makes the service layer impossible to unit-test.

**Do this instead:** Extract to `services/ai_service.py`. Route handlers call service functions; services are tested independently.

---

### Anti-Pattern 2: Blocking I/O in Async Routes

**What people do:** Call synchronous libraries (e.g., `googlemaps` sync client) inside `async def` route handlers.

**Why it's wrong:** Blocks the event loop; all concurrent requests are paused while the sync call runs. This is the current state of `recommendations.py`.

**Do this instead:** Use `asyncio.to_thread(sync_function, args)` to offload sync calls to a thread pool without blocking the event loop. Or find an async-native client.

---

### Anti-Pattern 3: Trusting Frontend Token Presence as Authentication

**What people do:** Set `isAuthenticated: true` if a token string exists in `localStorage` (current `AppRouter.tsx` state initialization).

**Why it's wrong:** Expired or revoked tokens pass the check; users see protected pages briefly before the `/me` call fails.

**Do this instead:** Keep `isAuthenticated: false` on initial state. Show a loading spinner while the `/me` validation call is in flight. Only set `isAuthenticated: true` after `/me` returns 200.

---

### Anti-Pattern 4: Three Services for a Two-Tier Problem

**What people do:** Keep the Node.js MCP server running alongside FastAPI to avoid migration cost.

**Why it's wrong:** The MCP server adds Redis, MongoDB, and a separate auth validation path — all for features (real-time collab, MCP protocol tools) that are out of scope. The current system is broken partly because the frontend accidentally routes auth calls to the MCP server instead of FastAPI.

**Do this instead:** Retire the MCP server entirely. All collaboration is REST-based through FastAPI. Real-time can be added later with SSE or WebSockets directly in FastAPI if the need is validated.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenAI GPT-4o | `AsyncOpenAI` client, `client.chat.completions.create()`, `stream=True` for chat, `stream=False` + `response_format=json_object` for itinerary generation | Fix: initialize client once as module-level singleton in `services/ai_service.py`; do not reinitialize per-request |
| Google Maps | `googlemaps` sync client — wrap in `asyncio.to_thread()` | Known None crash if key not set; add guard at startup |
| OpenWeatherMap | HTTP via `requests` — wrap in `asyncio.to_thread()` | Same async concern as Google Maps |
| PostgreSQL | SQLAlchemy 2.x sync ORM via `get_db()` FastAPI dependency | Acceptable for current scale; migrate to async (`asyncpg` + SQLAlchemy async session) if connection pool becomes a bottleneck |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| React SPA ↔ FastAPI | REST + SSE over HTTP (port 8000) | CORS must allow `localhost:3000`; remove port 3001 references |
| Router ↔ Service | Direct Python function call | Services are injected via constructor or module import, not via HTTP |
| Service ↔ ORM | SQLAlchemy session passed as argument | Session lifecycle owned by `get_db()` dependency; closed in `finally` |
| Service ↔ OpenAI | `AsyncOpenAI` async client | Single shared client instance; API key from `settings.openai_api_key` |

---

## Sources

- [FastAPI Server-Sent Events (official docs)](https://fastapi.tiangolo.com/tutorial/server-sent-events/) — HIGH confidence
- [FastAPI Background Tasks (official docs)](https://fastapi.tiangolo.com/tutorial/background-tasks/) — HIGH confidence
- [FastAPI Bigger Applications (official docs)](https://fastapi.tiangolo.com/tutorial/bigger-applications/) — HIGH confidence
- [FastAPI Best Practices — zhanymkanov/fastapi-best-practices](https://github.com/zhanymkanov/fastapi-best-practices) — MEDIUM confidence (community, widely cited)
- [OpenAI Python SDK — streaming guide](https://platform.openai.com/docs/guides/streaming-responses) — HIGH confidence
- [TanStack Query v4 — Optimistic Updates](https://tanstack.com/query/v4/docs/framework/react/guides/optimistic-updates) — MEDIUM confidence
- [React useOptimistic hook (react.dev)](https://react.dev/reference/react/useOptimistic) — HIGH confidence (React 19 feature; app uses React 18, so Redux Toolkit optimistic pattern is more applicable)

---

*Architecture research for: Travel AI App (Barabula) — two-tier revamp*
*Researched: 2026-03-09*
