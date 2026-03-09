# Phase 2: Stack Setup - Research

**Researched:** 2026-03-09
**Domain:** Next.js 14 App Router + Supabase Auth + Vercel deployment
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Framework and tooling**
- Next.js 14+ with App Router (not Pages Router)
- TypeScript throughout
- Tailwind CSS for styling (replaces MUI — clean start on new stack)
- No Redux — state management approach decided in Phase 3

**Database**
- Supabase-hosted PostgreSQL
- Schema must match existing data model: users, itineraries, activities, chat_history, collaborators tables
- Row Level Security (RLS) enabled from the start — users can only access their own data
- Supabase JS client (`@supabase/supabase-js`) used for all DB queries (no Prisma, no raw SQL in app code)

**Auth**
- Supabase Auth handles all authentication — no custom JWT logic
- Email/password: standard Supabase Auth signup/login
- Google OAuth: configured via Supabase Auth OAuth providers (Google Cloud Console + Supabase dashboard)
- Session managed by Supabase Auth client — no manual token storage
- Next.js middleware (`middleware.ts`) reads Supabase session to protect routes — redirect to /login if unauthenticated

**Route protection**
- All routes under `/app/(authenticated)/` are protected via middleware
- `/login` and `/register` are public
- No flash of protected content — middleware runs server-side before page renders

**Deployment**
- Frontend + API routes: Vercel
- Database + Auth: Supabase (separate service, connected via environment variables)
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `vercel.json` not needed for basic Next.js — Vercel auto-detects

**Supabase client helper pattern (from specifics)**
- Use `@supabase/ssr` package for server-side Supabase client
- Google OAuth callback URL: `{VERCEL_URL}/auth/callback`
- `public.users` table uses `auth.users.id` as PK/FK, populated via Supabase trigger on `auth.users` insert

### Claude's Discretion
- Exact folder structure within `src/` (app router conventions apply)
- Supabase client helper pattern (server vs client component helpers)
- Login/register page visual design — functional first, polished in Phase 3
- Loading states and error handling on auth forms

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STACK-01 | Next.js 14+ project initialized with App Router and TypeScript (replaces CRA) | `create-next-app` with `--typescript --tailwind --app` flags; folder structure conventions documented |
| STACK-02 | Supabase project configured with database schema matching existing data model (users, itineraries, activities, chat_history, collaborators tables) | SQL schema and RLS patterns documented; trigger for public.users population documented |
| STACK-03 | Supabase Auth handles email/password registration and login (replaces FastAPI auth endpoints) | @supabase/ssr server/browser/middleware client patterns fully documented |
| STACK-04 | Google OAuth configured and working via Supabase Auth (sign in with Google on login page) | Google Cloud Console setup, Supabase dashboard config, auth/callback route handler documented |
| STACK-05 | Next.js middleware.ts enforces route protection — unauthenticated users redirected to /login with no flash of protected content | Full middleware.ts code with getUser() pattern documented; pitfalls of getSession() documented |
| STACK-06 | Vercel deployment live with all required environment variables | Env var strategy documented; ANON_KEY vs PUBLISHABLE_KEY transition explained |
| STACK-07 | Core authenticated layout with navigation renders on all protected pages | Route group `(authenticated)/layout.tsx` pattern documented |
</phase_requirements>

---

## Summary

Phase 2 builds the infrastructure layer: a Next.js 14 App Router project connected to Supabase for both database and auth, with middleware-enforced route protection and a Vercel deployment. The technical scope is well-defined by user decisions, so research focused on verifying the exact implementation patterns for the `@supabase/ssr` package (current as of 2025), the trigger-based `public.users` population, and the middleware-first route protection approach.

The `@supabase/ssr` package is the current standard for Next.js App Router (replacing the deprecated `@supabase/auth-helpers-nextjs`). It requires three separate client utilities: a browser client (for Client Components), a server client (for Server Components, Server Actions, Route Handlers), and a middleware client (for session refresh). The critical security constraint is to always use `supabase.auth.getUser()` — never `supabase.auth.getSession()` — in server code, because `getSession()` reads from cookies without revalidation and can be spoofed.

