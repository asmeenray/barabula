---
phase: 02-stack-setup
plan: "01"
subsystem: infra
tags: [nextjs, typescript, tailwind, supabase, ssr, app-router]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Planning context, project architecture decisions (Next.js + Supabase + Vercel stack)
provides:
  - Next.js 16 App Router project initialized at repo root with TypeScript and Tailwind
  - Supabase browser client helper (src/lib/supabase/client.ts) for Client Components
  - Supabase server client helper (src/lib/supabase/server.ts) for Server Components/Actions/Route Handlers
  - Route group structure: (authenticated) and (public) with placeholder pages
  - Authenticated layout shell with navigation bar rendering on all protected pages
affects:
  - 02-02-PLAN (database schema — imports Supabase server client)
  - 02-03-PLAN (auth flows — extends authenticated layout, uses Supabase clients)
  - 02-04-PLAN (middleware — imports Supabase server client for session reads)
  - All phase 3 feature plans

# Tech tracking
tech-stack:
  added:
    - next@^16.1.6 (App Router, TypeScript, Turbopack)
    - react@^19.0.0
    - react-dom@^19.0.0
    - tailwindcss@^3.4.1
    - autoprefixer
    - postcss
    - @supabase/supabase-js@^2.99.0
    - @supabase/ssr@^0.9.0
    - eslint-config-next@^16.1.6
  patterns:
    - Server client: async createClient() using cookies() from next/headers — for Server Components, Server Actions, Route Handlers
    - Browser client: sync createClient() using createBrowserClient — for Client Components
    - Route groups: (authenticated) for protected routes, (public) for unauthenticated routes — folders do NOT appear in URLs
    - Authenticated layout redirects to /login if getUser() returns null

key-files:
  created:
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/(authenticated)/layout.tsx
    - src/app/(authenticated)/dashboard/page.tsx
    - src/app/(authenticated)/chat/page.tsx
    - src/app/(authenticated)/itinerary/page.tsx
    - src/app/(public)/login/page.tsx
    - src/app/(public)/register/page.tsx
    - src/app/globals.css
    - next.config.ts
    - tsconfig.json
    - tailwind.config.ts
    - postcss.config.mjs
    - .eslintrc.json
    - .env.local.example
    - package.json
  modified:
    - .gitignore (added .env.local exclusion, .env.local.example exception)

key-decisions:
  - "Next.js 16.1.6 used instead of 14 — create-next-app@latest resolved to 16.x which is Next.js 14+ compatible and preferred; plan said 14+"
  - "Manual project setup used instead of create-next-app — existing repo directories (frontend/, mcp-server/) prevented create-next-app from running in-place"
  - "tsconfig.json excludes frontend/, backend/, mcp-server/, mobile/, shared/, infrastructure/ — prevents legacy CRA and MCP server TypeScript from polluting the root tsconfig"
  - "autoprefixer installed as devDependency — required by postcss.config.mjs which create-next-app would have included"

patterns-established:
  - "Supabase server client: always async, always imports cookies() from next/headers, used for any server-side code"
  - "Supabase browser client: always sync, used only in Client Components (marked 'use client')"
  - "Route groups: (authenticated) = protected behind getUser() check, (public) = no auth required"
  - "getUser() in authenticated layout is for nav display only — middleware (02-04) is the actual security gate"

requirements-completed:
  - STACK-01
  - STACK-07

# Metrics
duration: 18min
completed: 2026-03-09
---

# Phase 2 Plan 01: Next.js Project Scaffold Summary

**Next.js 16 App Router project with Supabase SSR client helpers, (authenticated)/(public) route groups, and nav shell layout — bootable foundation for all Phase 2 plans**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-09T20:12:42Z
- **Completed:** 2026-03-09T20:30:00Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments

