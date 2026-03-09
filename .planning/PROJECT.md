# Barabula

## What This Is

Barabula is a travel AI app for small groups. Users describe a trip and the AI generates a full itinerary; group members can then collaboratively view and manage the trip plan together. It targets a small known group of users, not the general public.

## Core Value

User describes a trip, AI generates a complete itinerary that a small group can collaboratively plan and manage.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — inferred from existing codebase / Phase 1 -->

- ✓ Database schema for users, itineraries, activities, chat history — existing (migrating to Supabase)
- ✓ User can register and log in with email/password — Phase 1 complete (migrating to Supabase Auth)
- ✓ AI chat and itinerary generation works end-to-end — Phase 1 complete

### Active

<!-- Current scope — the revamp -->

- [ ] Stack migrated to Next.js + Supabase + Vercel (replaces CRA + FastAPI + self-hosted PostgreSQL)
- [ ] Supabase Auth with email/password and Google OAuth
- [ ] Chat UI implemented (real AI conversation interface)
- [ ] Dashboard implemented (user's itineraries overview)
- [ ] Itineraries page implemented (list, view, create itineraries)
- [ ] REST-based collaboration (share itinerary with group members)
- [ ] AI streaming responses (token-by-token via Vercel AI SDK)
- [ ] Test coverage added
- [ ] Old CRA, FastAPI, and MCP server code retired

### Out of Scope

- Real-time Socket.IO collaboration — replaced by REST-based; deferred to future
- Email verification flow — small group of known users, not needed now
- Mobile app — web-first
- New features beyond what's already planned

## Context

Brownfield project rebuilt on a modern stack. Phase 1 fixed the broken CRA + FastAPI codebase to validate the logic. Phase 2 migrates everything to Next.js + Supabase + Vercel — a unified deployment with no separate backend server, built-in auth, and a cleaner developer experience.

**Tech stack (new — Phase 2 onward):**
- Frontend + Backend: Next.js 14+ (App Router, TypeScript, API Routes)
- Database: Supabase (PostgreSQL with Row Level Security)
- Auth: Supabase Auth (email/password + Google OAuth)
- Deployment: Vercel
- AI: OpenAI GPT-4 via Next.js API Routes
- State management: TBD at Phase 3 (Zustand / SWR — not Redux)

**Tech stack (old — Phase 1 and prior, retiring in Phase 6):**
- Frontend: React 18 + TypeScript, Redux Toolkit, MUI 5, Create React App
- Backend: Python 3.9, FastAPI, SQLAlchemy 2.x, PostgreSQL
- Auth: JWT (HS256), bcrypt
- MCP Server: Node.js (retiring)

## Constraints

- **Users**: Small group of known people — no public registration hardening beyond Supabase Auth defaults
- **Architecture**: Next.js full-stack on Vercel; no separate backend server
- **AI provider**: OpenAI — GPT-4/GPT-4o via API Routes
- **Database**: Supabase-hosted PostgreSQL
- **Auth**: Supabase Auth (handles JWT, OAuth, sessions)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Migrate to Next.js + Supabase + Vercel | Unified deployment, built-in auth, no separate server to manage | Phase 2 |
| Supabase Auth (replaces custom JWT) | Handles Google OAuth, session management, and JWT out of the box | Phase 2 |
| Supabase as DB host | Managed PostgreSQL, compatible with existing schema, pairs with Supabase Auth | Phase 2 |
| Deploy on Vercel | First-class Next.js support, Vercel AI SDK for streaming | Phase 2 + 5 |
| Retire FastAPI backend | Replaced by Next.js API Routes — one codebase, one deployment | Phase 6 |
| Retire Node.js MCP server | No longer needed after REST collaboration via Next.js API routes | Phase 6 |
| REST-based collaboration | Simpler than Socket.IO; real-time can be added later if needed | Phase 4 |
| Fix before modernize (Phase 1) | Validated the logic in the old stack before migrating | Complete |

---
*Last updated: 2026-03-09 — stack decision: Next.js + Supabase + Vercel*