One important naming transition: Supabase is in the process of replacing the `anon key` with a new "publishable key" format. New Supabase projects created in 2025 may issue `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (value starts with `sb_publishable_...`) instead of `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Both work identically in code — check the Supabase dashboard for which key type the project issued.

**Primary recommendation:** Follow the official Supabase SSR guide for Next.js exactly — create three separate client utilities, use `getUser()` in middleware, use route groups for auth segmentation, and configure the `auth/callback` route handler for Google OAuth PKCE flow.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 14+ | Framework with App Router | User-locked; App Router is the current standard direction |
| typescript | 5.x | Type safety | User-locked; included in create-next-app by default |
| tailwindcss | 3.x | Utility-first styling | User-locked; included in create-next-app by default |
| @supabase/supabase-js | 2.x | DB queries + auth client | User-locked; all DB access goes through this |
| @supabase/ssr | latest | SSR-compatible Supabase clients | Required for Next.js App Router cookie-based auth |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| client-only | latest | Prevents server imports of browser client | Add to browser-only Supabase client file |
| server-only | latest | Prevents client imports of server client | Add to server-only Supabase client file |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | @supabase/auth-helpers-nextjs | auth-helpers-nextjs is deprecated — do not use |
| Supabase Auth | NextAuth.js / Auth.js | Would add custom JWT complexity that user explicitly ruled out |
| Tailwind CSS | MUI | MUI is being replaced per user decision |

**Installation:**
```bash
npx create-next-app@latest barabula-web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd barabula-web
npm install @supabase/supabase-js @supabase/ssr
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (authenticated)/           # Route group — all protected routes
│   │   ├── layout.tsx             # Authenticated shell with nav
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── chat/
│   │   │   └── page.tsx
│   │   └── itinerary/
│   │       └── page.tsx
│   ├── (public)/                  # Route group — public routes
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts           # OAuth PKCE callback handler
│   ├── layout.tsx                 # Root layout (html/body)
│   └── page.tsx                   # Root redirect (-> /dashboard or /login)
├── lib/
│   └── supabase/
│       ├── client.ts              # Browser client (Client Components)
│       └── server.ts              # Server client (Server Components, Actions, Route Handlers)
└── middleware.ts                  # Route protection + session refresh
```

**Key conventions:**
- Route group names in parentheses `(authenticated)` do not appear in URLs
- `(authenticated)/layout.tsx` is the authenticated shell with navigation (STACK-07)
- `middleware.ts` sits at the `src/` level (or repo root if not using `src/`)
- Supabase client utilities live in `src/lib/supabase/` — not collocated with components

### Pattern 1: Three-Client Supabase Helper Pattern

**What:** Three separate files exporting different Supabase client factories for different contexts.
**When to use:** Always. This is required by `@supabase/ssr` — each context has different cookie access.

**Browser client** (`src/lib/supabase/client.ts`):
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for new projects
  )
}
```

**Server client** (`src/lib/supabase/server.ts`):
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — middleware will persist the cookies
          }
        },
      },
    }
  )
}
```

### Pattern 2: Middleware Session Refresh + Route Guard

**What:** `middleware.ts` creates a Supabase client using request/response cookies, calls `getUser()` to refresh the session token, then redirects unauthenticated users away from protected routes.
**When to use:** Always — this is what enables "no flash of protected content."

```typescript
// Source: https://supabase.com/docs/guides/getting-started/ai-prompts/nextjs-supabase-auth
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Use getUser(), never getSession() in middleware
  const { data: { user } } = await supabase.auth.getUser()

  const isPublicPath =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register') ||
    request.nextUrl.pathname.startsWith('/auth')

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 3: Google OAuth Auth Callback Route Handler

**What:** A Next.js Route Handler at `/auth/callback` that exchanges the Google OAuth code for a Supabase session (PKCE flow).
**When to use:** Required for Google OAuth — must exist before enabling Google OAuth provider.

```typescript
// Source: https://supabase.com/docs/guides/auth/social-login/auth-google
// File: src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'

  if (!next.startsWith('/')) next = '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

### Pattern 4: Supabase Trigger — Populate public.users on Signup

**What:** A PostgreSQL trigger that auto-inserts a row in `public.users` whenever a user registers through Supabase Auth.
**When to use:** Always — `auth.users` is in the `auth` schema (not directly queryable from app code), so the app needs its own `public.users` record.

