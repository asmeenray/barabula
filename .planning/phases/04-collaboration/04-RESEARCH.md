# Phase 4: Collaboration - Research

**Researched:** 2026-03-11
**Domain:** Supabase RLS, invite flows, optimistic-locking / conflict detection, role-gated UI in Next.js
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Invite mechanism**
- Owner invites by email address — requires a new `invites` table (separate from `collaborators`)
- Pending invites created even if the invited email has no account yet
- On registration, auto-match pending invites by email and convert them to active `collaborators` rows automatically
- No expiry — invites persist until owner revokes or user accepts
- Owner sets the role (viewer/editor) at invite time in the invite dialog

**Invite acceptance flow**
- Invited users see a pending invites section/banner on their Dashboard — no email notifications
- Accepting an invite converts the invite to a `collaborators` row; the itinerary appears in the user's Dashboard trip list (no auto-redirect)
- Accept-only — no decline action; invites persist until owner removes them or user accepts
- Shared trips on Dashboard are visually distinct: separate "Shared with me" section or a badge/label on the card showing "Shared by [Name]"

**Collaboration UI surface**
- Collaboration management lives in a modal/drawer triggered from the itinerary detail header
- Itinerary header shows a small collaborator count or avatar stack (initials); clicking opens the manage-collaborators modal
- The avatar/count is visible to all collaborators (not just the owner) — everyone can see who else is on the trip; only the owner can manage (invite/remove)
- Manage modal shows: active collaborators list (email + role badge + Remove button) and pending invites list (email + role + "Pending" label) as separate sections

**Role enforcement**
- Viewer role: edit controls (Add Activity, Edit, Delete) are hidden entirely — read-only UI, no 403 needed in practice (RLS enforces server-side as backup)
- Editor role: full access to add/edit/delete activities
- Owner always has full access regardless of collaborators table

**Conflict detection**
- All writes (itinerary edits AND activity add/edit/delete) check the itinerary's `updated_at` version
- Any successful mutation bumps `itinerary.updated_at` — one unified conflict check, no per-activity versioning
- On 409 Conflict: show a toast ("Someone else edited this trip. Reloading the latest version.") then re-fetch the itinerary
- Client sends current `updated_at` with each mutation; API compares to DB value before writing

### Claude's Discretion
- Exact modal/drawer component implementation and animation
- Avatar initials color assignment
- Toast component and positioning
- Exact RLS policy SQL for the new viewer/editor rules on activities
- Auto-match trigger implementation (Postgres trigger vs. post-registration API call)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COLLAB-01 | Owner can invite a user to an itinerary by email | New `invites` table + POST `/api/itineraries/[id]/invites` route |
| COLLAB-02 | Invited user receives in-app notification to accept the invitation | Dashboard pending-invites section + GET `/api/invites/pending` route |
| COLLAB-03 | Invited user can view the shared itinerary after accepting | Collaborators RLS SELECT policy + GET `/api/itineraries` broadened to include shared rows |
| COLLAB-04 | Collaborator role enforced: viewer read-only, editor add/edit activities | Role propagated from API to page; edit controls conditionally hidden via `canEdit` prop |
| COLLAB-05 | Itinerary updates include `updated_at` version check — stale writes return 409 | Optimistic-locking pattern in PATCH handlers using conditional `.eq('updated_at', ...)` |
| COLLAB-06 | Owner can see who has been invited and their roles | Manage-collaborators modal fetching GET `/api/itineraries/[id]/collaborators` |
| COLLAB-07 | Owner can remove a collaborator from an itinerary | DELETE `/api/itineraries/[id]/collaborators/[userId]` + revoke pending invite endpoint |
</phase_requirements>

---

## Summary

Phase 4 adds multi-user collaboration on top of the existing single-owner itinerary model. The three pillars are: (1) an invite flow backed by a new `invites` table and auto-conversion trigger on registration, (2) RLS policy expansion so collaborators can SELECT the itinerary and its activities with role-differentiated write access, and (3) an optimistic-locking conflict check on every mutation using the itinerary's `updated_at` timestamp.

