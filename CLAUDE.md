# Barabula

The places you saved, turned into a trip. Solo hobby project by Asmeen.
Next.js 16 (App Router) + Supabase (Postgres, PostGIS, RLS, Auth) + Vercel. Tests: Vitest + Playwright.

## Read first
- Read docs/HANDOVER.md before planning or changing anything.
  Most important: section 1 (decisions), 23 (working agreement), 24 (status), 25 (open questions).
- docs/PROJECT.md explains the why: positioning, market research, niche.
- Plan work with GSD in .planning/, one phase at a time.

## Rules
- Don't change decisions D1–D10 or build PROPOSED items (P1–P6) without asking Asmeen.
- No scraping. Only official oEmbed calls and files the user shares.
  Never download videos from Instagram, TikTok or Facebook. Never log in as the user.
- Never save a place without the user's confirmation. Ask never edits data without "Apply".
- Never store Mapbox geocoding results. Places come from FSQ OS Places.
- Uploaded screenshots/recordings are deleted after processing.
- Secrets live in .env.local and Vercel only. .env.example has names, never values.
- Ask before: new paid services, heavy dependencies, schema changes outside the handover,
  anything touching auth, RLS or deleting data.
- UI is calm and minimal (handover section 4): one primary action per screen,
  three tabs, no pop-ups, tours, upsell modals or rating prompts.

## Commands (checked against package.json, 5 Oct 2026)
- npm run dev | npm run lint (runs `eslint .` on the flat config in eslint.config.mjs; 4 known react-hooks errors, handover Q16)
- npm test runs Vitest in watch mode; use `npx vitest run` for a single pass
- npx playwright test (no Playwright config or tests exist yet)
- npm run eval:capture  (created in phase 15; run after any extraction or matching change)
- `next build` rewrites `next-env.d.ts`; restore it before committing (handover Q23)
- The auth proxy is src/proxy.ts (Next ignores a root proxy.ts when the app is in src/app)
- Migrations live in supabase/migrations/. The base schema is migration `20260310000000_baseline_schema.sql`
  (supabase/schema.sql is kept as a reference copy). New migrations need a later timestamp.
  Apply them with the Supabase CLI only after Asmeen's OK.

## Definition of done (every task)
- Tests pass; new logic has unit tests; capture changes re-run the eval.
- RLS enabled on every new table. No secrets or Mapbox data stored.
- Handover section 24 updated; new questions added to section 25.
- Small, clearly described commits on rebuild/saves-first.

## When unsure
Stop and ask Asmeen. Add the question to handover section 25.
