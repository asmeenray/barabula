# Project Research Summary

**Project:** Barabula — Travel AI App
**Domain:** Brownfield revamp — small-group AI itinerary generation and collaboration (React SPA + FastAPI)
**Researched:** 2026-03-09
**Confidence:** HIGH

## Executive Summary

Barabula is a brownfield revamp of a travel AI app, not a greenfield build. The backend architecture (FastAPI + PostgreSQL + SQLAlchemy) and frontend architecture (React 18 + Redux Toolkit + TypeScript) are structurally sound and well-chosen for the domain. The problem is not design — it is broken wiring. Three failures cascade into every user-facing feature: (1) the frontend API base URL points to a retired Node.js server on port 3001 instead of FastAPI on port 8000; (2) all AI calls use the OpenAI SDK v0 call pattern (`openai.ChatCompletion.acreate`) which throws `AttributeError` at runtime on the installed v1 SDK; (3) the Redux itinerary slice has no async thunks, so no data ever loads from the backend. These three fixes, plus resolving the `metadata`/`extra_data` field mismatch and removing critical security issues (password logging, user enumeration), constitute the entire Phase 1. Nothing else should be built until these pass end-to-end.

The recommended approach after Phase 1 is sequential: build the missing frontend UIs (Chat, Dashboard, Itineraries) against the now-working backend in Phase 2, then add REST-based collaboration in Phase 3, then layer in AI streaming UX in Phase 4, and retire the Node.js MCP server in Phase 5. Real-time collaboration (Socket.IO) has been deliberately scoped out in favor of REST-based optimistic updates with `updated_at` conflict detection — this is appropriate for the small-group, asynchronous-planning use case and eliminates the infrastructure complexity (Redis, MongoDB, MCP protocol layer) that was the source of most of the current breakage. The two-tier architecture (browser SPA + FastAPI + PostgreSQL) is the correct target.

The key risks are: (a) the OpenAI SDK migration has a second, silent failure mode where the response object format changes from dict-style to attribute-style access — both must be fixed together; (b) the MCP server must not be deleted until REST collaboration endpoints are live and verified, following the strangler fig principle; and (c) the REST collaboration layer must include optimistic concurrency control (`updated_at` conflict detection on PUT) from day one, not as a retrofit. Ignoring any of these produces either a silent regression or data loss that erodes user trust.

---

## Key Findings

### Recommended Stack

The existing stack is the right stack. The revamp is not a technology migration — it is a bug fix and completion effort. The backend runs Python 3.9 with FastAPI, Pydantic 2, SQLAlchemy 2, and PostgreSQL, which is a well-supported, production-proven combination. The frontend runs React 18 with Redux Toolkit, TypeScript, and MUI v5. The only forced upgrade is `openai` (1.3.8 → 2.26.0, blocked by the broken v0 call pattern). All other upgrades are recommended but non-blocking.

The Node.js MCP server (port 3001), Redis, MongoDB, Socket.IO, Kafka, and Celery are all being retired. They were added for real-time collaboration features that have been descoped. Their removal simplifies the system to a standard two-tier web app with no dependency on a third runtime.

See `/Users/asmeenray/projects/barabula/.planning/research/STACK.md` for version targets and upgrade commands.

**Core technologies:**
- **FastAPI 0.135.x + Python 3.9:** REST API, SSE streaming for AI chat, JWT auth via PyJWT — upgrade from openai 1.3.8 to 2.26.0 is the only forced change
- **AsyncOpenAI (openai 2.26.x):** AI chat and itinerary generation — initialize as module-level singleton, never per-request
- **SQLAlchemy 2.0.x + Alembic + PostgreSQL:** Persistent storage with migrations — enforce PostgreSQL only; remove SQLite fallback
- **Redux Toolkit 2.x + React Redux 9.x:** Client state management — upgrade as a coordinated set; add async thunks to itinerarySlice
- **PyJWT 2.9.x:** JWT auth — replaces abandoned python-jose; direct drop-in for HS256

**What to retire:** `python-jose`, `websockets`, `kafka-python`, `celery`, `boto3/botocore` from backend; `socket.io-client`, `react-query` (rename to `@tanstack/react-query` v5) from frontend; `mcp-server/` directory entirely.

### Expected Features

The backend already implements the data models, API routes, and AI integration logic for most features. The gap is primarily frontend UI (Chat, Dashboard, Itineraries pages are placeholders) and three collaboration endpoints that need to be built.