All API work follows the established pattern: `createClient()` → `supabase.auth.getUser()` → Supabase query → `Response.json()`. No new third-party libraries are needed for any of the pillars — Supabase Postgres handles the trigger, RLS handles authorization, and the conflict check is a single conditional clause. The UI pillars (modal, avatar stack, toast, invite banner) are pure Tailwind components matching the project's no-component-library convention.

The main complexity lies in SQL: four new or replaced RLS policies, one new table, and one Postgres trigger (or a post-registration API call). Getting the RLS right is the highest-risk item because incorrect policies silently block data rather than throwing visible errors.

**Primary recommendation:** Write and test all RLS changes in the Supabase SQL editor against real rows before wiring them into the application code — SQL correctness is the gate that unlocks every other task.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS (`@supabase/supabase-js`) | already installed | DB queries, auth.getUser(), server client | Project-wide standard |
| Next.js App Router API Routes | 16.x (installed) | All server-side logic — invites, collaborators, conflict check | Established project pattern |
| SWR | already installed | Client-side data fetching with mutate() for revalidation | Used across dashboard + itinerary detail |
| Tailwind CSS | already installed | All UI components — modal, avatar stack, toast, invite banner | Project's only UI layer |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `crypto.randomUUID()` (Node built-in) | Node 18+ | Generate invite tokens if needed | Only if token-based invite links are added; not needed for current scope |
| Vitest + @testing-library/react | already installed | Unit tests for new components and API helpers | All new components get test files |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Postgres trigger for auto-match | Post-registration API call in `/auth/callback` | Trigger is atomic (no missed registrations), API call is easier to debug. Either works; research findings below cover both. |
| Supabase RLS for access control | Application-level middleware checks | RLS is the secure default — enforced at DB level even if app logic has a bug. Always use RLS as primary gate. |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── itineraries/[id]/
│   │   │   ├── route.ts              # existing — add conflict check to PATCH
│   │   │   ├── collaborators/
│   │   │   │   └── route.ts          # GET (list), POST (add by id), DELETE
│   │   │   └── invites/
│   │   │       └── route.ts          # POST (create invite)
│   │   ├── invites/
│   │   │   ├── pending/route.ts      # GET — invites for current user's email
│   │   │   └── [id]/
│   │   │       └── route.ts          # POST accept, DELETE revoke
│   │   └── activities/               # existing
│   │       ├── route.ts              # existing — add conflict check to POST
│   │       └── [id]/route.ts         # existing — add conflict check to PATCH/DELETE
│   └── (authenticated)/
│       ├── dashboard/page.tsx        # add pending-invites banner + "Shared with me"
│       └── itinerary/[id]/page.tsx   # add avatar stack, role context, manage modal
├── components/
│   ├── itinerary/
│   │   ├── ActivityRow.tsx           # add canEdit prop — hide edit/delete when false
│   │   ├── ActivityForm.tsx          # unchanged (called only when canEdit)
│   │   ├── DaySection.tsx            # add canEdit prop — hide "+ Add activity"
│   │   ├── CollaboratorModal.tsx     # new — manage collaborators + pending invites
│   │   └── AvatarStack.tsx           # new — renders initials circles, capped at 3
│   ├── dashboard/
│   │   └── PendingInviteBanner.tsx   # new — invite notification cards
│   └── ui/
│       └── Toast.tsx                 # new — non-blocking auto-dismiss notification
└── lib/
    └── types.ts                      # add Collaborator, Invite types
