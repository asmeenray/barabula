# Roadmap: Barabula

## Overview

Barabula is a brownfield revamp migrating to a modern stack. Phase 1 fixed the broken CRA + FastAPI codebase to validate the core logic. Phase 2 migrates the entire stack to Next.js + Supabase + Vercel (no separate backend server, built-in auth with Google OAuth). Phase 3 builds the real product UIs (Chat, Dashboard, Itinerary). Phase 4 adds REST-based collaboration. Phase 5 adds AI streaming via Vercel AI SDK. Phase 6 retires the old CRA/FastAPI/MCP code and adds test coverage.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Fix the three cascading blockers (API URL, OpenAI SDK, security) in the old CRA + FastAPI stack to validate the core logic (completed 2026-03-09)
- [ ] **Phase 2: Stack Setup** - Migrate to Next.js + Supabase + Vercel: new project, Supabase DB schema, Supabase Auth (email/password + Google OAuth), middleware, Vercel deploy
- [ ] **Phase 3: Core Pages** - Build real Chat, Dashboard, and Itinerary UIs in Next.js backed by Supabase and Next.js API Routes
- [ ] **Phase 4: Collaboration** - Add REST-based group itinerary sharing, invite flow, and role enforcement via Supabase RLS
- [ ] **Phase 5: AI Streaming** - Layer Vercel AI SDK streaming onto the AI chat so responses render token-by-token
- [ ] **Phase 6: Cleanup and Tests** - Retire CRA, FastAPI, and MCP server code; add Vitest + Playwright coverage

## Phase Details

### Phase 1: Foundation
**Goal**: Users can log in, stay authenticated, and receive a real AI-generated itinerary — end-to-end with no broken wiring (in old CRA + FastAPI stack; logic validated here before migration)
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
- [x] 01-01-PLAN.md — Fix API base URL, OpenAI SDK v1 migration, extra_data field name, gmaps None-guards, test_auth.py port
- [x] 01-02-PLAN.md — Harden registration endpoint, ProtectedRoute loading spinner, fetchChatHistory async thunk
- [x] 01-03-PLAN.md — Remove SQLite fallback, fix DeclarativeBase, relative config path, duplicate relationship, MCP server hardening

### Phase 2: Stack Setup
**Goal**: A Next.js + Supabase + Vercel project is live — users can sign up, log in with email/password or Google, and access the app through a protected layout; the old CRA frontend is replaced
**Depends on**: Phase 1
**Requirements**: STACK-01, STACK-02, STACK-03, STACK-04, STACK-05, STACK-06, STACK-07
**Success Criteria** (what must be TRUE):
  1. Next.js app is initialized with App Router, TypeScript, and Tailwind CSS and replaces the CRA frontend
  2. Supabase project is configured with a schema matching the existing data model (users, itineraries, activities, chat_history, collaborators)
  3. User can register and log in with email/password via Supabase Auth
  4. User can sign in with Google via Supabase Auth OAuth
  5. Unauthenticated users are redirected to /login by Next.js middleware (no flash of protected content)
  6. App is deployed on Vercel with all required environment variables configured
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md — Next.js project scaffolding, Supabase client helpers, route groups, authenticated layout with nav
- [ ] 02-02-PLAN.md — Supabase schema (5 tables), RLS policies, public.users trigger
- [ ] 02-03-PLAN.md — Supabase Auth: email/password + Google OAuth forms, middleware route protection
- [ ] 02-04-PLAN.md — Vercel deployment with environment variables, production auth verification

### Phase 3: Core Pages
**Goal**: Users can navigate a real Chat page, generate itineraries through conversation, browse their trips in a Dashboard, and view a structured day-by-day itinerary detail page — all in Next.js backed by Supabase
**Depends on**: Phase 2
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, ITIN-01, ITIN-02, ITIN-03, ITIN-04, ITIN-05, ITIN-06
**Success Criteria** (what must be TRUE):
  1. User can open the Chat page, send a message, and receive an AI response (not a "coming soon" placeholder)
  2. After AI itinerary generation succeeds, user is automatically navigated to the new itinerary detail view
  3. Dashboard shows the user's itineraries on load; shows an empty state message when none exist
  4. User can delete an itinerary from the Dashboard and see the list update immediately
  5. Itinerary detail page shows a day-by-day structured view with each activity's name, time, description, and location