See `/Users/asmeenray/projects/barabula/.planning/research/FEATURES.md` for the full prioritization matrix.

**Must have (table stakes):**
- Working authentication — API base URL fix (one line) unblocks everything downstream
- Working AI itinerary generation — OpenAI SDK fix unblocks the entire product promise
- Chat UI — replace placeholder; entry point for itinerary generation and refinement
- Dashboard / itinerary list — replace placeholder; users need to navigate their trips
- Day-by-day itinerary view — structured rendering of backend data; not a flat list
- Collaborator invite and view access — the foundational group travel feature; DB model exists

**Should have (differentiators, v1.x after validation):**
- Role-based collaboration (editor vs. viewer) — DB model already has role concept; needs API + UI
- Structured prompt builder form — reduces blank-prompt anxiety; supplements the chat box
- Activity status tracking (confirmed / tentative / skipped) — execution-phase feature
- Trip summary card — polish pass; pure frontend, no backend changes

**Defer (v2+):**
- Conversational itinerary refinement — high-value differentiator; requires stable chat + generation loop first
- Per-day or per-activity regeneration — follows from stable refinement
- Export to PDF
- Real-time collaboration — only if the group context grows; requires Redis pub/sub infrastructure

**Anti-features (deliberately out of scope):** Real-time Socket.IO collaboration, booking integration, expense splitting, email notifications, mobile app, social discovery, offline mode.

### Architecture Approach

The two-tier architecture is already structurally correct. After retiring the MCP server, the system is: React SPA → REST/SSE over HTTP → FastAPI → SQLAlchemy → PostgreSQL. No redesign is needed. The revamp is about fixing broken wiring in existing layers, adding missing async thunks to the Redux store, and building out the placeholder frontend pages. The service extraction (moving `AIService` from inside `api/chat.py` to `services/ai_service.py`) is the one structural change worth making — it makes routes thin and the AI service independently testable.

See `/Users/asmeenray/projects/barabula/.planning/research/ARCHITECTURE.md` for diagrams, data flow patterns, and code samples.

**Major components:**
1. **React SPA (Redux + ApiService)** — all UI rendering and client state; no business logic; communicates with FastAPI only via REST and SSE
2. **FastAPI routers + service layer** — thin route handlers delegating to services; `AIService` for OpenAI calls; `CollaborationService` for invite and access checks
3. **SQLAlchemy ORM + PostgreSQL** — authoritative state; `ItineraryCollaborator` join table already exists for the collaboration model

**Key patterns to follow:**
- SSE streaming (`EventSourceResponse`) for AI chat responses — built into FastAPI natively
- Non-streaming with `response_format=json_object` and `max_tokens=4096` for itinerary generation — avoids JSON parse failures on multi-day trips
- Optimistic updates with `updated_at` conflict detection for collaboration mutations — `409 Conflict` with server state in body
- `get_itinerary_with_access` FastAPI dependency for all itinerary-scoped routes — reusable authorization check
- `isAuthenticated: false` until `getCurrentUser` thunk resolves — prevents expired-token flash

### Critical Pitfalls

See `/Users/asmeenray/projects/barabula/.planning/research/PITFALLS.md` for full pitfall details with warning signs, phase assignments, and recovery strategies.

1. **OpenAI SDK migration has two parts, not one** — fixing the call site (`acreate` → `create`) removes the `AttributeError`, but the response object changes from dict-style (`response["choices"][0]`) to attribute-style (`response.choices[0].message.content`). Fixing only the call site leaves the AI endpoints silently returning empty or `None` data. Fix both in the same pass; verify with an end-to-end request.

2. **MCP server must not be deleted before REST collaboration is live** — the MCP server provides real-time collaboration features. Retiring it first leaves the app with no collaboration mechanism. Follow the strangler fig: build REST collaboration endpoints and verify them, then delete the MCP server. Never treat deletion as the deliverable.

3. **REST collaboration without concurrency control causes silent data loss** — two collaborators editing the same itinerary will silently overwrite each other without an `updated_at` version check on PUT endpoints. This must be designed in from the first collaborative endpoint, not retrofitted. Return the current server state in the `409 Conflict` response so the frontend can surface a meaningful conflict UI.

4. **Security fixes can break working auth flows** — the `ProtectedRoute` fix (validate token before setting `isAuthenticated: true`) introduces a loading state that doesn't exist yet. Adding the security fix without the loading state causes a blank-screen flash on every page load. Apply both changes in the same commit and test all three token states (valid, expired, absent).