```

### Pattern 1: Conflict Detection (Optimistic Locking)

**What:** Before writing, confirm the row's `updated_at` still matches the client's cached value. If it doesn't, another write happened since the client last fetched — return 409.

**When to use:** Every mutating operation on `itineraries` and `activities`.

**Implementation approach:**

The PATCH handler compares the client-supplied `updated_at` to the current DB value before applying changes. Because Supabase's `.update().eq()` returns 0 rows (not an error) if no row matches the filter, the check must be done explicitly.

```typescript
// src/app/api/itineraries/[id]/route.ts — PATCH handler (updated)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { updated_at: clientTimestamp, ...fields } = body

  // Conflict check: fetch current updated_at and compare
  if (clientTimestamp) {
    const { data: current } = await supabase
      .from('itineraries')
      .select('updated_at')
      .eq('id', id)
      .single()
    if (current && current.updated_at !== clientTimestamp) {
      return Response.json({ error: 'Conflict' }, { status: 409 })
    }
  }

  const updates: Record<string, unknown> = {}
  if (fields.title !== undefined) updates.title = fields.title
  // ... other fields ...
  updates.updated_at = new Date().toISOString()  // bump version

  const { data, error } = await supabase
    .from('itineraries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
```

For activity mutations, the pattern is similar but must also bump `itineraries.updated_at`:

```typescript
// After successful activity write, bump the parent itinerary's updated_at
await supabase
  .from('itineraries')
  .update({ updated_at: new Date().toISOString() })
  .eq('id', itinerary_id)
```

The client side sends `updated_at` from the cached SWR data and handles 409 by calling `mutate()` and showing a toast.

### Pattern 2: Role-Aware Page

**What:** The itinerary detail page resolves the viewer's role after fetching the itinerary and propagates a `canEdit` boolean down to all interactive components.

**When to use:** Whenever a component contains edit controls.

```typescript
// In ItineraryDetailPage — after fetching data
const isOwner = data?.user_id === user?.id
const collaboratorRole = data?.collaborators?.find(c => c.user_id === user?.id)?.role
const canEdit = isOwner || collaboratorRole === 'editor'

// Pass to child components:
<DaySection canEdit={canEdit} ... />
<ActivityRow canEdit={canEdit} ... />
```

The API also returns collaborator rows for the current user when fetching an itinerary (via the expanded SELECT query). The page never needs a second round-trip to determine the role.

### Pattern 3: Invite → Collaborator Conversion

**What:** When a user registers, any pending invites matching their email are converted to `collaborators` rows.

**Auto-match options (Claude's discretion):**

**Option A — Postgres Trigger (recommended):**
```sql
-- Fires after INSERT on public.users (which itself fires after auth.users INSERT)
CREATE OR REPLACE FUNCTION public.handle_new_user_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.collaborators (itinerary_id, user_id, role)
  SELECT itinerary_id, NEW.id, role
  FROM public.invites
  WHERE invitee_email = NEW.email
    AND accepted_at IS NULL;

  UPDATE public.invites
  SET accepted_at = NOW(), accepted_by = NEW.id
  WHERE invitee_email = NEW.email
    AND accepted_at IS NULL;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_match_invites
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user_invites();
```

**Option B — Post-registration API call in `/auth/callback`:**
After Supabase OAuth/email confirmation redirects to `/auth/callback`, the handler calls `/api/invites/match` which runs the same conversion logic. More debuggable but can be skipped if the redirect fails.

The trigger is preferable because it's atomic and can't be bypassed by client bugs.

### Pattern 4: Supabase RLS for Collaborators

**What:** Policies that let collaborators access rows they don't own.

**New policies needed:**

```sql
-- 1. Collaborators can SELECT itineraries they have access to
CREATE POLICY "Collaborators can view shared itineraries"
  ON public.itineraries FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id  -- owner
    OR EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE itinerary_id = itineraries.id
        AND user_id = (SELECT auth.uid())
    )
  );

-- 2. Collaborator editors can INSERT activities
CREATE POLICY "Editors can insert activities"
  ON public.activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.itineraries i
      WHERE i.id = activities.itinerary_id
        AND (
          i.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.collaborators c
            WHERE c.itinerary_id = i.id
              AND c.user_id = (SELECT auth.uid())
              AND c.role = 'editor'
          )
        )
    )
  );

-- 3. Same pattern for UPDATE and DELETE on activities
-- (separate policies per operation for granularity)

