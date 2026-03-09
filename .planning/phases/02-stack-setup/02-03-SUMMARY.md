---
phase: 02-stack-setup
plan: "03"
subsystem: auth
tags: [supabase, auth, middleware, oauth, google, server-actions, pkce, route-protection]

# Dependency graph
requires:
  - phase: 02-stack-setup-01
    provides: Next.js project scaffold, Supabase SSR client helpers (server.ts/client.ts)
  - phase: 02-stack-setup-02
    provides: Supabase schema with public.users table and handle_new_user trigger
provides:
  - middleware.ts with session refresh and route guard using getUser()
  - /auth/callback PKCE OAuth code exchange handler
  - /auth/auth-code-error error landing page
  - signIn(), signInWithGoogle() Server Actions for email/Google auth
  - signUp() Server Action for email registration with full_name
  - Login page UI (Client Component) with email/password form and Google button
  - Register page UI (Client Component) with full_name/email/password fields
affects:
  - 02-04-PLAN (Vercel deployment — auth must work before deploy verification)
  - All phase 3 feature plans (authenticated routes depend on middleware protection)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Actions with 'use server' directive — signIn/signUp/signInWithGoogle return {error} on failure, call redirect() on success"
    - "Client Component form wrapper — useState for error/loading display; form action points to Server Action function"
    - "Middleware getUser() pattern — uses auth.getUser() NOT getSession() to prevent cookie spoofing"
    - "Matcher exclusion in middleware config — excludes _next/static, _next/image, favicon, image assets to avoid auth network calls on static assets"
    - "PKCE OAuth flow — /auth/callback exchanges one-time code via exchangeCodeForSession(); only allows relative redirects for security"

key-files:
  created:
    - middleware.ts
    - src/app/auth/callback/route.ts
    - src/app/auth/auth-code-error/page.tsx
    - src/app/(public)/login/actions.ts
    - src/app/(public)/register/actions.ts
  modified:
    - src/app/(public)/login/page.tsx
    - src/app/(public)/register/page.tsx

key-decisions:
  - "getUser() in middleware — validates against Supabase Auth server rather than reading cookies; prevents session spoofing via manipulated cookies"
  - "Client Component wrapper for forms — Server Action forms handle submission natively; useState wrapper needed only for loading/error display without external state library"
  - "Security: relative-redirect-only in /auth/callback — if 'next' param doesn't start with '/', reset to '/' to prevent open redirect attacks"
  - "Google OAuth auto-approved at checkpoint — auto_advance mode active; manual verification deferred to user"

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 2 Plan 03: Supabase Auth Implementation Summary

**Email/password + Google OAuth auth with Next.js middleware route guard — complete auth system using Server Actions, PKCE callback handler, and cookie-based session management**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T20:22:27Z
- **Completed:** 2026-03-09T20:24:28Z
- **Tasks:** 2 auto + 1 checkpoint (auto-approved)
- **Files modified:** 7

## Accomplishments

- Created `middleware.ts` at repo root — refreshes Supabase session on every request, redirects unauthenticated users to /login, excludes static assets from auth network calls
- Created `/auth/callback` route handler — exchanges OAuth PKCE code for session with security-hardened relative-redirect-only logic
- Created `/auth/auth-code-error` page — error landing for failed OAuth flows
- Created `signIn()`, `signInWithGoogle()`, and `signUp()` Server Actions with proper 'use server' directive
- Replaced placeholder login/register pages with functional Client Component forms handling loading/error state

## Task Commits

1. **Task 1: Middleware, auth callback, and Server Actions** — `961e632` (feat)
2. **Task 2: Login and register page UI** — `2c835c1` (feat)

## Files Created/Modified

- `middleware.ts` — Session refresh + route guard; getUser() validation; matcher excludes static assets
- `src/app/auth/callback/route.ts` — PKCE OAuth callback; exchangeCodeForSession(); relative-redirect-only security
- `src/app/auth/auth-code-error/page.tsx` — Error page for failed OAuth with link back to /login
- `src/app/(public)/login/actions.ts` — signIn() and signInWithGoogle() Server Actions
- `src/app/(public)/register/actions.ts` — signUp() Server Action with full_name metadata
- `src/app/(public)/login/page.tsx` — Login form with email/password fields, Google OAuth button, error display
- `src/app/(public)/register/page.tsx` — Registration form with full_name/email/password fields, error display

## Decisions Made

- **getUser() not getSession():** `getSession()` reads session from cookies without server revalidation — can be spoofed by manipulated cookies. `getUser()` validates against the Supabase Auth server on every request. Required for secure route protection.
- **Client Component form wrapper:** Server Action forms work without JavaScript, but error/loading state requires client-side useState. Minimal wrapper approach avoids adding useFormState complexity or external state management.
- **Relative-redirect security in callback:** Open redirect vulnerability prevention — any `next` param not starting with `/` is reset to `/` before redirect.
- **Checkpoint auto-approved:** `auto_advance: true` in config — Google OAuth manual verification (Google Cloud Console credentials, Supabase provider config) is documented in user_setup and deferred to user.

## Deviations from Plan

None — plan executed exactly as written. All files match the plan specification. TypeScript compiles without errors.

## Auth Verification Status

**Auto-approved at checkpoint** (auto_advance mode active in config.json).

**Google OAuth user_setup steps the user must complete:**
1. Google Cloud Console — create OAuth credentials (Web application type), add authorized redirect URIs:
   - `http://localhost:3000/auth/callback`
   - `https://your-app.vercel.app/auth/callback` (add after Plan 04 deployment)
2. Supabase Dashboard — Authentication > Providers > Google: enable provider, paste Client ID and Secret, copy Supabase callback URL back to Google Console
3. Supabase Dashboard — Authentication > URL Configuration > Redirect URLs: add both URLs above

**Tests to run manually:**
1. Visit /dashboard unauthenticated — should redirect immediately to /login (no content flash)
2. Register with email/password — should land on /dashboard; user appears in Supabase auth.users and public.users
3. Clear cookies, visit /dashboard — redirect to /login; sign in — redirect to /dashboard
4. Click "Sign in with Google" — completes OAuth flow, lands on /dashboard
5. Visit /login while authenticated — renders normally (no redirect loop)

**Note on email confirmation:** Supabase may require email confirmation by default. For development, disable at: Supabase Dashboard > Authentication > Settings > disable "Enable email confirmations".

## Next Phase Readiness

- Route protection active: unauthenticated users cannot access /dashboard, /chat, /itinerary
- Auth forms functional: email/password login, registration, Google OAuth ready for testing
- Trigger dependency: public.users row creation depends on the schema from Plan 02-02 being applied in Supabase
- No blockers for Plan 02-04 (Vercel deployment)

---
*Phase: 02-stack-setup*
*Completed: 2026-03-09*

## Self-Check: PASSED

- FOUND: middleware.ts
- FOUND: src/app/auth/callback/route.ts
- FOUND: src/app/auth/auth-code-error/page.tsx
- FOUND: src/app/(public)/login/actions.ts
- FOUND: src/app/(public)/register/actions.ts
- FOUND: src/app/(public)/login/page.tsx
- FOUND: src/app/(public)/register/page.tsx
- FOUND: commit 961e632 (Task 1)
- FOUND: commit 2c835c1 (Task 2)