5. **SQLite fallback masks PostgreSQL-specific bugs during development** — the `metadata`/`extra_data` field mismatch behaves differently on SQLite vs. PostgreSQL. Remove the fallback in Phase 1 alongside the field name fix. The app should fail loudly if `DATABASE_URL` is not set.

---

## Implications for Roadmap

Based on the dependency graph in FEATURES.md and the build order in ARCHITECTURE.md, a 5-phase structure is strongly indicated by the research. Phases 1 and 2 are clearly sequential and non-negotiable in their ordering. Phases 4 and 5 can be reordered if needed without breaking anything.

### Phase 1: Critical Bug Fixes and Foundation

**Rationale:** Three blockers cascade into every other feature: wrong API base URL, broken OpenAI SDK calls, and missing Redux async thunks. Nothing can be verified as working until all three are resolved. Security issues and field name mismatches must also be cleared here to avoid contaminating later phases.

**Delivers:** A working end-to-end system — users can log in, auth persists on refresh, AI generation produces a real itinerary, and the itinerary can be retrieved from the database without field mapping errors.

**Addresses features:** Working authentication, working AI itinerary generation (table stakes — P1)

**Must avoid:**
- Pitfall 1: Fix both the OpenAI call site AND the response access pattern in the same pass
- Pitfall 4: Add loading state to `ProtectedRoute` in the same commit as the security fix
- Pitfall 5 (SQLite): Remove the fallback and add `DATABASE_URL` guard

**Specific tasks implied by research:**
- Fix `API_BASE_URL` in `frontend/src/services/api.ts` to `process.env.REACT_APP_API_URL || 'http://localhost:8000'`
- Upgrade `openai` to 2.26.0; replace all `openai.ChatCompletion.acreate` with `AsyncOpenAI` client pattern; fix all dict-style response accesses; fix exception types (`openai.RateLimitError` not `openai.error.RateLimitError`)
- Fix `metadata`/`extra_data` field name mismatch in models and schemas
- Remove password logging (`print(f"User data: {user_data}")`)
- Fix user enumeration (generic registration error message)
- Pin JWT algorithm (`algorithms=["HS256"]`)
- Remove SQLite fallback; enforce PostgreSQL
- Fix `isAuthenticated` flow: false on init, true only after `getCurrentUser` resolves; add loading state

### Phase 2: Frontend UI Implementation

**Rationale:** The backend has working routes, the Redux store has slices, but the frontend pages are placeholders. Phase 1 makes the backend reliable; Phase 2 makes it visible. This phase delivers the core product UX.

**Delivers:** A usable product — users can navigate to a Chat page, start a conversation with the AI, generate an itinerary, see it in a structured day-by-day view, and browse their trips in a Dashboard.

**Addresses features:** Chat UI, Dashboard/itinerary list, day-by-day itinerary view, persistent chat history (all P1 table stakes)

**Uses stack:** Redux Toolkit async thunks, MUI v5 components, React Router DOM v6 for navigation

**Implements architecture:** `itinerarySlice.ts` async thunks, `chatSlice.ts` history thunk, Chat page with AI response rendering as structured content (not chat bubble text), Dashboard with itinerary grid

**Must avoid:**
- Redux itinerary slice with no async thunks (data never loads) — add `createAsyncThunk` for all itinerary operations
- Rendering AI response as raw text in a chat bubble — redirect to itinerary view after generation succeeds

### Phase 3: REST-Based Collaboration

**Rationale:** The group travel use case requires collaboration. The DB model and relationships already exist; the missing pieces are the invite API endpoint, the access-check dependency, and the frontend invite UI. This phase activates the product's differentiating use case.

**Delivers:** Group itinerary sharing — an owner can invite collaborators by username/email; invited users see shared trips in their dashboard; all mutations are access-checked; concurrent edits produce a `409 Conflict` with the current server state rather than silent data loss.

**Addresses features:** Collaborator invite flow, collaborator view access (P1 table stakes); lays groundwork for role-based collaboration (P2)

**Must avoid:**
- Pitfall 2: Never retire MCP server in this phase — retirement happens in Phase 5 after Phase 3 collaboration endpoints are verified
- Pitfall 3: Implement `updated_at` conflict detection in the first collaborator endpoint; do not defer it

**Specific tasks implied by research:**
- `POST /api/v1/itineraries/{id}/collaborators` endpoint
- `get_itinerary_with_access` FastAPI dependency applied to all itinerary mutation routes
- `updated_at` check on all `PUT /itineraries/{id}` endpoints; `409 Conflict` returns current server state
- Frontend collaborator invite dialog; optimistic update pattern in `itinerarySlice.ts`