-- 4. Collaborators can SELECT activities of shared itineraries
CREATE POLICY "Collaborators can view activities"
  ON public.activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries i
      WHERE i.id = activities.itinerary_id
        AND (
          i.user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.collaborators c
            WHERE c.itinerary_id = i.id
              AND c.user_id = (SELECT auth.uid())
          )
        )
    )
  );
```

The existing "Users can manage own activities" policy covers owners only. The new policies must NOT replace it — Supabase ORs all policies for the same operation. The simplest correct approach is to **replace** the owner-only policy with a broader policy that includes both owner and collaborator checks.

### Anti-Patterns to Avoid

- **Infinite RLS recursion:** Don't write an `itineraries` RLS policy that JOINs `collaborators`, then a `collaborators` RLS policy that JOINs `itineraries`. Use `(SELECT auth.uid())` inside subqueries (not `auth.uid()`) to prevent re-evaluation per row and break potential recursion. Supabase's own docs recommend this.
- **Relying solely on UI role hiding:** The `canEdit` prop hides buttons, but the API must also enforce role. RLS is the source of truth — if RLS is correct, an editor can write and a viewer's write is rejected at DB level.
- **Fetching collaborators in a separate round-trip:** Join collaborators in the existing itinerary detail GET rather than adding a second fetch. The `select('*, activities(*), collaborators(*)')` pattern works.
- **Forgetting to bump `updated_at` on activity mutations:** The conflict check uses `itineraries.updated_at` as the version for all writes, including activity add/edit/delete. Failing to bump it after an activity mutation means concurrent activity edits won't be detected.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Invite token generation and validation | Custom token table + expiry logic | Postgres trigger auto-match by email | Decided pattern — no token links, email-match only |
| Real-time conflict resolution (OT/CRDT) | Operational transforms or diff merging | Single `updated_at` compare + re-fetch on 409 | Out of scope; decided approach is to surface the conflict and re-fetch |
| Role middleware in Next.js | Custom route guard checking role | RLS as primary gate + `canEdit` prop for UI | RLS is enforced at DB level regardless of app logic |
| Email delivery for invites | SMTP integration, email templates | In-app pending-invite banner on Dashboard | Explicitly out of scope per CONTEXT.md |
| Toast library (react-hot-toast, sonner) | — | Hand-rolled Tailwind toast component | Project uses Tailwind only, no component library |

**Key insight:** The Supabase RLS + Postgres trigger combination handles authorization and invite conversion without any custom middleware or token infrastructure. The surface area of new code is smaller than it appears.

---

## Common Pitfalls

### Pitfall 1: RLS Policy Blocks Own-Data Access After Policy Replacement
**What goes wrong:** You drop "Users can manage own activities" and create a new combined policy. The new policy has a bug in the owner branch, so the owner can't write their own activities.
**Why it happens:** RLS policy logic is tested in isolation but the combined `OR EXISTS` subquery has a subtle error (e.g., wrong column reference).
**How to avoid:** Test each policy in Supabase SQL editor with `SET LOCAL role = authenticated; SET LOCAL "request.jwt.claims" = '{"sub":"<test-user-id>"}'` before deploying.
**Warning signs:** 403/empty results from queries that worked before the schema change.

### Pitfall 2: `updated_at` Precision Mismatch
**What goes wrong:** The client stores the timestamp as a string from the JSON response (`"2026-03-11T12:00:00.000Z"`). The DB stores it as `TIMESTAMPTZ`. After a round-trip the string representation may differ slightly (microseconds, timezone offset format), causing false 409s.
**Why it happens:** Postgres `TIMESTAMPTZ` serializes with microseconds; JavaScript `Date.toISOString()` only has milliseconds.
**How to avoid:** Compare using `new Date(a).getTime() === new Date(b).getTime()` server-side, or normalize both to ISO strings with the same format. Alternatively, use a monotonic integer version column instead of timestamp.
**Warning signs:** Every write returns 409 even when no concurrent edit happened.

### Pitfall 3: Supabase Infinite Recursion in RLS
**What goes wrong:** An `itineraries` RLS policy queries `collaborators`, and a `collaborators` RLS policy queries `itineraries` — circular dependency causes a Postgres infinite recursion error.
**Why it happens:** Both tables have RLS enabled and reference each other without a `SECURITY DEFINER` function to break the cycle.
**How to avoid:** Use `(SELECT auth.uid())` (correlated subquery form) rather than `auth.uid()` directly. This is Supabase's documented recommendation for performance AND to prevent recursive policy evaluation. Keep `collaborators` RLS simple — only restrict INSERT/UPDATE/DELETE, not SELECT, using ownership checks that don't reference `itineraries`.
**Warning signs:** `ERROR: infinite recursion detected in policy for relation "itineraries"` in Supabase logs.

### Pitfall 4: `invites` Table Not in RLS-Enabled State
**What goes wrong:** Forget to call `ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY` — all authenticated users can see all invites.
**Why it happens:** Easy to overlook when writing schema migrations.
**How to avoid:** Schema template always includes `ENABLE ROW LEVEL SECURITY` immediately after table creation.

### Pitfall 5: SWR Cache Serves Stale Role After Accept
**What goes wrong:** User accepts an invite; the SWR cache for `/api/itineraries` still shows the old list without the newly shared trip.
**Why it happens:** SWR caches keyed by URL. Accepting an invite changes server state but the cached response doesn't know.
**How to avoid:** After calling the accept endpoint, call `mutate('/api/itineraries')` to force a re-fetch of the dashboard list.

### Pitfall 6: Collaborators Can Accidentally Delete the Itinerary
**What goes wrong:** Editor-role collaborator calls DELETE `/api/itineraries/[id]`.
**Why it happens:** The API currently only checks `auth.getUser()`, not ownership. An editor might also be able to trigger the "Delete Trip" button if `canEdit` is not scoped correctly.
**How to avoid:** Delete itinerary must check `itineraries.user_id === auth.uid()` explicitly in the API route (owner-only), regardless of RLS. Hide the "Delete Trip" button unless `isOwner`.

---

## Code Examples

### New `invites` Table Schema

```sql
CREATE TABLE public.invites (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id   UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  invited_by     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invitee_email  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
  accepted_at    TIMESTAMPTZ,
  accepted_by    UUID REFERENCES public.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (itinerary_id, invitee_email)
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own invites
CREATE POLICY "Owners can manage invites"
  ON public.invites FOR ALL
  TO authenticated
  USING (invited_by = (SELECT auth.uid()));

-- Invitees can see their own pending invites
CREATE POLICY "Invitees can view their invites"
  ON public.invites FOR SELECT
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM public.users WHERE id = (SELECT auth.uid())
    )
  );
