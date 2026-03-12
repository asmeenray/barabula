# Phase 11: Visual Enrichment & Trip Sharing - Research

**Researched:** 2026-03-12
**Domain:** Photo enrichment (Unsplash API), Google Places ratings, shareable itinerary links (Supabase RLS + Next.js middleware), performance optimization (backdrop-filter, cold-start compile, glassmorphism alternatives)
**Confidence:** HIGH (core API patterns verified against official docs; performance root causes verified against official Next.js docs + codebase audit)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Photos on Activity Cards**
- Source: Unsplash Source URL — `https://source.unsplash.com/800x500/?{query}` (no API key required; same pattern as `fetchCityImage()` in `src/lib/unsplash.ts`)
- Query: Activity name + destination — e.g., `"Eiffel Tower Paris"`. Follows redirect to get stable URL for storage.
- Fallback: If Unsplash returns nothing for the activity query, fall back to destination-only query (e.g., `"Paris"`).
- Placement: Top of each activity card, full-width, ~160–200px tall. Same pattern as Twitter/Airbnb activity cards.
- Storage: `photo_url` stored in activity `extra_data` JSONB column (consistent with existing hotel metadata pattern from Phase 9). NOT a new column.
- Fetch timing: At AI generation time — when activities are inserted in the chat message route (`src/app/api/chat/message/route.ts`). Same flow as `cover_image_url` fetched before activity insert.
- Scope: Activity cards on the itinerary page AND destination cards on the landing page (`src/components/landing/DestinationCards.tsx` or equivalent). Both enriched in this phase.

**Shareable Trip Links**
- Privacy model: Off by default. Owner enables sharing via a coral "Share" button in the itinerary page header. Simple `is_public` boolean column on `itineraries` table — DB migration required.
- URL pattern: `/itinerary/[id]?share=true` — the existing itinerary route, not a new route. The page component detects the `share=true` param, skips auth check for read operations, and renders in read-only mode.
- Revocation: Owner can toggle sharing off — sets `is_public = false`, immediately returns 403/404 for anyone with the old link.
- What guests see: Full itinerary — all days, activity cards (with photos + ratings), hotels, flights, map — read-only. No editing controls shown.
- Acquisition CTA: Sticky banner at the bottom for unauthenticated viewers: "Love this trip? Plan yours with Barabula" + Sign Up button (coral). Non-intrusive soft CTA, not a paywall.
- Share button UX: Clicking Share copies the URL to clipboard + shows a toast: "Link copied — anyone with this link can view your trip." If already shared, clicking again offers to disable sharing.

**Google Places Ratings**
- Data shown: Star rating (e.g., ★ 4.6) + review count (e.g., 2,847 reviews). Displayed on activity cards below the photo.
- API: Google Places Text Search API — query by activity name + destination (e.g., "Eiffel Tower, Paris"). Uses the $200/month free credit (covers ~5,800 requests/month — sufficient for early-stage usage).
- Fetch timing: At AI generation time, alongside the photo fetch. Stored in activity `extra_data` JSONB.
- Storage keys in extra_data: `places_rating` (number), `places_review_count` (number), `places_price_level` (0–4 integer). Price level shown on cards as $ / $$ / $$$ / $$$$.
- Fallback: If Places Text Search returns no match, gracefully omit — card shows photo but no rating. No placeholder stars, no fake data.
- No opening hours in Phase 11: Ratings + price level only. Hours require a separate Places Details API call (additional cost). Defer hours to a future phase.

### Claude's Discretion
- Loading skeleton design for activity card photos
- Exact card photo aspect ratio and object-fit behavior
- Error handling for failed Unsplash or Places API calls (null-safe, fail silently)
- Whether to run photo + Places fetches in parallel or sequentially during itinerary generation

### Deferred Ideas (OUT OF SCOPE)
- PWA (manifest + service worker) — not in Phase 11; 2-week effort but standalone. Phase 12 candidate.
- Opening hours — Google Places Details API call (additional cost per request). Defer until usage justifies cost.
- Booking affiliate links — Booking.com/Viator links on activity cards. Low-effort, revenue-positive. Phase 12+ candidate.
- Budget rollup display — aggregate cost estimate across activities. Requires price data enrichment. Future phase.
- Weather snippets — weather forecast per day. Future phase.
- Real-time collaboration — Phase 4 in original roadmap (still pending).
- Trip persistence dashboard improvements — "My Trips" sidebar. Currently the Dashboard page exists; improvements deferred.
- Vibe-first conversation opener — "How do you want to feel?" before logistics questions. Future AI phase.
- Native iOS app — Tier 3 strategic bet per research.
</user_constraints>

---

## Summary