```sql
-- Source: https://supabase.com/docs/guides/auth/managing-user-data
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
```

**Critical:** `SECURITY DEFINER` is required so the function runs with the permissions of the function owner, not the calling role. `SET search_path = ''` prevents search path injection. If this trigger throws an exception, registration will fail — test thoroughly.

### Pattern 5: Row Level Security (RLS)

**What:** Postgres policies attached to each table that restrict rows to the authenticated user.
**When to use:** Enable on ALL tables from the start (per user decision).

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Itineraries: user owns rows where user_id matches
CREATE POLICY "Users can manage own itineraries"
  ON public.itineraries FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Activities: user owns via itinerary ownership
CREATE POLICY "Users can manage own activities"
  ON public.activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries
      WHERE id = activities.itinerary_id
        AND user_id = (SELECT auth.uid())
    )
  );

-- Chat history: user owns own messages
CREATE POLICY "Users can manage own chat history"
  ON public.chat_history FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
```

**Note:** Use `(SELECT auth.uid())` pattern (not `auth.uid()` directly) for better query plan performance — avoids re-evaluating the function per row.

### Anti-Patterns to Avoid

- **Using `getSession()` in middleware or server code:** Reads cookies without revalidation — can be spoofed. Always use `getUser()` instead.
- **Using `@supabase/auth-helpers-nextjs`:** This package is deprecated. Use `@supabase/ssr` only.
- **Using individual `get`/`set`/`remove` cookie methods from old patterns:** The `@supabase/ssr` API requires `getAll()` and `setAll()` — never individual cookie operations.
- **Importing the server client in Client Components:** Will fail at runtime — browser cannot use `next/headers`. Keep client.ts and server.ts strictly separated.
- **Forgetting the middleware matcher exclusion:** Without excluding `_next/static`, `_next/image`, and favicon from middleware, Supabase auth calls fire on every static asset request — performance disaster.
- **Trigger without SECURITY DEFINER:** The trigger function will lack permissions to insert into `public.users` as an unprivileged role.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth session persistence in SSR | Custom cookie management | @supabase/ssr cookie adapter | Token refresh race conditions, SameSite/Secure/HttpOnly complexity |
| JWT validation in middleware | Manual JWT decode + verify | `supabase.auth.getUser()` | Validates against Supabase Auth server — catches revoked tokens |
| OAuth state/PKCE verification | Custom code verifier storage | @supabase/ssr PKCE flow | PKCE is handled automatically when using the SSR package |
| Public/private route list in middleware | Custom route config object | Next.js route groups + middleware | Route groups give structural enforcement; middleware catches edge cases |
| Password hashing | bcrypt/argon2 in app code | Supabase Auth | Supabase handles hashing, salting, verification |
| "Profile created" logic on signup | API route that creates profile | Supabase trigger on auth.users | Trigger fires in the DB transaction — no race condition, no missed signups |

**Key insight:** Supabase Auth + @supabase/ssr handle a large surface area of auth complexity that is easy to get wrong: cookie scoping, token refresh timing, PKCE flow, session invalidation. The correct posture is to use the library as documented and avoid any custom session management.

---

## Common Pitfalls

### Pitfall 1: Using getSession() in Server Code
**What goes wrong:** User data appears to come from session but the session can be injected via spoofed cookies — silent security hole.
**Why it happens:** `getSession()` reads cookies without server-side revalidation. Many tutorials (pre-2024) still show `getSession()`.
**How to avoid:** Use `supabase.auth.getUser()` exclusively in middleware and server components. `getSession()` is only acceptable for quick client-side UI hints.
**Warning signs:** Any `getSession()` call in `middleware.ts` or Server Components.

### Pitfall 2: Middleware Infinite Redirect Loop
**What goes wrong:** Middleware redirects to `/login`, which triggers middleware again, which redirects to `/login` infinitely.
**Why it happens:** The `/login` and `/auth` paths are not excluded from the redirect check.
**How to avoid:** The `isPublicPath` guard in middleware must include `/login`, `/register`, and `/auth`. The matcher config excludes static assets. Test with an incognito browser immediately after implementation.
**Warning signs:** 302 redirect loop in browser network tab; "too many redirects" browser error.

### Pitfall 3: ANON_KEY vs PUBLISHABLE_KEY Mismatch
**What goes wrong:** App fails to connect to Supabase — "Invalid API key" errors.
**Why it happens:** New Supabase projects (2025) issue a publishable key (`sb_publishable_...`) instead of an anon key. The env var name differs from what tutorials show.
**How to avoid:** Open Supabase dashboard → Settings → API → check which key type the project issued. Use the key in env vars; the variable name in code can be either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — just must match what's in `.env.local` and Vercel settings.
**Warning signs:** Auth works locally but fails in Vercel deployment (env var name mismatch between environments).

### Pitfall 4: Supabase Trigger Fails Silently / Blocks Registration
**What goes wrong:** Either the trigger fails (registration succeeds in auth but no `public.users` row exists), or the trigger throws an exception and blocks the signup entirely.
**Why it happens:** Schema mismatches between what the trigger inserts and actual column definitions, or missing `NOT NULL` defaults.
**How to avoid:** Make `public.users` columns that the trigger populates either nullable or have DB-level defaults. Test with a fresh signup before testing feature pages. Check Supabase logs in Dashboard → Logs → Postgres.
**Warning signs:** User can log in but any query to `public.users` by `auth.uid()` returns empty.

### Pitfall 5: Middleware Fires on Static Assets
**What goes wrong:** Extremely slow page loads; Supabase `getUser()` called hundreds of times per page render.
**Why it happens:** Default Next.js middleware runs on every request including static files, unless matcher excludes them.
**How to avoid:** Always include the exclusion pattern in `config.matcher`:
```
'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
```
**Warning signs:** Network tab shows hundreds of requests each triggering middleware; unusually high Supabase auth API call counts.

### Pitfall 6: OAuth Callback URL Not Registered
**What goes wrong:** Google OAuth completes on Google's side but returns `redirect_uri_mismatch` error.
**Why it happens:** Google Cloud Console requires exact redirect URI registration. Both local and production URLs must be added.
**How to avoid:** Add both `http://localhost:3000/auth/callback` and `https://your-app.vercel.app/auth/callback` to Google Cloud Console → Authorized redirect URIs. Also add these to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
**Warning signs:** "redirect_uri_mismatch" error from Google after clicking "Sign in with Google."

