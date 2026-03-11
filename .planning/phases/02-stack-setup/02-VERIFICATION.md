---
phase: 02-stack-setup
verified: 2026-03-09T00:00:00Z
status: human_needed
score: 13/15 must-haves verified
re_verification: false
human_verification:
  - test: "Vercel deployment is live"
    expected: "App accessible at a vercel.app URL; route protection works in production; email/password and Google OAuth auth flows succeed in production"
    why_human: "STACK-06 is entirely user-configured (Vercel dashboard, env vars, OAuth redirect URIs). No code artifacts to verify; deployment state cannot be checked programmatically."
  - test: "Google OAuth flow completes end-to-end"
    expected: "Clicking 'Sign in with Google' on /login navigates user through Google's consent screen and returns to /dashboard with a session; Supabase triggers create a public.users row"
    why_human: "OAuth requires live Supabase project credentials in .env.local and a configured Google Cloud Console project with authorized redirect URIs — external services that cannot be verified by static analysis."
---

# Phase 2: Stack Setup — Verification Report

**Phase Goal:** A Next.js + Supabase + Vercel project is live — users can sign up, log in with email/password or Google, and access the app through a protected layout; the old CRA frontend is replaced
**Verified:** 2026-03-09
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Next.js App Router project initialized with TypeScript and Tailwind (STACK-01) | VERIFIED | `package.json` declares `next@^16.1.6`, `typescript@^5`, `tailwindcss@^3.4.1`; `src/app/layout.tsx` uses App Router conventions; `tsconfig.json` exists; `npx tsc --noEmit` exits clean |
| 2 | Root page redirects away from default Next.js placeholder | VERIFIED | `src/app/page.tsx` calls `redirect('/dashboard')` — no default Next.js scaffold content |
| 3 | Authenticated layout renders navigation on all protected pages | VERIFIED | `src/app/(authenticated)/layout.tsx` renders a full `<nav>` with Barabula branding, Dashboard/Chat links, and user email; calls `supabase.auth.getUser()` and redirects to `/login` if no user |
| 4 | Supabase browser and server client helpers are importable | VERIFIED | `src/lib/supabase/client.ts` exports `createClient()` using `createBrowserClient`; `src/lib/supabase/server.ts` exports async `createClient()` using `createServerClient` with cookie helpers — both substantive |
| 5 | TypeScript compiles without errors | VERIFIED | `npx tsc --noEmit` produces no output (exit 0) |
| 6 | Supabase schema SQL file covers all 5 tables with RLS and trigger (STACK-02) | VERIFIED | `supabase/schema.sql` contains 5 `CREATE TABLE` statements (`users`, `itineraries`, `activities`, `chat_history`, `collaborators`), `ENABLE ROW LEVEL SECURITY` on all five, 6 RLS policies, and the `on_auth_user_created` trigger with `SECURITY DEFINER` |
| 7 | Email/password registration Server Action exists and calls Supabase Auth (STACK-03) | VERIFIED | `src/app/(public)/register/actions.ts` has `'use server'`, calls `supabase.auth.signUp()` with email, password, and `full_name` metadata, returns `{error}` on failure, calls `redirect('/dashboard')` on success |
| 8 | Email/password login Server Action exists and calls Supabase Auth (STACK-03) | VERIFIED | `src/app/(public)/login/actions.ts` has `'use server'`, calls `supabase.auth.signInWithPassword()`, returns `{error}` on failure, calls `redirect('/dashboard')` on success |
| 9 | Google OAuth Server Action exists with correct PKCE redirect (STACK-04) | VERIFIED | `signInWithGoogle()` in `src/app/(public)/login/actions.ts` calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: \`${origin}/auth/callback\` } })` and redirects to the OAuth URL |
| 10 | OAuth PKCE callback handler exists and exchanges code for session (STACK-04) | VERIFIED | `src/app/auth/callback/route.ts` exports `GET`, reads `code` param, calls `supabase.auth.exchangeCodeForSession(code)`, includes open-redirect prevention, redirects to `/auth/auth-code-error` on failure |
| 11 | Middleware enforces route protection with no content flash (STACK-05) | VERIFIED | `middleware.ts` at repo root uses `supabase.auth.getUser()` (not `getSession()`), redirects unauthenticated non-public-path requests to `/login`; matcher excludes static assets to avoid performance degradation |
| 12 | Login and register pages have real forms (not placeholders) | VERIFIED | Both pages are full `'use client'` components with email/password fields, error display, loading states, and Server Action wiring. Register page includes full_name field. Login page includes Google OAuth button |
| 13 | Core authenticated route group structure is present | VERIFIED | `src/app/(authenticated)/` contains `dashboard/`, `chat/`, `itinerary/`, and `layout.tsx`; `src/app/(public)/` contains `login/` and `register/`; `src/app/auth/` contains `callback/` and `auth-code-error/` |
| 14 | App deployed on Vercel with env vars configured (STACK-06) | NEEDS HUMAN | Plan 04 auto-approved the deployment checkpoint — no code artifacts prove Vercel was configured. Documented in `02-04-SUMMARY.md` as user_setup steps pending manual completion |
| 15 | Google OAuth works end-to-end (STACK-04 live verification) | NEEDS HUMAN | Code for OAuth is complete (truth 9+10 verified). Functional verification requires a live Supabase project with Google provider configured, `.env.local` populated, and Google Cloud Console credentials set up |