### Phase 4: AI Streaming UX

**Rationale:** Streaming is an enhancement to a working AI chat, not a foundation. Users on Phase 2 see a spinner for multi-second AI calls; streaming makes responses feel instant. This is also the phase to increase the itinerary generation token budget (`max_tokens=4096`, `response_format=json_object`) which fixes silent failures on multi-day trips.

**Delivers:** Incremental AI response rendering (tokens stream to the UI as they arrive), reliable JSON generation for itineraries longer than 3 days, perceived response time improvement for all AI interactions.

**Addresses features:** AI chat UX quality (differentiator); enables conversational refinement in v2

**Implements architecture:** `EventSourceResponse` on `POST /api/v1/chat/message/stream`; `EventSource` or `fetch` with `ReadableStream` on frontend; stream state management in `chatSlice.ts`

### Phase 5: MCP Server Retirement and Testing

**Rationale:** The MCP server is already unused by the Python backend after Phase 1 fixes the API base URL. By Phase 5, REST collaboration is live and verified, making the MCP server's collaboration features fully replaced. This is the cleanup phase. Tests are added here because they validate the completed system — writing tests in earlier phases against broken code produces unreliable baselines.

**Delivers:** A clean, two-tier codebase with no MCP server references, no port 3001 dependencies, a pytest suite for backend routes, and a React Testing Library suite for frontend pages.

**Must avoid:**
- Pitfall 2 (reverse): Do not skip the pre-deletion audit — search for all references to port 3001, `mcp-server`, Socket.IO before deleting `mcp-server/`
- Deleting `mcp-server/` before confirming zero `grep -r "3001" .` results

**Specific tasks implied by research:**
- Full-repo audit of all `3001`, `localhost:3001`, `mcp-server` references
- Remove `mcp-server/` directory
- Fix CORS to remove port 3001 from allowed origins
- Remove `socket.io-client` from frontend
- Remove `websockets`, `kafka-python`, `celery`, `boto3/botocore` from backend requirements
- Add pytest suite: auth, itinerary CRUD, collaboration access checks, OpenAI error handling
- Add React Testing Library suite: auth flow, itinerary list render, chat page interactions

### Phase Ordering Rationale

- Phase 1 must be first: broken auth and broken AI cascade into every downstream feature; no phase can be verified without them
- Phase 2 before Phase 3: there is no itinerary UI to test collaboration against; building collaboration against a placeholder page produces unverifiable work
- Phase 4 after Phase 2: streaming is an enhancement to a working chat, not a prerequisite; building streaming against a placeholder chat is wasted effort
- Phase 5 last: MCP server retirement is a cleanup step that requires REST collaboration (Phase 3) to already be live; tests validate the completed system most reliably at the end

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 3 (Collaboration):** The `ItineraryCollaborator` DB model exists but the exact schema of the invite flow (invite tokens vs. direct add by username, accept flow) is not fully specified. Needs a planning-phase decision on invite mechanism before implementing the endpoint.
- **Phase 4 (SSE Streaming):** The `EventSource` API on the frontend requires careful Redux state management for in-flight stream state (partial message accumulation, error handling mid-stream, cancellation). This pattern is well-documented but not trivial — worth a targeted research-phase task if the team is unfamiliar with SSE client patterns.

Phases with standard patterns (skip research-phase):

- **Phase 1 (Bug Fixes):** All fixes are precisely identified with exact line numbers and code samples in STACK.md and PITFALLS.md. No ambiguity.
- **Phase 2 (Frontend UIs):** Standard Redux Toolkit + React Router + MUI patterns; well-documented; architecture research provides component structure.
- **Phase 5 (Cleanup + Tests):** Mechanical tasks with clear completion criteria; standard pytest and RTL patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All upgrade targets verified against official PyPI/npm sources; version compatibility matrix cross-checked. The one MEDIUM area is the dependency removal list (websockets, kafka-python, celery, boto3) — validate each against the codebase before deleting |
| Features | MEDIUM | Table stakes and v1 scope are clear from competitor analysis and codebase state. v1.x feature sequencing (role-based collab, prompt builder) is prioritization judgment, not verified against user data — confirm priorities after v1 ships |
| Architecture | HIGH | Two-tier architecture is established; patterns (SSE, BackgroundTasks, FastAPI dependencies, optimistic updates) are from official FastAPI and OpenAI docs. MEDIUM for collaboration-specific patterns (no single authoritative source; derived from broader REST patterns) |
| Pitfalls | HIGH | Critical pitfalls (OpenAI SDK migration, JWT algorithm confusion, SQLite fallback) verified against official sources. Collaboration concurrency and MCP retirement ordering are MEDIUM — well-established patterns but not domain-specific authoritative sources |