```

### Collaborators Table — Phase 4 RLS Additions

The `collaborators` table already exists with a minimal policy. Phase 4 replaces/augments:

```sql
-- Drop old minimal policy
DROP POLICY IF EXISTS "Users can view own collaborator rows" ON public.collaborators;

-- Owner can manage all collaborators on their itineraries
CREATE POLICY "Owners can manage collaborators"
  ON public.collaborators FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries
      WHERE id = collaborators.itinerary_id
        AND user_id = (SELECT auth.uid())
    )
  );

-- Collaborators can see others on the same itinerary
CREATE POLICY "Collaborators can view co-collaborators"
  ON public.collaborators FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())  -- own row
    OR EXISTS (
      SELECT 1 FROM public.collaborators other
      WHERE other.itinerary_id = collaborators.itinerary_id
        AND other.user_id = (SELECT auth.uid())
    )
  );
```

### POST `/api/itineraries/[id]/invites` (create invite)

```typescript
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify caller is the owner
  const { data: itin } = await supabase
    .from('itineraries')
    .select('user_id')
    .eq('id', id)
    .single()
  if (!itin || itin.user_id !== user.id)
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { email, role = 'viewer' } = await req.json()
  if (!email?.trim()) return Response.json({ error: 'email required' }, { status: 400 })
  if (!['viewer', 'editor'].includes(role))
    return Response.json({ error: 'Invalid role' }, { status: 400 })

  // If invitee already has an account, add directly to collaborators
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (existingUser) {
    const { error } = await supabase
      .from('collaborators')
      .insert({ itinerary_id: id, user_id: existingUser.id, role })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ status: 'added' }, { status: 201 })
  }

  // No account yet — create pending invite
  const { error } = await supabase
    .from('invites')
    .insert({ itinerary_id: id, invited_by: user.id, invitee_email: email.toLowerCase().trim(), role })
  if (error) return Response.json({ error: error.message }, { status: 409 })  // UNIQUE constraint = already invited
  return Response.json({ status: 'pending' }, { status: 201 })
}
```

### GET `/api/invites/pending` (dashboard invite banner)

```typescript
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user's email
  const { data: profile } = await supabase
    .from('users')
    .select('email')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('invites')
    .select('*, itineraries(title, destination), users!invited_by(email, full_name)')
    .eq('invitee_email', profile?.email ?? '')
    .is('accepted_at', null)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