---

## Code Examples

### Email/Password Sign-Up (Server Action)
```typescript
// src/app/(public)/register/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('full_name') as string,
      },
    },
  })
  if (error) return { error: error.message }
  redirect('/dashboard')
}
```

### Email/Password Login (Server Action)
```typescript
// src/app/(public)/login/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  redirect('/dashboard')
}
```

### Google OAuth Sign-In (Server Action)
```typescript
// src/app/(public)/login/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function signInWithGoogle() {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })
  if (error) return { error: error.message }
  if (data.url) redirect(data.url)
}
```

### Accessing User in a Server Component
```typescript
// src/app/(authenticated)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login') // Belt-and-suspenders if middleware is bypassed

  return <div>Welcome {user.email}</div>
}
```

### Database Schema SQL (matches existing data model)
```sql
-- Run in Supabase SQL Editor

-- public.users (mirrors auth.users, id is FK to auth.users)
CREATE TABLE public.users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT UNIQUE,
  email        TEXT NOT NULL,
  full_name    TEXT,
  avatar_url   TEXT,
  preferences  JSONB DEFAULT '{}',
  language     TEXT DEFAULT 'en',
  timezone     TEXT DEFAULT 'UTC',
  is_active    BOOLEAN DEFAULT true,
  is_verified  BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.itineraries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  destination TEXT,
  start_date  DATE,
  end_date    DATE,
  extra_data  JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id  UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  day_number    INTEGER NOT NULL,
  name          TEXT NOT NULL,
  time          TEXT,
  description   TEXT,
  location      TEXT,
  activity_type TEXT,
  extra_data    JSONB DEFAULT '{}'
);

CREATE TABLE public.chat_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaborators table (basic structure; per-user RLS only for now — full Phase 4)
CREATE TABLE public.collaborators (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (itinerary_id, user_id)
);
```