Phase 11 has four interlinked areas of work: (1) activity card photo enrichment via Unsplash API, (2) Google Places ratings stored at generation time, (3) shareable read-only trip links with middleware bypass and RLS, and (4) a performance overhaul targeting the 12.9s server render time and glassmorphism paint cost.

The most urgent finding that directly impacts planning is that **`source.unsplash.com` (the no-key URL pattern) is officially deprecated and shut down.** The existing `fetchCityImage()` in `src/lib/unsplash.ts` relies on it and may be silently failing in production. This phase must migrate to the official Unsplash API (`GET /photos/random?query=...`) which requires an API key but is free at 50 req/hour demo or 5,000 req/hour production. The next.config.ts already allows `images.unsplash.com` as a remote image host, which confirms the project anticipated the real API.

The 12.9s server render is not server-side work — the itinerary page (`src/app/(authenticated)/itinerary/[id]/page.tsx`) is a `'use client'` component. The 12.9s is the Next.js development-mode cold compile of that page's dependency tree (motion/react, SWR, all itinerary components including DaySection, ActivityCard, HotelCard). In production this compile cost disappears; however the page does have a genuine client-side waterfall: no data is shown until SWR fetches `/api/itineraries/${id}`. The fix is to add Suspense streaming so a skeleton renders immediately. The glassmorphism `backdropFilter: 'blur(12px)'` used on every ActivityCardItem forces GPU composition layers on each card — for a 7-day itinerary with ~20 activities this can cause significant paint cost on mobile.

**Primary recommendation:** Migrate Unsplash to the official API, fetch photo + Places data in parallel at generation time, build the sharing flow against the Supabase anon role with RLS, and replace per-card backdrop-filter blur with a solid semi-transparent background to eliminate the GPU composition overhead on the itinerary page.

---

## Critical Pre-Research Finding: source.unsplash.com is Dead

**Confidence: HIGH — verified via multiple sources**

`source.unsplash.com` was officially shut down. It was deprecated in 2021 and fully turned off. The existing `fetchCityImage()` implementation in `src/lib/unsplash.ts` uses this URL pattern:

```typescript
const sourceUrl = `https://source.unsplash.com/1200x800/?${query}`
```

This is calling a dead endpoint. It may return errors silently (the function already has `try/catch` returning `null`). This explains why some itineraries may have no cover images.

**Phase 11 must fix this in the same plan that adds activity photo fetching.** The official replacement is:
- Register an app at https://unsplash.com/developers (free)
- Add `UNSPLASH_ACCESS_KEY` to environment variables
- Use `GET https://api.unsplash.com/photos/random?query={query}&orientation=landscape` with `Authorization: Client-ID {key}` header
- The response includes `urls.regular` (1080px wide, suitable for storage) and `urls.small` (400px)
- The `next.config.ts` already has `images.unsplash.com` in `remotePatterns` — no config change needed

Rate limits: 50 requests/hour (demo), 5,000/hour (production after approval). For a travel app with ~10 activities per itinerary, production approval is required once the app goes live. The approval process is quick for legitimate apps.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Unsplash API | v1 (REST) | Activity + city photos | Official replacement for deprecated source.unsplash.com; returns stable CDN URLs on images.unsplash.com |
| Google Places Text Search (New) | v1 | Activity ratings + price level | Official, server-side, field-masked — only pays for what is requested |
| Supabase (existing) | ^2 | RLS policy update for public reads | Anon role allows SELECT on is_public=true rows |
| next/image (existing) | bundled | Rendering photos on activity cards | Automatic optimization, lazy loading, blur placeholder support |
| Clipboard API (browser) | web standard | Copy share URL to clipboard | No library needed; navigator.clipboard.writeText() |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hot-toast or custom toast | existing pattern | "Link copied" toast feedback | Use a lightweight inline toast, not a library import |
| SWR (existing) | existing | Client-side data for itinerary | Already used; no change |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Unsplash API | Pexels API | Pexels is free + unlimited requests but has no random-by-query endpoint, only search (returns a list, must pick first); Unsplash has a dedicated `/photos/random?query=` endpoint that returns exactly one photo — cleaner for this use case |
| Google Places Text Search | Foursquare/Yelp | Google has the most coverage globally; $200/month free credit covers early stage; competitors require paid plans sooner |
| Custom toast | react-hot-toast | react-hot-toast is 5KB and battle-tested; a custom div toast is ~10 lines and zero dependency — prefer the custom approach for a single share action |

**Installation:**
```bash
# No new npm packages needed for core functionality
# Unsplash and Google Places are called via native fetch()
# Only if adding toast library:
npm install react-hot-toast
```

---

## Architecture Patterns

### Performance Root Cause Analysis

