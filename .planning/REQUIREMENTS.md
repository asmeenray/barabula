# Requirements: Barabula

**Defined:** 2026-03-09
**Core Value:** User describes a trip, AI generates a complete itinerary that a small group can collaboratively plan and manage.

## v1 Requirements

Requirements for this revamp milestone. Each maps to a roadmap phase.

### Critical Fixes

- [x] **FIX-01**: Frontend API base URL points to FastAPI backend (port 8000), not MCP server (port 3001)
- [x] **FIX-02**: OpenAI SDK uses `AsyncOpenAI` client with `client.chat.completions.create()` pattern (v1 API, not v0 `ChatCompletion.acreate`)
- [x] **FIX-03**: OpenAI response fields accessed via attribute access (Pydantic objects), not dict key access
- [x] **FIX-04**: `extra_data` field name is consistent between SQLAlchemy models and Pydantic schemas (no `metadata` mismatch)
- [x] **FIX-05**: Duplicate `chat_history` relationship removed from `User` model
- [x] **FIX-06**: `get_nearby_places` and `get_place_details` in recommendations check for `None` gmaps client before calling methods
- [x] **FIX-07**: `test_auth.py` targets correct backend URL (port 8000)

### Security

- [x] **SEC-01**: MCP server middleware and socket handlers throw startup error if `SECRET_KEY` env var is not set (no hardcoded fallback)
- [x] **SEC-02**: JWT verification in MCP server explicitly restricts to `algorithms: ['HS256']`
- [x] **SEC-03**: Registration endpoint removes `print(f"User data: {user_data}")` log statement (plaintext password risk)
- [x] **SEC-04**: Registration exception handler returns generic error message to client (not raw exception string)
- [x] **SEC-05**: Registration returns single generic error message for both duplicate username and duplicate email (prevents user enumeration)
- [x] **SEC-06**: MCP context endpoint (`/api/context/user/:userId`) verifies requesting user matches the requested userId
- [x] **SEC-07**: `ProtectedRoute` sets `isAuthenticated: false` on initial state and only sets `true` after `getCurrentUser` thunk resolves (prevents flash of protected content)

### AI Functionality

- [x] **AI-01**: AI chat endpoint (`POST /api/v1/chat/message`) returns real GPT-4 response (not fallback static text)
- [x] **AI-02**: AI itinerary generation (`POST /api/v1/chat/generate-itinerary`) produces a full structured itinerary (not template fallback)
- [x] **AI-03**: AI itinerary generation uses `response_format={"type": "json_object"}` for reliable JSON output
- [ ] **AI-04**: Chat responses are streamed token-by-token to the frontend via Server-Sent Events (SSE)
- [x] **AI-05**: Chat history is fetched from backend on chat page load (Redux async thunk for `GET /api/v1/chat/history`)

### Stack Migration (Phase 2)

- [x] **STACK-01**: Next.js 14+ project initialized with App Router and TypeScript (replaces Create React App)
- [x] **STACK-02**: Supabase project configured with database schema matching existing data model (users, itineraries, activities, chat_history, collaborators tables with appropriate columns)
- [x] **STACK-03**: Supabase Auth handles email/password registration and login (replaces FastAPI auth endpoints)
- [x] **STACK-04**: Google OAuth is configured and working via Supabase Auth (sign in with Google on login page)
- [x] **STACK-05**: Next.js middleware (`middleware.ts`) enforces route protection — unauthenticated users redirected to /login with no flash of protected content
- [x] **STACK-06**: Vercel deployment is live with all required environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, OPENAI_API_KEY)
- [x] **STACK-07**: Core authenticated layout with navigation renders on all protected pages

### Chat UI

- [ ] **CHAT-01**: Chat page displays a functional AI conversation interface (not "coming soon" placeholder)
- [ ] **CHAT-02**: User can send a message and receive a streamed AI response
- [x] **CHAT-03**: Chat messages are persisted and visible when user returns to the chat page
- [ ] **CHAT-04**: After successful itinerary generation, user is navigated to the new itinerary detail view
- [ ] **CHAT-05**: AI responses containing itinerary data are rendered as structured content (day cards / activity items), not raw text in a chat bubble

### Dashboard

- [ ] **DASH-01**: Dashboard page displays a list of the user's itineraries (not "coming soon" placeholder)
- [x] **DASH-02**: Dashboard fetches itineraries from backend on load (`GET /api/v1/itineraries`)
- [ ] **DASH-03**: User can navigate from Dashboard to an itinerary detail view
- [ ] **DASH-04**: User can delete an itinerary from the Dashboard
- [ ] **DASH-05**: Dashboard shows empty state when user has no itineraries

### Itinerary

- [ ] **ITIN-01**: Itinerary detail page shows a day-by-day structured view (not "coming soon" placeholder)
- [ ] **ITIN-02**: Each day in the itinerary shows its activities with name, time, description, and location
- [ ] **ITIN-03**: User can create a new itinerary manually from the itinerary list (not only via AI generation)
- [ ] **ITIN-04**: User can edit an itinerary's title and description
- [x] **ITIN-05**: Client-side state management handles fetch, create, update, and delete for itineraries with consistent loading/error states across the app
- [x] **ITIN-06**: `Activity` type is properly typed with name, time, description, and location fields (no `any[]`)

### Collaboration