```

### Conflict Check — Activity Mutations

All activity POST/PATCH/DELETE routes must accept and forward a `itinerary_updated_at` field, then bump the parent after write:

```typescript
// After successful activity INSERT/UPDATE/DELETE:
const { error: bumpError } = await supabase
  .from('itineraries')
  .update({ updated_at: new Date().toISOString() })
  .eq('id', itinerary_id)
  .eq('updated_at', itinerary_updated_at)  // conditional bump = also a conflict check

if (bumpError || /* rows affected = 0 */ ) {
  return Response.json({ error: 'Conflict' }, { status: 409 })
}
```

Note: Supabase JS client `.update()` does not directly expose "rows affected" — use `.select()` on the update and check if `data` is null/empty to detect 0-row updates.

### Toast Component (no library)

```typescript
// src/components/ui/Toast.tsx — simple auto-dismiss, Tailwind only
'use client'
import { useEffect } from 'react'

interface ToastProps {
  message: string
  onDismiss: () => void
  durationMs?: number
}

export function Toast({ message, onDismiss, durationMs = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(timer)
  }, [onDismiss, durationMs])

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg max-w-sm">
      {message}
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Token-based invite links (discussed) | Email-match pending invite table | Phase 4 context decision | No token infrastructure needed; simpler but requires account email to match invite email |
| Owner-only itinerary access | Owner + collaborator RLS | Phase 4 | Existing policies must be augmented or replaced; not additive |
| No conflict detection | `updated_at` version check → 409 | Phase 4 | PATCH handlers for itineraries AND activity routes all need updating |

**Deprecated/outdated:**
- Minimal `collaborators` RLS from Phase 2 (`"Users can view own collaborator rows"`): Must be replaced with Phase 4 policies.
- Owner-only `activities` policy (`"Users can manage own activities"`): Must be replaced with the broader owner+editor policy.
- Owner-only `itineraries` SELECT policy (`"Users can manage own itineraries"`): The FOR ALL policy covers SELECT — must be split into separate per-operation policies so SELECT can be broadened for collaborators while INSERT/UPDATE/DELETE remains owner-only.

---

## Open Questions

1. **`updated_at` comparison precision**
   - What we know: Postgres `TIMESTAMPTZ` stores microseconds; JSON serialization may truncate.
   - What's unclear: Whether Supabase JS always returns the same string format on round-trip.
   - Recommendation: In the API, compare using `new Date(a).getTime() === new Date(b).getTime()` not string equality. Test with a real round-trip before shipping.

2. **Trigger vs. post-registration API call for invite auto-match**
   - What we know: The trigger pattern (Option A above) is atomic. The `/auth/callback` API call is easier to test in isolation.
   - What's unclear: Whether the existing `on_auth_user_created` trigger (which inserts into `public.users`) fires before or complicates a chained trigger on `public.users`.
   - Recommendation: Use a trigger on `public.users` AFTER INSERT — it fires after `on_auth_user_created` completes, so `NEW.email` is available. Test the trigger in SQL editor with a manual INSERT before relying on it.