**The 12.9s "server render" is actually dev-mode cold compile time for a large client component tree.**

The itinerary page (`src/app/(authenticated)/itinerary/[id]/page.tsx`) is `'use client'` from line 1. In Next.js dev mode, first-time compilation of a route traverses the full dependency graph: motion/react, SWR, DaySection (which imports AnimatePresence), ActivityCard, HotelCard, FlightCard, EatDrinkTab, ItineraryHero — each with their own subgraphs.

In **production**, this compile cost is eliminated at build time. However the page still has a genuine client-side data waterfall:
1. Page renders loading skeleton (via `isLoading` check in SWR)
2. SWR calls `/api/itineraries/${id}` — the server route validates auth (Supabase `getUser()`), then queries Supabase for itinerary + activities
3. Once data arrives, React renders all day sections

This means users see a blank loading state until the Supabase round-trip completes. The fix is faster data delivery to the client — either (a) a server component wrapper that passes pre-fetched data as SWR fallback, or (b) improved skeleton UI that renders immediately. Option (a) is the architecturally correct fix.

**Glassmorphism performance:**
The `backdropFilter: 'blur(12px)'` inline style in `DaySection.tsx` is applied to every `ActivityCardItem`. On a 7-day itinerary with 3-4 activities per day, that is ~25 elements each creating a GPU composition layer. This significantly increases paint time on mobile and mid-range devices. The blur effect composites each card against everything rendered behind it — on the itinerary page with a gradient background this is relatively cheap but on mobile it can cause frame drops during scroll.

The fix is to replace the backdrop-filter blur with a solid or near-solid white background. Given the itinerary page background is `#f0ebe4` (warm beige), using `rgba(255,255,255,0.95)` for active and `rgba(255,255,255,0.88)` for inactive (no blur) maintains the visual hierarchy without GPU cost. This aligns with the user's request to look "more modern and beautiful" — solid clean cards with strong typography are the 2025 aesthetic over frosted glass.

### Recommended Project Structure for Phase 11

No new directories. Changes are file-level additions and modifications to existing files:

```
src/
├── lib/
│   ├── unsplash.ts          # REWRITE: migrate to official API, add fetchActivityImage()
│   └── places.ts            # NEW: fetchPlacesData(activityName, destination)
├── app/
│   ├── api/
│   │   ├── chat/message/route.ts   # MODIFY: parallel photo+places fetch per activity
│   │   └── itineraries/[id]/route.ts  # MODIFY: add is_public to PATCH, allow anon GET
│   └── (authenticated)/
│       └── itinerary/[id]/page.tsx  # MODIFY: share param, read-only mode, share button
├── components/
│   ├── itinerary/
│   │   ├── DaySection.tsx          # MODIFY: remove backdrop-filter blur
│   │   ├── ActivityCard.tsx        # MODIFY: add photo, rating display
│   │   └── ItineraryHero.tsx       # MODIFY: add Share button
│   └── landing/
│       └── DestinationCards.tsx    # MODIFY: use next/image, upgrade to brand palette
├── middleware.ts                   # MODIFY: allow /itinerary/[id] with ?share=true
supabase/
└── migrations/
    └── YYYYMMDDHHMMSS_phase11.sql  # is_public column + RLS policy update
```

### Pattern 1: Official Unsplash API — fetchActivityImage()

**What:** Server-side function that fetches one representative photo for an activity
**When to use:** At activity creation time in the chat message route, before bulk insert