**Plans**: TBD

Plans:
- [ ] 03-01: Data layer (Supabase queries for itineraries and chat, client state management pattern, Activity type)
- [ ] 03-02: Chat page (message thread, send form, OpenAI API route, itinerary response rendering, post-generation navigation)
- [ ] 03-03: Dashboard page (itinerary list, empty state, delete action, navigation to detail)
- [ ] 03-04: Itinerary detail and list pages (day-by-day view, create/edit forms)

### Phase 4: Collaboration
**Goal**: An itinerary owner can invite group members by email; invited users can accept and view the shared trip; all mutations are access-checked via Supabase RLS; concurrent edits surface a conflict rather than silently overwriting data
**Depends on**: Phase 3
**Requirements**: COLLAB-01, COLLAB-02, COLLAB-03, COLLAB-04, COLLAB-05, COLLAB-06, COLLAB-07
**Success Criteria** (what must be TRUE):
  1. Owner can invite a user by email and see them appear in the collaborator list with their role
  2. Invited user sees the shared itinerary in their Dashboard after accepting
  3. A viewer cannot add or edit activities; an editor can (enforced by Supabase RLS)
  4. If two collaborators submit conflicting edits, the second receives a 409 Conflict response with the current server state, not a silent overwrite
  5. Owner can remove a collaborator and that user loses access immediately
**Plans**: TBD

Plans:
- [ ] 04-01: Collaboration data model (invites table, RLS policies for viewer/editor roles, updated_at conflict detection)
- [ ] 04-02: Collaboration UI (invite dialog, collaborator list, role display, conflict error handling)

### Phase 5: AI Streaming
**Goal**: AI chat responses stream token-by-token to the frontend via Vercel AI SDK so users see output as it is generated rather than waiting for a spinner to resolve
**Depends on**: Phase 3
**Requirements**: AI-04
**Success Criteria** (what must be TRUE):
  1. User sees AI response text appear incrementally in the chat interface as tokens arrive, not after a delay
  2. If the stream errors mid-response, the chat UI shows an error state rather than hanging
**Plans**: TBD

Plans:
- [ ] 05-01: Vercel AI SDK streaming API route and frontend useChat hook integration

### Phase 6: Cleanup and Tests
**Goal**: The old CRA frontend, FastAPI backend, and Node.js MCP server are fully retired with no dangling references; the completed Next.js app has Vitest unit tests and Playwright E2E coverage
**Depends on**: Phase 4
**Requirements**: QUAL-04, QUAL-05, QUAL-06
**Success Criteria** (what must be TRUE):
  1. No reference to the frontend/, backend/, or mcp-server/ directories exists in the active codebase after retirement
  2. Vitest suite covers auth flow, itinerary CRUD actions, and collaboration access checks
  3. Playwright E2E suite covers login, dashboard render, chat interaction, and itinerary detail view
**Plans**: TBD

Plans:
- [ ] 06-01: Old stack retirement (remove frontend/, backend/, mcp-server/ directories, clean up root config files)
- [ ] 06-02: Vitest unit tests (auth utilities, itinerary data layer, collaboration RLS helpers)
- [ ] 06-03: Playwright E2E tests (login flow, dashboard, chat page, itinerary views)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6
Note: Phase 5 depends only on Phase 3 and can be parallelized with Phase 4 if desired.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-03-09 |
| 2. Stack Setup | 1/5 | In Progress|  |
| 3. Core Pages | 0/4 | Not started | - |
| 4. Collaboration | 0/2 | Not started | - |
| 5. AI Streaming | 0/1 | Not started | - |
| 6. Cleanup and Tests | 0/3 | Not started | - |
