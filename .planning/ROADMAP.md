# Roadmap: Barabula

## Overview

Barabula is a brownfield revamp — the architecture is sound but three cascading failures break every user-facing feature. The roadmap works outward from the broken core: fix critical bugs and security issues first (Phase 1), then build out the placeholder frontend UIs against the now-working backend (Phase 2), then add REST-based group collaboration (Phase 3), then layer in AI streaming UX (Phase 4), and finally retire the Node.js MCP server and add test coverage (Phase 5).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Fix the three cascading blockers (API URL, OpenAI SDK, security) so end-to-end auth and AI generation work
- [ ] **Phase 2: Frontend UI** - Replace all placeholder pages with real Chat, Dashboard, and Itinerary UIs backed by the now-working API
- [ ] **Phase 3: Collaboration** - Add REST-based group itinerary sharing, invite flow, and role enforcement
- [ ] **Phase 4: AI Streaming** - Layer SSE streaming onto the working AI chat so responses render token-by-token
- [ ] **Phase 5: Cleanup and Tests** - Retire the Node.js MCP server and add pytest + React Testing Library coverage

## Phase Details

### Phase 1: Foundation
**Goal**: Users can log in, stay authenticated, and receive a real AI-generated itinerary — end-to-end with no broken wiring
**Depends on**: Nothing (first phase)
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04, FIX-05, FIX-06, FIX-07, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, AI-01, AI-02, AI-03, AI-05, QUAL-01, QUAL-02, QUAL-03
**Success Criteria** (what must be TRUE):
  1. User can log in with email/password and remain authenticated after a browser refresh
  2. User cannot see protected pages while the session token is being validated (no flash of protected content)
  3. Sending a trip description to the AI chat endpoint returns a real GPT-4 response, not a static fallback
  4. AI itinerary generation produces a complete structured itinerary retrievable from the database without field mapping errors
  5. Backend startup fails with a clear error if required environment variables (SECRET_KEY, DATABASE_URL) are not set
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Fix API base URL, OpenAI SDK v1 migration, extra_data field name, gmaps None-guards, test_auth.py port
- [ ] 01-02-PLAN.md — Harden registration endpoint, ProtectedRoute loading spinner, fetchChatHistory async thunk
- [ ] 01-03-PLAN.md — Remove SQLite fallback, fix DeclarativeBase, relative config path, duplicate relationship, MCP server hardening

### Phase 2: Frontend UI
**Goal**: Users can navigate a real Chat page, generate itineraries through conversation, browse their trips in a Dashboard, and view a structured day-by-day itinerary detail page
**Depends on**: Phase 1
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, ITIN-01, ITIN-02, ITIN-03, ITIN-04, ITIN-05, ITIN-06
**Success Criteria** (what must be TRUE):
  1. User can open the Chat page, send a message, and receive an AI response (not a "coming soon" placeholder)
  2. After AI itinerary generation succeeds, user is automatically navigated to the new itinerary detail view
  3. Dashboard shows the user's itineraries on load; shows an empty state message when none exist
  4. User can delete an itinerary from the Dashboard and see the list update immediately
  5. Itinerary detail page shows a day-by-day structured view with each activity's name, time, description, and location
**Plans**: TBD

Plans:
- [ ] 02-01: Redux async thunks for itinerary and chat (itinerarySlice CRUD thunks, chatSlice history thunk, Activity type)
- [ ] 02-02: Chat page UI (message thread, send form, structured itinerary response rendering, post-generation navigation)
- [ ] 02-03: Dashboard page UI (itinerary list, empty state, delete action, navigation to detail)
- [ ] 02-04: Itinerary detail and list pages (day-by-day view, create/edit forms)

### Phase 3: Collaboration
**Goal**: An itinerary owner can invite group members by username or email; invited users can accept and view the shared trip; all mutations are access-checked; concurrent edits surface a conflict rather than silently overwriting data
**Depends on**: Phase 2
**Requirements**: COLLAB-01, COLLAB-02, COLLAB-03, COLLAB-04, COLLAB-05, COLLAB-06, COLLAB-07
**Success Criteria** (what must be TRUE):
  1. Owner can invite a user by username or email and see them appear in the collaborator list with their role
  2. Invited user sees the shared itinerary in their Dashboard after accepting
  3. A viewer cannot add or edit activities; an editor can
  4. If two collaborators submit conflicting edits, the second receives a 409 Conflict response with the current server state, not a silent overwrite
  5. Owner can remove a collaborator and that user loses access immediately
**Plans**: TBD

Plans:
- [ ] 03-01: Backend collaboration endpoints (invite, accept, list collaborators, remove, role enforcement, updated_at conflict detection)
- [ ] 03-02: Frontend collaboration UI (invite dialog, collaborator list, role display, conflict error handling)

### Phase 4: AI Streaming
**Goal**: AI chat responses stream token-by-token to the frontend so users see output as it is generated rather than waiting for a spinner to resolve
**Depends on**: Phase 2
**Requirements**: AI-04
**Success Criteria** (what must be TRUE):
  1. User sees AI response text appear incrementally in the chat interface as tokens arrive, not after a delay
  2. If the stream errors mid-response, the chat UI shows an error state rather than hanging
**Plans**: TBD

Plans:
- [ ] 04-01: Backend SSE streaming endpoint and frontend EventSource integration with stream state in chatSlice

### Phase 5: Cleanup and Tests
**Goal**: The Node.js MCP server is fully retired with no dangling references, and the completed system has pytest and React Testing Library coverage
**Depends on**: Phase 3
**Requirements**: QUAL-04, QUAL-05, QUAL-06
**Success Criteria** (what must be TRUE):
  1. No reference to port 3001, mcp-server, or socket.io exists anywhere in the codebase after retirement
  2. The pytest suite runs against auth endpoints, AI service, itinerary CRUD, and collaboration access checks without failures
  3. The React Testing Library suite covers auth flow, dashboard render, chat page interactions, and itinerary views without failures
**Plans**: TBD

Plans:
- [ ] 05-01: MCP server retirement (full-repo audit, directory deletion, CORS cleanup, dependency removal)
- [ ] 05-02: Backend pytest suite (auth, AI service, itinerary CRUD, collaboration endpoints)
- [ ] 05-03: Frontend React Testing Library suite (auth flow, dashboard, chat, itinerary views)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5
Note: Phase 4 depends only on Phase 2 and can be parallelized with Phase 3 if desired.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Not started | - |
| 2. Frontend UI | 0/4 | Not started | - |
| 3. Collaboration | 0/2 | Not started | - |
| 4. AI Streaming | 0/1 | Not started | - |
| 5. Cleanup and Tests | 0/3 | Not started | - |
