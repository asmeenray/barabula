# Phase 2: Stack Setup - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Initialize a Next.js + Supabase + Vercel project that replaces the existing CRA frontend and FastAPI backend. This phase delivers: a working Next.js App Router project, Supabase database schema, Supabase Auth with email/password and Google OAuth, middleware-based route protection, and a live Vercel deployment.

User-facing feature pages (Chat, Dashboard, Itinerary) are Phase 3. This phase is infrastructure only — the end result is a running app with auth and a blank authenticated home page.

</domain>

<decisions>
## Implementation Decisions

### Framework and tooling
- Next.js 14+ with App Router (not Pages Router)
- TypeScript throughout
- Tailwind CSS for styling (replaces MUI — clean start on new stack)
- No Redux — state management approach decided in Phase 3

### Database
- Supabase-hosted PostgreSQL
- Schema must match existing data model: users, itineraries, activities, chat_history, collaborators tables
- Row Level Security (RLS) enabled from the start — users can only access their own data
- Supabase JS client (`@supabase/supabase-js`) used for all DB queries (no Prisma, no raw SQL in app code)

### Auth
- Supabase Auth handles all authentication — no custom JWT logic
- Email/password: standard Supabase Auth signup/login
- Google OAuth: configured via Supabase Auth OAuth providers (Google Cloud Console + Supabase dashboard)
- Session managed by Supabase Auth client — no manual token storage
- Next.js middleware (`middleware.ts`) reads Supabase session to protect routes — redirect to /login if unauthenticated

### Route protection
- All routes under `/app/(authenticated)/` are protected via middleware
- `/login` and `/register` are public
- No flash of protected content — middleware runs server-side before page renders

### Deployment
- Frontend + API routes: Vercel
- Database + Auth: Supabase (separate service, connected via environment variables)
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `vercel.json` not needed for basic Next.js — Vercel auto-detects

### What's NOT in this phase
- Feature pages (Chat, Dashboard, Itinerary) — Phase 3
- Collaboration tables/RLS — Phase 4 (basic per-user RLS is enough for now)
- AI API routes — Phase 3

### Claude's Discretion
- Exact folder structure within `src/` (app router conventions apply)
- Supabase client helper pattern (server vs client component helpers)
- Login/register page visual design — functional first, polished in Phase 3
- Loading states and error handling on auth forms

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing database schema (from SQLAlchemy models): users table has id (UUID), username, email, hashed_password, full_name, avatar_url, preferences (JSON), language, timezone, is_active, is_verified, created_at, updated_at
- Itineraries table: id (UUID), user_id (FK), title, description, destination, start_date, end_date, extra_data (JSON), created_at, updated_at
- Activities table: id (UUID), itinerary_id (FK), day_number, name, time, description, location, activity_type, extra_data
- Chat history table: id, user_id (FK), role, content, created_at

### Established Patterns (from Phase 1 decisions)
- Port 8000 standard (now superseded — Next.js API routes replace the FastAPI backend)
- JWT auth flow validated in Phase 1 — same logical flow, now handled by Supabase Auth
- `isAuthenticated: false` initial state + loading state before granting route access (carried into Next.js middleware pattern)

### Integration Points
- The existing `frontend/` directory (CRA) is being replaced — new Next.js project goes in the repo root or a `src/` directory
- The existing `backend/` and `mcp-server/` directories remain until Phase 6 but are not referenced by the new Next.js app
- OpenAI calls will move to Next.js API routes in Phase 3 — no need to touch backend/api/chat.py now

</code_context>

<specifics>
## Specific Ideas

- Use `@supabase/ssr` package for server-side Supabase client (the recommended approach for Next.js App Router as of 2024)
- Google OAuth callback URL will be `{VERCEL_URL}/auth/callback` — needs to be added to both Google Cloud Console and Supabase Auth allowed redirect URLs
- Supabase Auth uses its own `users` table in the `auth` schema — the app's `public.users` table should use `auth.users.id` as the primary key (foreign key reference) and be populated via a Supabase trigger on `auth.users` insert

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-stack-setup*
*Context gathered: 2026-03-09*