**Score:** 13/15 truths verified (2 require human verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/supabase/client.ts` | createClient() for Client Components | VERIFIED | Exports `createClient()` using `createBrowserClient` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `src/lib/supabase/server.ts` | createClient() for Server Components / Actions | VERIFIED | Exports async `createClient()` using `createServerClient` with full cookie `getAll`/`setAll` implementation |
| `src/app/layout.tsx` | Root layout with html/body, Tailwind base styles | VERIFIED | Imports Inter font, `globals.css`, sets `<html lang="en">` and `<body>` wrapper |
| `src/app/(authenticated)/layout.tsx` | Protected shell with navigation bar | VERIFIED | Calls `supabase.auth.getUser()`, redirects unauthenticated, renders full nav with links and user email |
| `.env.local.example` | Env var template with required keys | VERIFIED | Documents `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (with PUBLISHABLE_KEY note), `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` |
| `supabase/schema.sql` | Full SQL for 5 tables, RLS, trigger | VERIFIED | 163-line SQL file with all 5 tables, RLS enabled on each, 6 policies, `handle_new_user()` trigger function |
| `src/app/(public)/login/page.tsx` | Login form with email/password and Google button | VERIFIED | Full Client Component with email/password form, Google OAuth button with SVG icon, error display, loading state |
| `src/app/(public)/login/actions.ts` | signIn() and signInWithGoogle() Server Actions | VERIFIED | `'use server'` directive; both exports present with correct Supabase Auth calls |
| `src/app/(public)/register/page.tsx` | Registration form with full_name/email/password | VERIFIED | Full Client Component with three input fields, error display, loading state |
| `src/app/(public)/register/actions.ts` | signUp() Server Action | VERIFIED | `'use server'` directive; calls `signUp()` with `full_name` in `options.data` |
| `src/app/auth/callback/route.ts` | OAuth PKCE callback handler | VERIFIED | Exports `GET`; calls `exchangeCodeForSession()`; relative-redirect-only security |
| `middleware.ts` | Session refresh and route guard | VERIFIED | At repo root; uses `getUser()`; correct matcher excluding static assets |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/(authenticated)/layout.tsx` | `src/lib/supabase/server.ts` | `createClient()` + `getUser()` | WIRED | Layout imports `createClient` from `@/lib/supabase/server`, awaits it, and calls `supabase.auth.getUser()` to gate nav display |
| `src/lib/supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `createBrowserClient` env vars | WIRED | Client.ts directly references both env vars via `process.env.NEXT_PUBLIC_SUPABASE_URL!` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!` |
| `src/app/(public)/login/page.tsx` | `src/app/(public)/login/actions.ts` | `form action={handleSubmit}`, `onClick={handleGoogle}` | WIRED | Login page imports `signIn` and `signInWithGoogle`; `handleSubmit` calls `signIn(formData)`; `handleGoogle` calls `signInWithGoogle()` |
| `src/app/auth/callback/route.ts` | `src/lib/supabase/server.ts` | `createClient()` + `exchangeCodeForSession()` | WIRED | Callback route imports `createClient` from `@/lib/supabase/server`, awaits it, calls `supabase.auth.exchangeCodeForSession(code)` |
| `middleware.ts` | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `createServerClient()` with `getUser()` | WIRED | Middleware directly passes `process.env.NEXT_PUBLIC_SUPABASE_URL!` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!` to `createServerClient` |
| `auth.users` (Supabase internal) | `public.users` | `on_auth_user_created` trigger | IN SCHEMA (needs human) | Trigger function and `CREATE TRIGGER` statement are present in `supabase/schema.sql`. Live trigger behavior requires Supabase project with schema applied |
| `supabase/schema.sql` activities RLS | `public.itineraries` | EXISTS subquery on `itinerary_id` | WIRED IN SQL | RLS policy for activities uses `EXISTS (SELECT 1 FROM public.itineraries WHERE id = activities.itinerary_id AND user_id = (SELECT auth.uid()))` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| STACK-01 | 02-01 | Next.js 14+ with App Router and TypeScript | SATISFIED | `package.json`: `next@^16.1.6`, `typescript@^5`, App Router folder structure confirmed |
| STACK-02 | 02-02 | Supabase schema with 5 tables matching data model | SATISFIED (code) / NEEDS HUMAN (live) | `supabase/schema.sql` contains all 5 tables with correct columns; applying to live Supabase project is user-driven |
| STACK-03 | 02-03 | Email/password registration and login via Supabase Auth | SATISFIED (code) / NEEDS HUMAN (live) | `register/actions.ts` and `login/actions.ts` call `signUp()` and `signInWithPassword()` respectively; live test requires env vars |
| STACK-04 | 02-03 | Google OAuth via Supabase Auth | SATISFIED (code) / NEEDS HUMAN (live) | `signInWithGoogle()` action and `/auth/callback` route are complete; live test requires Google Cloud Console + Supabase provider config |
| STACK-05 | 02-03 | Middleware route protection with no content flash | SATISFIED | `middleware.ts` uses `getUser()`, correct public path exclusions, static asset matcher — fully verifiable via code |
| STACK-06 | 02-04 | Vercel deployment live with all env vars | NEEDS HUMAN | Local build verified clean (02-04-SUMMARY confirms `npm run build` passes); actual Vercel deployment is user-driven and auto-approved via `auto_advance` |
| STACK-07 | 02-01 | Authenticated layout with navigation on all protected pages | SATISFIED | `src/app/(authenticated)/layout.tsx` renders nav on all routes under that group |

All 7 STACK requirement IDs are accounted for. No orphaned requirements from this phase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/(authenticated)/dashboard/page.tsx` | 5 | "will appear here in Phase 3" | Info | Intentional scaffold — Phase 3 replaces this page. Not a blocker for Phase 2 goal |
| `src/app/(authenticated)/chat/page.tsx` | 5 | "will appear here in Phase 3" | Info | Intentional scaffold — Phase 3 replaces this page. Not a blocker for Phase 2 goal |
| `src/app/(authenticated)/itinerary/page.tsx` | 5 | "will appear here in Phase 3" | Info | Intentional scaffold — Phase 3 replaces this page. Not a blocker for Phase 2 goal |

No blockers. The placeholder text in authenticated pages is explicitly by design — the plan docs describe them as "Placeholder (Phase 3 will replace)". No TODO/FIXME, console.log stubs, or dead code were found.

### Human Verification Required

#### 1. Vercel Production Deployment (STACK-06)

**Test:** Follow steps in `02-04-PLAN.md` user_setup section: import repo to Vercel, add all four environment variables in Vercel Settings, trigger a redeployment. Open an incognito window to `https://your-app.vercel.app/dashboard`.
**Expected:** Browser redirects to `/login`. Register a new account — lands on `/dashboard` with nav bar. Refresh while logged in — session persists.
**Why human:** Vercel deployment, dashboard env var configuration, and OAuth redirect URI registration are external service operations that cannot be verified through static code analysis. Plan 04 checkpoint was auto-approved via `auto_advance: true`.

#### 2. Google OAuth End-to-End (STACK-04 live)

**Test:** Complete Google Cloud Console OAuth credentials setup and Supabase Authentication > Providers > Google configuration as documented in `02-03-PLAN.md` user_setup section. Start `npm run dev` with `.env.local` populated. Go to `http://localhost:3000/login`, click "Sign in with Google".
**Expected:** Browser navigates to Google's consent screen, user approves, browser returns to `/auth/callback`, session is established, user lands on `/dashboard`. Verify in Supabase Dashboard > Authentication > Users that the Google user appears, and in Table Editor > users that a `public.users` row was created by the trigger.
**Why human:** OAuth flow requires live Supabase project with Google provider enabled, valid Google Client ID/Secret, authorized redirect URIs, and `.env.local` populated — all external configuration that cannot be checked via code inspection.

#### 3. Supabase Schema Applied to Live Project (STACK-02 live)

**Test:** In Supabase Dashboard > SQL Editor, paste the contents of `supabase/schema.sql` and run it. Navigate to Supabase Dashboard > Table Editor.
**Expected:** Five tables visible: `users`, `itineraries`, `activities`, `chat_history`, `collaborators`. Each shows "RLS enabled" badge.
**Why human:** `supabase/schema.sql` exists and is correct code, but its application to a live Supabase project requires dashboard access and is a user-driven step.

### Gaps Summary

No code gaps. All Phase 2 code artifacts are present, substantive (non-stub), and correctly wired. The 2 unverified truths and 1 partial requirement (STACK-06) are gated on external service configuration that is inherently user-driven — the code produced by Phase 2 is complete and ready for those external steps.

The three items flagged for human verification are setup tasks, not code defects:
- Vercel deployment and env var configuration (STACK-06)
- Google OAuth provider configuration in Supabase and Google Cloud Console (STACK-04 live)
- Applying `supabase/schema.sql` to the live Supabase project (STACK-02 live)

All 7 STACK requirements have code-level implementation evidence. Requirements STACK-01, STACK-05, and STACK-07 are fully satisfied by code alone. Requirements STACK-02, STACK-03, STACK-04, and STACK-06 are complete in code but require live service configuration for functional end-to-end verification.

---

_Verified: 2026-03-09_
_Verifier: Claude (gsd-verifier)_