### Vercel Environment Variable Checklist
```
# .env.local (local development)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only, never NEXT_PUBLIC_
OPENAI_API_KEY=sk-...                              # server-only, never NEXT_PUBLIC_
```

All four must be added in Vercel → Project Settings → Environment Variables for Production (and Preview).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023-2024 | auth-helpers is deprecated; SSR package is the only supported option for App Router |
| `supabase.auth.getSession()` in server | `supabase.auth.getUser()` in server | 2024 (security advisory) | getSession() cannot revalidate against Supabase server; getUser() sends network request to verify |
| `get`/`set`/`remove` cookie callbacks in @supabase/ssr | `getAll`/`setAll` callbacks | @supabase/ssr v0.3+ | Individual cookie methods are no longer supported; breaking change if using older patterns |
| Anon key (`eyJ...`) | Publishable key (`sb_publishable_...`) | 2025 | New Supabase projects issue publishable keys; both work in library code, only env var name differs |
| Pages Router API routes for auth | App Router Server Actions / Route Handlers | Next.js 13+ | Server Actions allow form-to-action patterns without manual fetch; no intermediate API route needed for auth |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: fully deprecated, no new features — do not use.
- `supabase.auth.getSession()` in server code: insecure — replaced by `getUser()`.
- Individual cookie `get`/`set`/`remove` in `@supabase/ssr` config: replaced by `getAll`/`setAll` pair.

---

## Open Questions

1. **ANON_KEY vs PUBLISHABLE_KEY for this specific project**
   - What we know: New Supabase projects (2025) issue publishable keys; existing projects keep anon key
   - What's unclear: This project's Supabase project hasn't been created yet — we don't know which key type it will issue
   - Recommendation: When creating the Supabase project, check the API settings immediately and use whichever key format is shown; the code works with either

2. **Location of Next.js project within repo**
   - What we know: CONTEXT.md says "new Next.js project goes in the repo root or a `src/` directory"; existing `frontend/`, `backend/`, `mcp-server/` remain
   - What's unclear: Whether to initialize in repo root (replacing frontend/) or a subdirectory like `web/`
   - Recommendation: Initialize at repo root — this is standard for the primary application and Vercel expects a root-level `next.config.js`. The old `frontend/` directory will coexist until Phase 6 cleanup.

3. **Username field during Google OAuth signup**
   - What we know: `public.users` has a `username` column (from existing SQLAlchemy model); Google OAuth signup won't supply a username
   - What's unclear: Should `username` be nullable for Phase 2, collected later, or auto-generated?
   - Recommendation: Make `username` nullable in the schema for now (it was already unique but not required in the original model per CONTEXT.md). Phase 3 can add a username-collection step.

---

## Sources

### Primary (HIGH confidence)
- https://supabase.com/docs/guides/auth/server-side/nextjs — SSR setup guide, middleware pattern
- https://supabase.com/docs/guides/auth/managing-user-data — trigger SQL for public.users population
- https://supabase.com/docs/guides/auth/social-login/auth-google — Google OAuth setup + callback handler
- https://supabase.com/docs/guides/getting-started/ai-prompts/nextjs-supabase-auth — complete middleware.ts code
- https://supabase.com/docs/guides/database/postgres/row-level-security — RLS policy patterns
- https://nextjs.org/docs/app/api-reference/file-conventions/route-groups — route groups for auth segmentation

### Secondary (MEDIUM confidence)
- https://github.com/orgs/supabase/discussions/29260 — ANON_KEY vs PUBLISHABLE_KEY transition discussion
- https://github.com/supabase/auth-js/issues/898 — getUser() vs getSession() security advisory
- WebSearch cross-verified: three-client pattern, PKCE flow for OAuth, matcher exclusions

### Tertiary (LOW confidence)
- None — all critical claims verified against official Supabase and Next.js documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages verified against official Supabase and Next.js docs
- Architecture: HIGH — folder structure and client patterns from official sources
- Pitfalls: HIGH for security pitfalls (getSession/getUser, trigger SECURITY DEFINER); MEDIUM for OAuth callback URL pitfall (from multiple community sources)
- Database schema: HIGH — directly derived from existing SQLAlchemy models documented in CONTEXT.md

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (30 days — Supabase SSR API is stable; check for PUBLISHABLE_KEY transition progress)
