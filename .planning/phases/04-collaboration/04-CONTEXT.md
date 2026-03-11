# Phase 4: Collaboration - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

An itinerary owner can invite group members by email; invited users can accept and view the shared trip from their Dashboard; all mutations are access-checked via Supabase RLS (viewer/editor roles); concurrent edits surface a 409 Conflict instead of silently overwriting. No real-time collaboration, no email notifications.

</domain>

<decisions>
## Implementation Decisions

### Invite mechanism
- Owner invites by email address — requires a new `invites` table (separate from `collaborators`)
- Pending invites created even if the invited email has no account yet
- On registration, auto-match pending invites by email and convert them to active `collaborators` rows automatically
- No expiry — invites persist until owner revokes or user accepts
- Owner sets the role (viewer/editor) at invite time in the invite dialog

### Invite acceptance flow
- Invited users see a pending invites section/banner on their Dashboard — no email notifications
- Accepting an invite converts the invite to a `collaborators` row; the itinerary appears in the user's Dashboard trip list (no auto-redirect)
- Accept-only — no decline action; invites persist until owner removes them or user accepts
- Shared trips on Dashboard are visually distinct: separate "Shared with me" section or a badge/label on the card showing "Shared by [Name]"

### Collaboration UI surface
- Collaboration management lives in a modal/drawer triggered from the itinerary detail header
- Itinerary header shows a small collaborator count or avatar stack (initials); clicking opens the manage-collaborators modal
- The avatar/count is visible to all collaborators (not just the owner) — everyone can see who else is on the trip; only the owner can manage (invite/remove)
- Manage modal shows: active collaborators list (email + role badge + Remove button) and pending invites list (email + role + "Pending" label) as separate sections

### Role enforcement
- Viewer role: edit controls (Add Activity, Edit, Delete) are hidden entirely — read-only UI, no 403 needed in practice (RLS enforces server-side as backup)
- Editor role: full access to add/edit/delete activities
- Owner always has full access regardless of collaborators table

### Conflict detection
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/supabase/server.ts`: Server client — all new API routes follow this pattern
- `src/lib/supabase/client.ts`: Browser client — available for client components
- `src/components/ui/ErrorMessage.tsx`: Reusable error display — use for conflict/invite errors
- `src/components/ui/Skeleton.tsx`: Loading skeleton — use during collaborator list fetch
- `src/components/itinerary/ActivityRow.tsx`, `ActivityForm.tsx`, `DaySection.tsx`: Phase 4 will conditionally hide edit controls on these based on user role
- `src/lib/types.ts`: `Itinerary` type already has `updated_at` — conflict detection can use this directly

### Established Patterns
- API route pattern: `createClient()` → `supabase.auth.getUser()` → query → return `Response.json()`
- All Supabase queries go through Next.js API Routes (`/api/*`) — no direct client calls
- Tailwind CSS only, no component library
- `src/app/(authenticated)/` route group — all new pages/components go here
- Loading/error state: consistent skeleton + ErrorMessage pattern from Phase 3

### Integration Points
- `src/app/(authenticated)/dashboard/page.tsx`: Needs to fetch and display pending invites + separate "Shared with me" section
- `src/app/(authenticated)/itinerary/[id]/page.tsx`: Itinerary header needs collaborator count/avatars + manage modal trigger
- `src/components/itinerary/ActivityRow.tsx` + `ActivityForm.tsx`: Need role-aware rendering (hide edit controls for viewers)
- `supabase/schema.sql`: Needs new `invites` table + updated RLS policies for `activities` (viewer can SELECT, editor can INSERT/UPDATE/DELETE via collaborators join) + updated `itineraries` RLS (collaborators can SELECT)
- `src/app/api/itineraries/[id]/route.ts`: PATCH handler needs `updated_at` conflict check

</code_context>

<specifics>
## Specific Ideas

- Pending invites section on Dashboard should feel like a notification card, not buried in the trip list
- Avatar stack in itinerary header: show initials (first letter of email) in colored circles, capped at 3 with "+N more"
- Conflict toast should be non-blocking (auto-dismiss after a few seconds) while re-fetch happens in background

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-collaboration*
*Context gathered: 2026-03-11*