```typescript
// src/lib/unsplash.ts
// Source: https://unsplash.com/documentation — GET /photos/random
export async function fetchActivityImage(
  activityName: string,
  destination: string
): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return null
  try {
    // Primary query: activity + destination
    const query = encodeURIComponent(`${activityName} ${destination}`)
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    )
    if (res.ok) {
      const data = await res.json()
      return data.urls?.regular ?? null
    }
    // Fallback: destination only
    const fallbackQuery = encodeURIComponent(destination)
    const fallback = await fetch(
      `https://api.unsplash.com/photos/random?query=${fallbackQuery}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    )
    if (!fallback.ok) return null
    const fallbackData = await fallback.json()
    return fallbackData.urls?.regular ?? null
  } catch {
    return null
  }
}
```

Note: The existing `fetchCityImage()` must also be updated to use this same pattern.

### Pattern 2: Google Places Text Search (New) — fetchPlacesData()

**What:** Server-side function that fetches rating, user rating count, and price level for a named place
**When to use:** At activity creation time in the chat message route, run in parallel with photo fetch

```typescript
// src/lib/places.ts
// Source: https://developers.google.com/maps/documentation/places/web-service/text-search
export async function fetchPlacesData(
  activityName: string,
  destination: string
): Promise<{ rating: number | null; reviewCount: number | null; priceLevel: number | null }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return { rating: null, reviewCount: null, priceLevel: null }
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // Field mask controls billing tier: rating + userRatingCount + priceLevel = Enterprise SKU
        'X-Goog-FieldMask': 'places.rating,places.userRatingCount,places.priceLevel',
      },
      body: JSON.stringify({
        textQuery: `${activityName}, ${destination}`,
        maxResultCount: 1,
      }),
    })
    if (!res.ok) return { rating: null, reviewCount: null, priceLevel: null }
    const data = await res.json()
    const place = data.places?.[0]
    if (!place) return { rating: null, reviewCount: null, priceLevel: null }
    // priceLevel: "PRICE_LEVEL_FREE"=0, "PRICE_LEVEL_INEXPENSIVE"=1, "PRICE_LEVEL_MODERATE"=2,
    //             "PRICE_LEVEL_EXPENSIVE"=3, "PRICE_LEVEL_VERY_EXPENSIVE"=4
    const priceLevelMap: Record<string, number> = {
      PRICE_LEVEL_FREE: 0,
      PRICE_LEVEL_INEXPENSIVE: 1,
      PRICE_LEVEL_MODERATE: 2,
      PRICE_LEVEL_EXPENSIVE: 3,
      PRICE_LEVEL_VERY_EXPENSIVE: 4,
    }
    return {
      rating: place.rating ?? null,
      reviewCount: place.userRatingCount ?? null,
      priceLevel: place.priceLevel ? (priceLevelMap[place.priceLevel] ?? null) : null,
    }
  } catch {
    return { rating: null, reviewCount: null, priceLevel: null }
  }
}
```

### Pattern 3: Parallel Photo + Places Fetch at Generation Time

**What:** Extend the activity insertion loop in `route.ts` to fetch both photo and Places data per activity concurrently
**When to use:** In `src/app/api/chat/message/route.ts`, inside the activity persistence block

```typescript
// Fetch photo + places in parallel for each activity
const activities = await Promise.all(
  days.flatMap(day =>
    day.activities.map(async (act) => {
      // Run photo and places fetch in parallel — both fail gracefully with null
      const [photoUrl, placesData] = await Promise.all([
        (act.activity_type !== 'hotel')
          ? fetchActivityImage(act.name, itineraryFields.destination ?? '')
          : Promise.resolve(null),
        (act.activity_type !== 'hotel')
          ? fetchPlacesData(act.name, itineraryFields.destination ?? '')
          : Promise.resolve({ rating: null, reviewCount: null, priceLevel: null }),
      ])
      const baseExtraData = (act.activity_type === 'hotel')
        ? { hotel_name: act.hotel_name, star_rating: act.star_rating, check_in: act.check_in, check_out: act.check_out }
        : {}
      return {
        itinerary_id: newItinerary.id,
        day_number: day.day_number,
        name: act.name,
        time: act.time,
        description: act.description,
        location: act.location,
        activity_type: act.activity_type ?? null,
        duration: act.duration ?? null,
        tips: act.tips ?? null,
        extra_data: {
          ...baseExtraData,
          ...(photoUrl ? { photo_url: photoUrl } : {}),
          ...(placesData.rating !== null ? { places_rating: placesData.rating } : {}),
          ...(placesData.reviewCount !== null ? { places_review_count: placesData.reviewCount } : {}),
          ...(placesData.priceLevel !== null ? { places_price_level: placesData.priceLevel } : {}),
        },
      }
    })
  )
)
```

**Important:** For a 7-day itinerary with ~20 activities, this is ~40 parallel fetch calls (20 photo + 20 places). At ~200ms each, this adds ~200-400ms to generation time (parallel execution). This is acceptable — generation already calls OpenAI which takes several seconds.

### Pattern 4: Supabase RLS for Public Itinerary Reads

**What:** DB migration that adds `is_public` column and a policy allowing the `anon` role to SELECT public itineraries
**When to use:** Must be applied before the share feature can work

```sql
-- Migration: add is_public and update RLS
ALTER TABLE public.itineraries ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

-- Allow anon (unauthenticated) to read public itineraries and their activities
CREATE POLICY "Public itineraries are viewable by anyone"
  ON public.itineraries FOR SELECT
  TO anon
  USING (is_public = true);

-- Allow anon to read activities of public itineraries
CREATE POLICY "Activities of public itineraries are viewable by anyone"
  ON public.activities FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries
      WHERE itineraries.id = activities.itinerary_id
        AND itineraries.is_public = true
    )
  );
