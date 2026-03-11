---
phase: 07-ui-overhaul-landing-page-and-chatbot-redesign
plan: 02
subsystem: auth
tags: [middleware, nextjs, oauth, supabase, auth-callback]

# Dependency graph
requires:
  - phase: 02-stack-setup
    provides: middleware.ts with Supabase auth gate and auth/callback route with next param support
provides:
  - Landing page at / accessible without authentication (unauthenticated users not redirected to /login)
  - Confirmed auth/callback ?next= param correctly routes post-OAuth to /chat?q=<prompt>
affects: [07-03-landing-page, 07-04-chatbot-redesign]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public path exact match with === '/' in middleware isPublicPath — prevents over-broad startsWith matching"

key-files:
  created: []
  modified:
    - middleware.ts

key-decisions:
  - "pathname === '/' uses exact match not startsWith to avoid accidentally exposing sub-paths of /"

patterns-established:
  - "Exact pathname match pattern for single public routes in isPublicPath"

requirements-completed: [UI-04, UI-05]

# Metrics
duration: 2min
completed: 2026-03-11
---

# Phase 7 Plan 02: Auth Gate — Public Landing Page Summary

**middleware.ts updated so unauthenticated users can visit `/` directly; auth/callback `?next=` param confirmed to route post-OAuth to `/chat?q=<prompt>` without modification**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-11T14:09:46Z
- **Completed:** 2026-03-11T14:11:39Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `request.nextUrl.pathname === '/'` to the `isPublicPath` check in middleware.ts — unauthenticated users now reach the landing page without redirect
- Audited `src/app/auth/callback/route.ts` — already correctly reads `next` searchParam with `?? '/'` default and enforces relative-only redirects via `next.startsWith('/')`; no changes needed
- Build passes cleanly with the change

## Task Commits

Each task was committed atomically:

1. **Task 1: Add / to public paths in middleware + audit auth/callback** - `5c1bf6b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `middleware.ts` - Added `pathname === '/'` to isPublicPath; unauthenticated GET / no longer redirects to /login

## Decisions Made
- Used exact match `pathname === '/'` rather than `startsWith('/')` to avoid accidentally exposing unintended sub-paths

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Landing page at `/` is now publicly accessible for unauthenticated users
- Auth callback already handles `/chat?q=<prompt>` post-OAuth redirect via `?next=` param
- Ready for 07-03 landing page implementation and 07-04 chatbot redesign

---
*Phase: 07-ui-overhaul-landing-page-and-chatbot-redesign*
*Completed: 2026-03-11*