- [ ] **COLLAB-01**: Owner can invite a user to an itinerary by username or email
- [ ] **COLLAB-02**: Invited user receives a link or in-app notification to accept the invitation
- [ ] **COLLAB-03**: Invited user can view the shared itinerary after accepting
- [ ] **COLLAB-04**: Collaborator role is enforced: `viewer` can only view, `editor` can add/edit activities
- [ ] **COLLAB-05**: Itinerary updates include an `updated_at` version check — stale writes return `409 Conflict`
- [ ] **COLLAB-06**: Owner can see who has been invited to an itinerary and their roles
- [ ] **COLLAB-07**: Owner can remove a collaborator from an itinerary

### Cleanup & Quality

- [x] **QUAL-01**: SQLite fallback removed from `backend/database.py` — PostgreSQL is the only database
- [x] **QUAL-02**: Hardcoded `env_file` absolute path in `backend/config.py` replaced with relative path
- [x] **QUAL-03**: Deprecated `from sqlalchemy.ext.declarative import declarative_base` replaced with `from sqlalchemy.orm import DeclarativeBase`
- [ ] **QUAL-04**: Old CRA frontend (`frontend/`), FastAPI backend (`backend/`), and Node.js MCP server (`mcp-server/`) are fully retired — no dangling references in the active Next.js codebase
- [ ] **QUAL-05**: Vitest unit tests cover auth utilities, itinerary data layer, and collaboration RLS helpers
- [ ] **QUAL-06**: Playwright E2E tests cover login flow, dashboard render, chat interaction, and itinerary detail view

## v2 Requirements

Deferred to after v1 is validated.

### AI Enhancements

- **AIV2-01**: Itinerary generation uses 4096-token budget (fixes multi-day trip JSON truncation)
- **AIV2-02**: Structured prompt builder form (destination/dates/budget/group size) seeds AI generation
- **AIV2-03**: Conversational itinerary refinement — follow-up AI messages modify existing itinerary without full regeneration
- **AIV2-04**: Per-day or per-activity regeneration

### UX Polish

- **UXV2-01**: Trip summary card header (destination, dates, group members) above day-by-day plan
- **UXV2-02**: Activity status tracking (confirmed / tentative / skipped)
- **UXV2-03**: Export itinerary to PDF

### Infrastructure

- **INFV2-01**: Real-time collaboration (Supabase Realtime) — only if small-group REST collab proves insufficient

## Out of Scope

| Feature | Reason |
|---------|--------|
| Email verification flow | Small group of known users — not needed |
| Email notifications for collaboration | Small group can coordinate out-of-band |
| Real-time Socket.IO editing | Retired; REST-based collab is sufficient for async group planning |
| Booking integration | Scope-doubles the product; deep links to external sites are sufficient |
| Expense splitting | Fintech scope; out of this milestone |
| Mobile app | Web-first; responsive browser is sufficient |
| Social discovery / public trips | Private app for known group |
| Offline mode | PDF export (v2) is the low-cost substitute |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 1 | Complete |
| FIX-02 | Phase 1 | Complete |
| FIX-03 | Phase 1 | Complete |
| FIX-04 | Phase 1 | Complete |
| FIX-05 | Phase 1 | Complete |
| FIX-06 | Phase 1 | Complete |
| FIX-07 | Phase 1 | Complete |
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 1 | Complete |
| SEC-04 | Phase 1 | Complete |
| SEC-05 | Phase 1 | Complete |
| SEC-06 | Phase 1 | Complete |
| SEC-07 | Phase 1 | Complete |
| AI-01 | Phase 1 | Complete |
| AI-02 | Phase 1 | Complete |
| AI-03 | Phase 1 | Complete |
| AI-05 | Phase 1 | Complete |
| QUAL-01 | Phase 1 | Complete |
| QUAL-02 | Phase 1 | Complete |
| QUAL-03 | Phase 1 | Complete |
| STACK-01 | Phase 2 | Complete |
| STACK-02 | Phase 2 | Complete |
| STACK-03 | Phase 2 | Complete |
| STACK-04 | Phase 2 | Complete |
| STACK-05 | Phase 2 | Complete |
| STACK-06 | Phase 2 | Complete |
| STACK-07 | Phase 2 | Complete |
| CHAT-01 | Phase 3 | Pending |
| CHAT-02 | Phase 3 | Pending |
| CHAT-03 | Phase 3 | Complete |
| CHAT-04 | Phase 3 | Pending |
| CHAT-05 | Phase 3 | Pending |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 3 | Complete |
| DASH-03 | Phase 3 | Pending |
| DASH-04 | Phase 3 | Pending |
| DASH-05 | Phase 3 | Pending |
| ITIN-01 | Phase 3 | Pending |
| ITIN-02 | Phase 3 | Pending |
| ITIN-03 | Phase 3 | Pending |
| ITIN-04 | Phase 3 | Pending |
| ITIN-05 | Phase 3 | Complete |
| ITIN-06 | Phase 3 | Complete |
| COLLAB-01 | Phase 4 | Pending |
| COLLAB-02 | Phase 4 | Pending |
| COLLAB-03 | Phase 4 | Pending |
| COLLAB-04 | Phase 4 | Pending |
| COLLAB-05 | Phase 4 | Pending |
| COLLAB-06 | Phase 4 | Pending |
| COLLAB-07 | Phase 4 | Pending |
| AI-04 | Phase 5 | Pending |
| QUAL-04 | Phase 6 | Pending |
| QUAL-05 | Phase 6 | Pending |
| QUAL-06 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 55 total (48 original + 7 STACK)
- Mapped to phases: 55
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 — traceability expanded to per-requirement rows after roadmap creation*
