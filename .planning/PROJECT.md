# Barabula

## What This Is

Barabula is a travel AI app for small groups. Users describe a trip and the AI generates a full itinerary; group members can then collaboratively view and manage the trip plan together. It targets a small known group of users, not the general public.

## Core Value

User describes a trip, AI generates a complete itinerary that a small group can collaboratively plan and manage.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — inferred from existing codebase -->

- ✓ User can register and log in with email/password — existing
- ✓ JWT-based session management (token issued by backend, stored client-side) — existing
- ✓ Database schema for users, itineraries, activities, chat history — existing
- ✓ Redux state management for auth, itineraries, and chat — existing
- ✓ Backend REST API structure (FastAPI with route modules per domain) — existing

### Active

<!-- Current scope — the revamp -->

- [ ] AI chat and itinerary generation actually works (fix OpenAI SDK v0 → v1 migration)
- [ ] Frontend auth works (fix API base URL pointing to wrong server)
- [ ] Chat UI is implemented (replace placeholder with real AI chat interface)
- [ ] Dashboard is implemented (replace placeholder with user's itineraries overview)
- [ ] Itineraries page is implemented (list, view, create itineraries)
- [ ] REST-based collaboration (share itinerary with group members, view/edit without real-time)
- [ ] Critical bugs fixed (metadata/extra_data mismatch, duplicate ORM relationships, gmaps None crash)
- [ ] Security issues resolved (hardcoded secrets, password logging, user enumeration, algorithm pinning)
- [ ] Frontend and backend test coverage added
- [ ] Node.js MCP server retired — all functionality consolidated into Python backend
- [ ] Code is clean and follows best practices throughout

### Out of Scope

- Real-time Socket.IO collaboration — replaced by REST-based; real-time deferred to future
- Email verification flow — small group of known users, not needed now
- Mobile app — web-first
- CRA → Vite migration — only if it actively blocks progress
- New features beyond what's already partially built

## Context

Brownfield project with significant debt accumulated. The codebase has a solid architecture (React SPA + FastAPI backend) but several critical broken areas:

- **Broken AI**: OpenAI SDK v0 calling convention used with v1 SDK installed — all AI calls throw `AttributeError` at runtime
- **Broken auth**: Frontend API URL hardcoded to port 3001 (MCP server) instead of port 8000 (FastAPI backend) — login always fails
- **Placeholder UIs**: Chat, Dashboard, and Itineraries pages all show "coming soon" — the backend APIs for all three are fully implemented
- **Silent data bugs**: `metadata`/`extra_data` field name mismatch between ORM models and Pydantic schemas causes silent data loss
- **MCP Server to retire**: Node.js MCP server (port 3001) handles real-time collab and MCP protocol tools — being retired; real-time replaced by REST-based collab in Python
- **No tests**: Testing libraries are installed but no test files exist for frontend or backend

**Tech stack:**
- Frontend: React 18 + TypeScript, Redux Toolkit, MUI 5, React Router 6, Create React App
- Backend: Python 3.9, FastAPI, SQLAlchemy 2.x, PostgreSQL (SQLite fallback to be removed)
- Auth: JWT (HS256), bcrypt
- AI: OpenAI GPT-4 (SDK to be upgraded to current v1 pattern)

## Constraints

- **Users**: Small group of known people — no public registration hardening needed, but basic security hygiene required
- **Architecture**: Two-tier after revamp (React + FastAPI); MCP/Node.js layer retired
- **AI provider**: OpenAI — keep GPT-4/GPT-4o, fix the SDK usage
- **Modernization**: Only upgrade/migrate dependencies when they directly block progress — no refactoring for its own sake

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Retire Node.js MCP server | Three services for a small-group app is unnecessary complexity; real-time collab deferred | — Pending |
| REST-based collaboration instead of Socket.IO | Simpler to build and maintain; real-time can be added later if needed | — Pending |
| Keep OpenAI, upgrade SDK | GPT-4 works well for itinerary generation; just need to fix the v0→v1 calling convention | — Pending |
| Fix before modernize | CRA is unmaintained but it works; Vite migration is not worth the risk without a clear blocker | — Pending |

---
*Last updated: 2026-03-09 after initialization*
