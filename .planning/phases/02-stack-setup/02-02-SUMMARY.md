---
phase: 02-stack-setup
plan: "02"
subsystem: database
tags: [supabase, postgresql, rls, row-level-security, sql, trigger]

# Dependency graph
requires:
  - phase: 02-stack-setup-01
    provides: Next.js project scaffolding with Supabase client packages installed
provides:
  - Supabase SQL schema source of truth (supabase/schema.sql) with 5 tables, RLS, and trigger
  - Per-user data isolation via RLS policies on all tables
  - Auto-provisioning of public.users on auth signup via SECURITY DEFINER trigger
affects:
  - 02-stack-setup-03 (auth forms depend on public.users table and trigger)
  - 02-stack-setup-04 (Vercel deployment needs env vars set from Supabase project)
  - 03-core-features (all DB queries rely on schema and RLS)
  - 04-collaboration (collaborators table RLS will be extended here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "(SELECT auth.uid()) pattern in RLS USING clauses — avoids per-row re-evaluation, better query plan"
    - "SECURITY DEFINER + SET search_path = '' on trigger functions — prevents privilege escalation and search path injection"
    - "auth.users FK pattern — Supabase Auth owns auth record, public.users holds app profile keyed to auth.users.id"

key-files:
  created:
    - supabase/schema.sql
  modified:
    - .gitignore

key-decisions:
  - "gitignore *.sql exception added for supabase/schema.sql — schema is source of truth and must be tracked"
  - "public.users.username is nullable — Google OAuth signups won't have username at registration time"
  - "collaborators RLS is minimal (per-user only) — full viewer/editor RLS deferred to Phase 4"

patterns-established:
  - "RLS pattern: (SELECT auth.uid()) = user_id for direct ownership tables"
  - "RLS pattern: EXISTS subquery for indirect ownership (activities via itineraries)"

requirements-completed: [STACK-02]

# Metrics
duration: 1min
completed: 2026-03-09
---

# Phase 2 Plan 02: Supabase Schema Summary

**PostgreSQL schema with 5 tables, per-user RLS policies, and SECURITY DEFINER trigger that auto-creates public.users on every Supabase Auth signup**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-09T20:19:11Z
- **Completed:** 2026-03-09T20:20:22Z
- **Tasks:** 1 auto-executed + 1 human-verify (auto-approved)
- **Files modified:** 2

## Accomplishments

- Complete SQL schema written to `supabase/schema.sql` — paste-and-run in Supabase SQL Editor
- RLS enabled on all 5 tables with per-user policies using `(SELECT auth.uid())` pattern
- `handle_new_user` trigger auto-provisions `public.users` on every `auth.users` INSERT

## Task Commits

1. **Task 1: Write supabase/schema.sql** - `ed36df7` (feat)

## Files Created/Modified

- `supabase/schema.sql` - Complete schema: 5 tables, RLS enabled, 6 policies, trigger function and trigger
- `.gitignore` - Added `!supabase/schema.sql` exception (was blocked by `*.sql` rule)

## Decisions Made

- **gitignore exception:** `*.sql` in `.gitignore` blocked committing the schema file. Added `!supabase/schema.sql` negation rule so the source-of-truth artifact is tracked.
- **Nullable username:** `public.users.username` is nullable — Google OAuth signups have no username at registration; can be collected in a later onboarding step.
- **Minimal collaborators RLS:** Collaborators table gets basic per-user SELECT policy only. Full viewer/editor RLS (letting collaborators read itineraries they're invited to) is Phase 4 work — avoids premature complexity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added gitignore exception for supabase/schema.sql**
- **Found during:** Task 1 (Write supabase/schema.sql)
- **Issue:** `.gitignore` had `*.sql` pattern that blocked `git add supabase/schema.sql`
- **Fix:** Added `!supabase/schema.sql` negation rule below the `*.sql` line with explanatory comment
- **Files modified:** `.gitignore`
- **Verification:** `git add supabase/schema.sql` succeeded after the fix
- **Committed in:** `ed36df7` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix — schema file must be tracked in git as source of truth. No scope creep.

## Issues Encountered

None beyond the gitignore deviation above.

## User Setup Required

**External services require manual configuration before auth or DB queries will work:**

**Step 1: Create a Supabase project**
- Go to https://supabase.com/dashboard → New project
- Choose a name (e.g., "barabula"), select a region, set a DB password

**Step 2: Run the schema SQL**
- Supabase Dashboard → SQL Editor → New query
- Paste full contents of `supabase/schema.sql` → click Run
- Expected: "Success. No rows returned"

**Step 3: Verify tables were created**
- Supabase Dashboard → Table Editor: should show users, itineraries, activities, chat_history, collaborators

**Step 4: Copy env vars to .env.local**
- Supabase Dashboard → Settings → API
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key (or use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` if key starts with `sb_publishable_`)
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key (never expose publicly)
- `OPENAI_API_KEY` = existing key

**Note on key type:** If Supabase issued a publishable key (starts with `sb_publishable_`), the env var name changes to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and the Supabase client files (`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`) need to reference that name — document this in the SUMMARY for Plan 03.

## Next Phase Readiness

- `supabase/schema.sql` is committed and ready to run
- User must apply schema and configure `.env.local` before Plan 03 (auth forms) will work
- Once schema is applied and env vars are set, Plan 03 can implement auth forms and test the trigger

---
*Phase: 02-stack-setup*
*Completed: 2026-03-09*