**Overall confidence:** HIGH

### Gaps to Address

- **Invite mechanism for collaboration (Phase 3):** Research confirms the `ItineraryCollaborator` model and the need for an invite flow, but does not specify whether invites use in-app accept flows, shareable links, or direct username lookup. Decide at planning time before implementing the endpoint.
- **Chat history pagination (Phase 2):** The chat history endpoint exists but loading behavior (how many messages on initial load, pagination direction) is not specified in the research. Define a message limit (e.g., 50 most recent) at planning time to avoid unbounded chat history loads.
- **`passlib[bcrypt]` replacement:** passlib is unmaintained but stable. The research recommends deferring replacement — this is acceptable but should be tracked as known tech debt. Address in a post-revamp security review.
- **CRA → Vite migration:** CRA is officially deprecated. The research recommends keeping it because the app builds today. Flag this as a post-revamp migration to Vite — the guidance is it is ~2 hours of work once the revamp is stable.
- **`asyncio.to_thread` for Google Maps / OpenWeatherMap calls:** The sync client blocking pattern in `recommendations.py` is identified as the first performance bottleneck. Not blocking for MVP, but should be addressed in or after Phase 2 before adding more recommendation features.

---

## Sources

### Primary (HIGH confidence)

- [OpenAI Python SDK Migration Guide](https://github.com/openai/openai-python/discussions/742) — v0→v1 call pattern migration; response object format change
- [openai · PyPI](https://pypi.org/project/openai/) — current version 2.26.0; Python 3.9 compatibility
- [FastAPI official docs](https://fastapi.tiangolo.com/) — SSE (`EventSourceResponse`), BackgroundTasks, dependency injection patterns
- [SQLAlchemy 2.0 What's New](https://docs.sqlalchemy.org/en/20/changelog/whatsnew_20.html) — `DeclarativeBase` replaces `declarative_base()`
- [Redux Toolkit 2.x Migration Guide](https://redux-toolkit.js.org/usage/migrating-rtk-2) — RTK 1.x → 2.x upgrade path
- [JWT Vulnerabilities 2026](https://redsentry.com/resources/blog/jwt-vulnerabilities-list-2026-security-risks-mitigation-guide) — algorithm pinning requirement
- [Auth0: Critical vulnerabilities in JWT libraries](https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/) — algorithm confusion CVEs
- Project codebase analysis (`/.planning/codebase/CONCERNS.md`) — all codebase-specific pitfalls

### Secondary (MEDIUM confidence)

- [FastAPI Best Practices (zhanymkanov)](https://github.com/zhanymkanov/fastapi-best-practices) — service layer extraction, thin route handlers
- [REST concurrency control patterns](https://scriptin.github.io/2014-08-30/restful-http-concurrency-optimistic-locking.html) — `updated_at` optimistic locking
- [python-jose abandoned — FastAPI discussion](https://github.com/fastapi/fastapi/discussions/11345) — PyJWT recommendation
- [TanStack Query v5 migration guide](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5) — package rename and breaking changes
- [Best Group Travel Planning Apps 2025](https://www.avosquado.app/blog/best-group-travel-planning-apps-in-2025-complete-comparison) — collaboration feature expectations
- [AI travel app reviews and comparisons](https://www.jotform.com/ai/best-ai-trip-planner/) — table stakes and differentiator features
- [YouLi team roles and collaboration](https://support.youli.io/360001314975-Team-Roles-Trip-Planners-Collaboration) — role-based collab patterns

### Tertiary (informational)

- [Create React App officially deprecated](https://socket.dev/blog/create-react-app-officially-deprecated) — confirmed CRA status; supports Vite deferral decision
- [AI UX Patterns: Regenerate (ShapeOfAI)](https://www.shapeof.ai/patterns/regenerate) — per-day regeneration UX pattern
- [LocalStorage vs Cookies for JWT](https://dev.to/cotter/localstorage-vs-cookies-all-you-need-to-know-about-storing-jwt-tokens-securely-in-the-front-end-15id) — XSS risk context for deferred httpOnly cookie migration

---

*Research completed: 2026-03-09*
*Ready for roadmap: yes*
