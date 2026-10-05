# Barabula

The places you saved, turned into a trip.

A solo hobby project, currently being rebuilt around your saved places (saves-first).

**Stack:** Next.js 16 (App Router), Supabase, Vercel. Tests run with Vitest.

## How to run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in the values from your own Supabase and OpenAI dashboards:
   ```bash
   cp .env.example .env.local
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Run the unit tests once, and the linter:
   ```bash
   npx vitest run
   npm run lint
   ```

Database migrations live in `supabase/migrations/` and are applied with the Supabase CLI.

## Where docs live

- `docs/HANDOVER.md`: decisions, status and roadmap. Read this first.
- `docs/PROJECT.md`: the why behind the product.
- `CLAUDE.md`: working rules for this repo.

## License

See `LICENSE`.
