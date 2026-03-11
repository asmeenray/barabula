---
phase: 08-ai-chat-functionality-with-openai-behavior-trip-state-itinerary-generation
plan: 06
subsystem: landing-page
tags: [unsplash, itineraries, cover-image, my-trips, landing]
dependency_graph:
  requires: [08-01, 08-02, 08-03, 08-04]
  provides: [MyTrips landing section, cover image storage on itinerary create]
  affects: [src/app/page.tsx, src/app/api/chat/message/route.ts]
tech_stack:
  added: []
  patterns: [server component data fetch, next/image, inline SVG placeholder]
key_files:
  created:
    - src/lib/unsplash.ts
    - src/components/landing/MyTrips.tsx
  modified:
    - supabase/schema.sql
    - src/app/api/chat/message/route.ts
    - src/app/page.tsx
decisions:
  - "Inline SVG used for map pin placeholder — lucide-react not installed in project"
  - "cover_image_url fetched and stored after itinerary insert, before activity insert"
  - "MyTrips only rendered when itineraries.length > 0 — unauthenticated and zero-trip users see no section"
metrics:
  duration: 2min
  completed_date: "2026-03-11"
  tasks_completed: 2
  files_changed: 5
---

# Phase 08 Plan 06: My Trips Landing Section with Unsplash Cover Images Summary

**One-liner:** Server-fetched landing section showing up to 3 recent trips as image cards, with Unsplash destination photos fetched and stored at itinerary creation time.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | cover_image_url schema + Unsplash utility + chat API update | 18bcbeb | supabase/schema.sql, src/lib/unsplash.ts, route.ts |
| 2 | MyTrips component + landing page integration | a3af6c7 | src/components/landing/MyTrips.tsx, src/app/page.tsx |

## What Was Built

**Unsplash utility (`src/lib/unsplash.ts`):** `fetchCityImage(city)` — no API key required, follows redirect from Unsplash source URL to get a stable image URL for storage.

**Schema update (`supabase/schema.sql`):** Added `cover_image_url TEXT` column to `itineraries` table. User runs this in Supabase Dashboard SQL Editor.

**Chat API update (`src/app/api/chat/message/route.ts`):** After inserting a new itinerary (itinerary_complete phase), fetches the city image and updates the row with `cover_image_url`. Uses `destination ?? title` as the search query.

**MyTrips component (`src/components/landing/MyTrips.tsx`):** Horizontal 3-column card grid. Each card has:
- `aspect-video` image with `next/image` (fill + object-cover)
- Inline SVG map pin placeholder when `cover_image_url` is null (sand background)
- Bold navy title (truncated), muted umber relative time (Just now / Xm ago / Xh ago / Xd ago / Mon DD)
- Hover lift (`-translate-y-1`) and shadow increase
- Full-card `<Link>` to `/itinerary/${id}`
- "View All →" coral link to `/dashboard` in the section header

**Landing page (`src/app/page.tsx`):** Fetches up to 3 most recent itineraries server-side (authenticated only). Renders `<MyTrips>` inside `bg-neutral-50` above `<HowItWorks>`, only when `itineraries.length > 0`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced lucide-react MapPin icon with inline SVG**
- **Found during:** Task 2
- **Issue:** `lucide-react` not installed in the project; import caused TypeScript error TS2307
- **Fix:** Replaced with an inline SVG map pin (`path` + `circle`) — no new dependency needed
- **Files modified:** src/components/landing/MyTrips.tsx
- **Commit:** a3af6c7

## Self-Check: PASSED

- src/lib/unsplash.ts — FOUND
- src/components/landing/MyTrips.tsx — FOUND
- Commit 18bcbeb — FOUND
- Commit a3af6c7 — FOUND
- TypeScript build: clean (0 errors)