- Initialized Next.js 16 App Router project manually in repo root (create-next-app blocked by existing directories)
- Created Supabase browser and server client helpers using @supabase/ssr — both are importable and build-verified
- Established route group structure with (authenticated) shell layout containing nav bar, and (public) login/register placeholder pages
- `npm run build` completes successfully with 8 routes, zero TypeScript or ESLint errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js project and install Supabase packages** - `ed31343` (chore)
2. **Task 2: Create folder structure, Supabase clients, and route group layouts** - `c661417` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/lib/supabase/client.ts` — createBrowserClient() export for Client Components
- `src/lib/supabase/server.ts` — async createServerClient() export for Server Components, Actions, Route Handlers
- `src/app/layout.tsx` — Root layout with Inter font and Tailwind globals.css import
- `src/app/page.tsx` — Root page redirecting to /dashboard
- `src/app/(authenticated)/layout.tsx` — Protected shell with nav bar; redirects to /login if no user
- `src/app/(authenticated)/dashboard/page.tsx` — Placeholder dashboard page
- `src/app/(authenticated)/chat/page.tsx` — Placeholder chat page
- `src/app/(authenticated)/itinerary/page.tsx` — Placeholder itinerary page
- `src/app/(public)/login/page.tsx` — Placeholder login page
- `src/app/(public)/register/page.tsx` — Placeholder register page
- `src/app/globals.css` — Tailwind base/components/utilities directives
- `next.config.ts` — Empty Next.js config (Vercel auto-detects)
- `tsconfig.json` — TypeScript config excluding legacy directories
- `tailwind.config.ts` — Content paths for src/app/** and src/components/**
- `postcss.config.mjs` — tailwindcss + autoprefixer
- `.eslintrc.json` — next/core-web-vitals
- `.env.local.example` — Documents NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
- `package.json` — next, react, @supabase/supabase-js, @supabase/ssr, tailwindcss, typescript
- `.gitignore` — Added .env.local exclusion and .env.local.example exception

## Decisions Made

- **Next.js 16 instead of 14:** create-next-app@latest resolves to Next.js 16.1.6. Plan specified "14+" so 16 is fully compatible. Used latest stable for best DX.
- **Manual scaffold instead of create-next-app:** The tool refuses to run in a directory with existing files (frontend/, mcp-server/, .planning/, etc.). Created all config files manually from the standard create-next-app output.
- **tsconfig excludes legacy directories:** Without explicit exclusion, root tsconfig picks up frontend/src/*.tsx and mcp-server/src/*.ts and fails on their missing dependencies. Added all legacy directories to exclude array.
- **autoprefixer added explicitly:** postcss.config.mjs references autoprefixer; it must be installed separately since it's not bundled with tailwindcss.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Manual project creation instead of create-next-app**
- **Found during:** Task 1 (scaffold)
- **Issue:** `npx create-next-app@latest .` failed with "directory contains files that could conflict" — existing .planning/, frontend/, mcp-server/, etc. blocked the tool
- **Fix:** Created all project files manually: package.json, next.config.ts, tsconfig.json, tailwind.config.ts, postcss.config.mjs, .eslintrc.json, globals.css — equivalent output to create-next-app
- **Files modified:** All config files listed above
- **Verification:** `npm run build` passes; `npx tsc --noEmit` passes
- **Committed in:** ed31343 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed tsconfig picking up legacy TypeScript from other directories**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** `npx tsc --noEmit` reported 20+ errors from frontend/src/*.tsx and mcp-server/src/*.ts due to missing dependencies in those packages
- **Fix:** Added frontend/, backend/, mcp-server/, mobile/, shared/, infrastructure/ to tsconfig.json exclude array
- **Files modified:** tsconfig.json
- **Verification:** `npx tsc --noEmit` exits clean
- **Committed in:** c661417 (Task 2 commit — tsconfig auto-updated by Next.js build)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were necessary; no scope creep. Final output matches plan specification exactly.

## Issues Encountered

- `.env.local.example` was matched by `.env.*` gitignore rule — added explicit `!.env.local.example` exception to allow tracking the example file.

## User Setup Required

None - no external service configuration required at this stage. Supabase credentials will be needed in Plan 02-02 (database setup) — documented in `.env.local.example`.

## Next Phase Readiness

- Next.js project bootable: `npm run dev` starts on port 3000
- Supabase client helpers importable: ready for Plan 02-02 (database) and 02-03 (auth)
- Authenticated layout scaffold in place: nav renders for all /dashboard, /chat, /itinerary routes once session exists
- No blockers for subsequent plans

---
*Phase: 02-stack-setup*
*Completed: 2026-03-09*

## Self-Check: PASSED

- FOUND: src/lib/supabase/client.ts
- FOUND: src/lib/supabase/server.ts
- FOUND: src/app/layout.tsx
- FOUND: src/app/(authenticated)/layout.tsx
- FOUND: .env.local.example
- FOUND: package.json
- FOUND: commit ed31343 (Task 1)
- FOUND: commit c661417 (Task 2)