```

### Pattern 5: Middleware Bypass for Public Share Links

**What:** The current middleware blocks all unauthenticated access except `/`, `/login`, `/register`, `/auth`. The share link `/itinerary/[id]?share=true` must be accessible to unauthenticated users.
**When to use:** The middleware must be updated to allow the share URL pattern to pass through

```typescript
// middleware.ts — add to isPublicPath check
const isSharedItinerary =
  request.nextUrl.pathname.startsWith('/itinerary/') &&
  request.nextUrl.searchParams.get('share') === 'true'

const isPublicPath =
  request.nextUrl.pathname === '/' ||
  request.nextUrl.pathname.startsWith('/login') ||
  request.nextUrl.pathname.startsWith('/register') ||
  request.nextUrl.pathname.startsWith('/auth') ||
  isSharedItinerary  // NEW
```

**Then in the itinerary page component**, detect the `share=true` param and use the Supabase anon client (unauthenticated) to fetch the itinerary, render without editing controls, and show the acquisition CTA.

**IMPORTANT SECURITY NOTE:** The itinerary page `page.tsx` is a `'use client'` component. It currently calls `/api/itineraries/${id}` via SWR. For the share view, the API route must be updated to allow the anon client to read public itineraries. The API route must check `is_public = true` before returning data without auth.

The existing pattern in the route handler already calls `supabase.auth.getUser()` and returns 401 if no user. For the share case, the route must first check if `is_public = true` — if yes, return the data without auth check. This is safe because Supabase RLS enforces the constraint at the DB level.

```typescript
// src/app/api/itineraries/[id]/route.ts — modified GET
export async function GET(_req: NextRequest, { params }) {
  const { id } = await params
  const supabase = await createClient()

  // Check if itinerary is public first (no auth required for public read)
  const { data: publicCheck } = await supabase
    .from('itineraries')
    .select('is_public')
    .eq('id', id)
    .maybeSingle()

  const isPublicRequest = publicCheck?.is_public === true

  if (!isPublicRequest) {
    // Private: require auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('itineraries')
    .select('*, activities(*)')
    .eq('id', id)
    .single()
  if (error) return Response.json({ error: error.message }, { status: 404 })
  return Response.json(data)
}
```

### Pattern 6: Activity Card Photo + Rating Display

**What:** Add a photo header and rating row to each ActivityCardItem in DaySection.tsx, reading from `extra_data`
**Design direction (per user request — more modern, less glassmorphism):**

Replace `backdropFilter: 'blur(12px)'` on cards with solid white backgrounds. Use a photo-first card layout:
- Photo at top: `h-32 w-full object-cover rounded-t-xl` — uses next/image with `sizes="(max-width: 768px) 100vw, 50vw"` and `loading="lazy"` (not priority, these are below the fold)
- Below photo: rating row with star icon + number + review count + price level (if available)
- Rest of card layout unchanged

The collapsed state hides the photo (photo only visible when expanded) or always shows photo — either is valid. Given Twitter/Airbnb pattern (always show), always show is preferred.

**For the destination cards on the landing page (`DestinationCards.tsx`):**
Currently uses local `/images/destinations/iceland.jpg` etc. with a plain `<img>` tag. In this phase, replace with `next/image` component and potentially Unsplash API fetched images (or keep local images but upgrade to `next/image` for optimization). The simplest path is to keep the local images and upgrade to `next/image`.

### Anti-Patterns to Avoid
- **Don't fetch Unsplash/Places on every page load:** Fetch at generation time only. Subsequent page loads use the stored `photo_url` and ratings from `extra_data` — no API calls.
- **Don't use `backdropFilter: blur()` on lists of repeated elements:** Forces GPU layers for each element. One or two glass effects (like the hero) is fine; 20 activity cards is not.
- **Don't skip the field mask on Google Places API:** Without `X-Goog-FieldMask`, the API returns all fields and bills for the most expensive tier automatically. Always specify only the fields needed.
- **Don't use the service role key for public reads:** The anon key is safe for public reads because RLS enforces row-level security. The service role key bypasses RLS and must never be used client-side.
- **Don't put the share bypass in the page component only:** The middleware must also allow the route to pass through — otherwise the redirect to `/login` fires before the page even loads.
- **Don't run parallel Unsplash fetches without respecting rate limits:** 50 req/hour in demo mode. For a 20-activity itinerary, that's 20 photo requests plus 1 for the cover image = 21 requests per generation. At demo rate, that's ~2 generations per hour before hitting the limit. Submit for production approval immediately.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Random travel photo for an activity | Custom image scraper | Unsplash `/photos/random?query=` API | Rate-limited, legal, stable CDN URLs, high quality |
| Place ratings | Scraping Google Maps | Google Places Text Search API | Terms-compliant, structured data, globally accurate |
| URL copy to clipboard | Custom clipboard util | `navigator.clipboard.writeText(url)` (1 line) | Web standard, no library needed |
| Public itinerary authorization | Custom token system | Supabase RLS + `is_public` boolean | DB-enforced, revocable instantly, integrates with existing auth |
| Toast notification | Custom toast component | Inline state-driven div (10 lines) or react-hot-toast | A single share toast does not justify a new dependency |

---

## Common Pitfalls

### Pitfall 1: source.unsplash.com is Dead
**What goes wrong:** `fetchCityImage()` and the planned `fetchActivityImage()` silently return `null` for all queries because the endpoint is shut down. Cover images are missing on all new itineraries.
**Why it happens:** The project was built with the no-key Source URL pattern, which was deprecated in 2021 and shut down. The existing code has a `try/catch` that swallows the error.
**How to avoid:** Migrate to the official Unsplash API as the first task in Phase 11. Add `UNSPLASH_ACCESS_KEY` to `.env.local` and Vercel environment variables.
**Warning signs:** Itineraries consistently have `cover_image_url = null` in the database.

### Pitfall 2: Google Places API Pricing Surprise
**What goes wrong:** Requesting `rating`, `userRatingCount`, and `priceLevel` triggers the Enterprise SKU, which is $35/1,000 requests. With 20 activities per itinerary and 50 itineraries/month, that is 1,000 requests = $35/month against the free $200 credit (free for the first ~5,700 requests/month).
**Why it happens:** The field mask determines billing tier. Enterprise fields include `rating`, `userRatingCount`, `priceLevel`.
**How to avoid:** The $200/month free credit covers ~5,714 Enterprise requests at $35/1,000. For early-stage (50-100 itineraries/month with 10-20 activities each), this is well within the free tier. Monitor usage in the Google Cloud Console billing dashboard.
**Warning signs:** A Google Cloud billing alert should be set at $50/month.

### Pitfall 3: Middleware Blocks Share Links
**What goes wrong:** A guest clicks a share link, gets redirected to `/login`. The share feature appears broken even though the itinerary is public.
**Why it happens:** The middleware checks auth before the page renders. `/itinerary/[id]?share=true` matches the `(authenticated)` route group, triggering the auth redirect.
**How to avoid:** Add the `isSharedItinerary` exception to `isPublicPath` in `middleware.ts` before any other share-related work.
**Warning signs:** Testing with an incognito browser redirects to `/login` instead of showing the itinerary.

### Pitfall 4: next/image Requires Remote Domains in next.config.ts
**What goes wrong:** Activity card photos from `images.unsplash.com` fail to load with "hostname not configured" Next.js error.
**Why it happens:** next/image blocks unconfigured remote hostnames for security.
**How to avoid:** `next.config.ts` already has `images.unsplash.com` in `remotePatterns`. No change needed for Unsplash. If Pexels is used as fallback, `images.pexels.com` is also already present.
**Warning signs:** Images render as broken icons in the browser; Next.js terminal shows hostname configuration error.

### Pitfall 5: RLS Policy Does Not Cover Activities Table
**What goes wrong:** Guests who access a public itinerary via the share link can see the itinerary row but the activities array comes back empty because the activities table RLS does not allow anon reads.
**Why it happens:** The existing activities RLS only allows authenticated users. The migration must add a separate policy for activities of public itineraries.
**How to avoid:** The migration in Pattern 4 above explicitly adds the `TO anon` policy on the activities table with a subquery checking `itineraries.is_public = true`.
**Warning signs:** Share links show the itinerary title and hero but no days/activities.

### Pitfall 6: Glassmorphism Causing Scroll Jank
**What goes wrong:** The itinerary page scrolls at below 60fps on mobile, especially when multiple activity cards are visible.
**Why it happens:** Each card with `backdropFilter: 'blur(12px)'` creates a separate GPU compositing layer. With 20 cards, this is 20 compositing layers — the browser must composite them all on every frame during scroll.
**How to avoid:** Remove `backdropFilter` from `ActivityCardItem`. Replace with `rgba(255,255,255,0.95)` solid background. The card design will look cleaner and more modern — aligned with the user's request.
**Warning signs:** Chrome DevTools Performance tab shows "Composite Layers" consuming >10ms per frame during scroll.

### Pitfall 7: Unsplash Rate Limits at Demo Tier
**What goes wrong:** After 50 Unsplash API requests in an hour, all photo fetches return 403. New itineraries are generated without photos.
**Why it happens:** Demo apps are limited to 50 req/hour. A 20-activity itinerary + 1 cover image = 21 requests. After 2-3 itinerary generations in an hour, the limit is hit.
**How to avoid:** Apply for Unsplash production status immediately (5,000 req/hour). Until approved, the fallback to `null` ensures generation succeeds without photos — photos just won't appear.
**Warning signs:** Consistent `null` photo_url on activities after 2+ itinerary generations per hour.

---

## Code Examples

### Google Places Text Search Request (verified from official docs)
```typescript
// Source: https://developers.google.com/maps/documentation/places/web-service/text-search
const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY!,
    'X-Goog-FieldMask': 'places.rating,places.userRatingCount,places.priceLevel',
  },
  body: JSON.stringify({
    textQuery: 'Eiffel Tower, Paris',
    maxResultCount: 1,
  }),
})
// Response: { places: [{ rating: 4.6, userRatingCount: 123456, priceLevel: "PRICE_LEVEL_FREE" }] }
```

### Unsplash Random Photo (verified from official docs)
```typescript
// Source: https://unsplash.com/documentation (GET /photos/random)
const res = await fetch(
  `https://api.unsplash.com/photos/random?query=${encodeURIComponent('Eiffel Tower Paris')}&orientation=landscape`,
  { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
)
// Response includes: { urls: { raw, full, regular, small, thumb }, ... }
// Use urls.regular (1080px) for storage — good balance of quality and size
```

### Supabase RLS — anon read on is_public rows
```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
CREATE POLICY "Public itineraries viewable by anyone"
  ON public.itineraries FOR SELECT
  TO anon
  USING (is_public = true);
```

### Price Level Display Helper
```typescript
// Convert Google Places priceLevel string/number to $ symbols
const PRICE_SYMBOLS: Record<number, string> = { 0: 'Free', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }
function getPriceDisplay(level: number | null): string | null {
  if (level === null || level === undefined) return null
  return PRICE_SYMBOLS[level] ?? null
}
```

### Clipboard + Toast Pattern (no library)
```typescript
async function handleShare(itineraryId: string) {
  const url = `${window.location.origin}/itinerary/${itineraryId}?share=true`
  await navigator.clipboard.writeText(url)
  // Trigger toast via local state: setToastVisible(true), setTimeout(() => setToastVisible(false), 3000)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `source.unsplash.com` no-key URLs | `api.unsplash.com` with Client-ID header | 2021 (deprecated), fully off by 2024 | Must migrate; existing fetchCityImage is broken |
| Places API (Legacy) `maps.googleapis.com/maps/api/place/textsearch` | Places API (New) `places.googleapis.com/v1/places:searchText` | 2022 (new), 2025 (legacy sunset pending) | Use New API from the start |
| CSS `backdropFilter: blur()` on card lists | Solid semi-transparent backgrounds | Ongoing design shift (2024-2025) | Removes GPU composition overhead, cleaner look |
| Glassmorphism everywhere | Photo-first cards with clean white backgrounds | 2024-2025 industry shift | More editorial/magazine aesthetic, better performance |
| Middleware rejects all unauthenticated routes | Middleware allows explicit public paths via is_public check | Pattern used by Notion, Loom, etc. | Enables viral sharing loop |

**Deprecated/outdated:**
- `source.unsplash.com`: Officially dead. Any production code using it is silently failing.
- Google Places API (Legacy): Legacy endpoint will be sunset. New API has better field masking and pricing controls.

---

## Open Questions

1. **Unsplash Production Approval Timeline**
   - What we know: Demo tier is 50 req/hour. Production is 5,000 req/hour.
   - What's unclear: How long Unsplash takes to approve. The application requires describing the use case.
   - Recommendation: Apply immediately when adding the API key. Until approved, the feature works at low volume (dev/staging). Add an `UNSPLASH_RATE_LIMIT_EXCEEDED` log so it is detectable.

2. **Google Places API Key Setup**
   - What we know: Need a Google Cloud project with Places API (New) enabled and a billing account attached.
   - What's unclear: Whether the existing project has a Google Cloud project (the Mapbox token in the codebase suggests Google Maps platform may already be in use for something).
   - Recommendation: Verify if `GOOGLE_PLACES_API_KEY` environment variable is already available. Check Google Cloud Console for existing credentials.

3. **Does the Itinerary Page Need a Server Component Wrapper for Performance?**
   - What we know: The 12.9s is dev cold-compile, not production render. The SWR data waterfall is the real runtime issue.
   - What's unclear: Whether adding a server component wrapper to pre-fetch itinerary data is worth the refactor complexity in this phase.
   - Recommendation: Improve the skeleton UI (add photo skeleton rectangles at top of cards) so the page feels responsive immediately. Skip the server component refactor — it is a larger change and the user's primary concern was the glassmorphism cost and visual quality, not the SWR waterfall.

4. **Destination Cards: Local Images vs Unsplash API**
   - What we know: DestinationCards.tsx currently uses local `/images/destinations/*.jpg` files with a plain `<img>` tag. The CONTEXT.md says to enrich "destination cards on the landing page."
   - What's unclear: Whether "enrich" means (a) just upgrade to next/image for better optimization, or (b) actually pull live Unsplash photos.
   - Recommendation: Keep local images (they are already downloaded from Pexels), upgrade to `next/image` component, and apply the brand palette to the card text (currently uses gray-* classes instead of brand colors). This is a small, safe improvement.

---

## Validation Architecture

> `nyquist_validation: true` in .planning/config.json — section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | File |
|----------|-----------|-------------------|------|
| `fetchActivityImage()` returns Unsplash URL for known query | unit | `npx vitest run src/__tests__/api/unsplash.test.ts` | Wave 0 |
| `fetchActivityImage()` falls back to destination-only on empty result | unit | same | Wave 0 |
| `fetchPlacesData()` returns rating/reviewCount/priceLevel | unit | `npx vitest run src/__tests__/api/places.test.ts` | Wave 0 |
| `fetchPlacesData()` returns nulls gracefully on API error | unit | same | Wave 0 |
| ActivityCardItem renders photo when extra_data.photo_url is set | unit | `npx vitest run src/__tests__/activity-card.test.tsx` | Existing (extend) |
| ActivityCardItem renders rating when extra_data.places_rating is set | unit | same | Existing (extend) |
| Share button calls PATCH is_public=true and copies URL | unit | `npx vitest run src/__tests__/itinerary-hero.test.tsx` | Existing (extend) |
| Itinerary page in share mode renders without edit controls | unit | `npx vitest run src/__tests__/itinerary-detail.test.tsx` | Existing (extend) |
| Acquisition CTA renders for unauthenticated share view | unit | same | Existing (extend) |
| Price level renders as $ / $$ / $$$ / $$$$ symbols | unit | activity-card test | Existing (extend) |

### Wave 0 Gaps
- [ ] `src/__tests__/api/unsplash.test.ts` — tests for `fetchActivityImage()` and updated `fetchCityImage()`
- [ ] `src/__tests__/api/places.test.ts` — tests for `fetchPlacesData()` with mocked fetch responses

All other test files exist and need extensions to existing test suites rather than new files.

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

---

## Sources

### Primary (HIGH confidence)
- Unsplash API Documentation — `GET /photos/random` endpoint, rate limits, URL structure: https://unsplash.com/documentation
- Google Places API (New) Text Search — field mask format, request structure, response format: https://developers.google.com/maps/documentation/places/web-service/text-search
- Google Places API Data Fields — SKU tier for `rating`, `userRatingCount`, `priceLevel`: https://developers.google.com/maps/documentation/places/web-service/data-fields
- Google Maps Platform Pricing — Enterprise SKU cost $35/1,000 requests, 1,000 free/month: https://developers.google.com/maps/billing-and-pricing/pricing
- Supabase RLS Documentation — anon role policy pattern: https://supabase.com/docs/guides/database/postgres/row-level-security

### Secondary (MEDIUM confidence)
- "RIP Unsplash Source" (paul.af) — source.unsplash.com confirmed shut down: https://paul.af/rip-unsplash-source (confirmed by Unsplash Changelog: https://unsplash.com/documentation/changelog)
- Next.js official — route handler performance anti-pattern (calling own API route from server): https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them
- MDN — backdrop-filter performance: https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
- DEV Community — costly CSS properties: https://dev.to/leduc1901/costly-css-properties-and-how-to-optimize-them-3bmd

### Tertiary (LOW confidence)
- Community pattern for Next.js dev cold-start slow compile being a dev-only artifact: multiple GitHub issues and blog posts consistent but not official documentation claim

---

## Metadata

**Confidence breakdown:**
- Unsplash deprecation: HIGH — multiple official and community sources confirm source.unsplash.com is dead
- Google Places API format: HIGH — verified against official docs, field masks confirmed
- Google Places API pricing: HIGH — verified against official pricing table ($35/1,000 Enterprise, 1,000 free/month)
- Supabase RLS anon pattern: HIGH — official Supabase documentation
- Performance root cause (cold compile vs runtime): MEDIUM — well-supported community consensus + code audit shows `'use client'` page; dev-only claim is community-verified but not official statement
- Glassmorphism GPU cost: MEDIUM — MDN and multiple front-end engineering sources; no official Next.js documentation specifically
- next.config.ts domain patterns: HIGH — code audit confirmed `images.unsplash.com` already present

**Research date:** 2026-03-12
**Valid until:** 2026-06-12 (90 days — Google Places API and Unsplash API are stable; Next.js performance characteristics may shift with version updates)