3. **Revoke invite vs. remove collaborator — same or separate UI?**
   - What we know: The manage modal shows pending invites and active collaborators in separate sections.
   - What's unclear: Whether "Remove" on a pending invite hits a different endpoint than "Remove" on an active collaborator.
   - Recommendation: Two separate endpoints — `DELETE /api/itineraries/[id]/invites/[inviteId]` and `DELETE /api/itineraries/[id]/collaborators/[userId]`. The UI passes the right one based on section.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + @testing-library/react |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COLLAB-01 | POST `/api/itineraries/[id]/invites` creates invite row | unit (API mock) | `npx vitest run src/__tests__/api/invites.test.ts -t "COLLAB-01"` | ❌ Wave 0 |
| COLLAB-02 | GET `/api/invites/pending` returns invites for current user | unit (API mock) | `npx vitest run src/__tests__/api/invites.test.ts -t "COLLAB-02"` | ❌ Wave 0 |
| COLLAB-03 | Shared itinerary appears in dashboard list after accept | unit (component) | `npx vitest run src/__tests__/dashboard-page.test.tsx -t "COLLAB-03"` | partial (file exists, needs new test) |
| COLLAB-04 | Viewer sees no edit controls; editor sees edit controls | unit (component) | `npx vitest run src/__tests__/itinerary-detail.test.tsx -t "COLLAB-04"` | partial (file exists, needs new test) |
| COLLAB-05 | PATCH with stale `updated_at` returns 409 | unit (API mock) | `npx vitest run src/__tests__/api/itineraries.test.ts -t "COLLAB-05"` | partial (file exists, needs new test) |
| COLLAB-06 | Manage modal renders collaborator list | unit (component) | `npx vitest run src/__tests__/collaborator-modal.test.tsx -t "COLLAB-06"` | ❌ Wave 0 |
| COLLAB-07 | DELETE collaborator removes row and re-fetches | unit (component) | `npx vitest run src/__tests__/collaborator-modal.test.tsx -t "COLLAB-07"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/api/invites.test.ts` — covers COLLAB-01, COLLAB-02
- [ ] `src/__tests__/collaborator-modal.test.tsx` — covers COLLAB-06, COLLAB-07
- [ ] New test cases in `src/__tests__/itinerary-detail.test.tsx` — covers COLLAB-04
- [ ] New test case in `src/__tests__/api/itineraries.test.ts` — covers COLLAB-05
- [ ] New test case in `src/__tests__/dashboard-page.test.tsx` — covers COLLAB-03

---

## Sources

### Primary (HIGH confidence)
- Supabase documentation — RLS policies, recursive policy prevention, `(SELECT auth.uid())` pattern
- Existing codebase: `supabase/schema.sql`, `src/app/api/itineraries/[id]/route.ts`, `src/app/api/activities/route.ts`, `src/components/itinerary/ActivityRow.tsx`, `src/lib/types.ts`
- `vitest.config.mts` + existing `__tests__/` directory — test infrastructure confirmed installed

### Secondary (MEDIUM confidence)
- Supabase RLS infinite recursion avoidance — documented pattern using `(SELECT auth.uid())` correlated subquery; cross-referenced with known Supabase behavior
- Postgres trigger chaining — `AFTER INSERT ON public.users` triggering after existing `on_auth_user_created` trigger is standard Postgres behavior; execution order within same event is deterministic

### Tertiary (LOW confidence)
- `updated_at` microsecond precision behavior in Supabase JS JSON serialization — not directly verified against live instance; treat as a pitfall to validate during implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all patterns from existing codebase
- Architecture: HIGH — follows established project patterns directly
- RLS SQL: MEDIUM — correct patterns documented from Supabase docs; exact SQL must be validated in SQL editor before deployment
- Pitfalls: HIGH — derived from codebase analysis and known Supabase RLS gotchas

**Research date:** 2026-03-11
**Valid until:** 2026-04-10 (Supabase JS API is stable; Next.js App Router patterns stable)
