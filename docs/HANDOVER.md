# Barabula — Claude Code Handover

**Version:** 1.1 · 5 October 2026 (refresh of v1.0: research update, Claude Code working agreement, gap fixes)
**Owner:** Asmeen (solo developer)
**Repo:** `github.com/asmeenray/barabula` (Next.js 16 + Supabase + Vercel)
**Status:** Hobby project. Rebuild starts at phase 14 (phases 1–13 exist in `.planning/`).

> **How to use this file**
> 1. Save it as `docs/HANDOVER.md` in the Barabula repo. Save the companion `BARABULA_PROJECT.md` as `docs/PROJECT.md` (the why: positioning, market research, niche).
> 2. Create `CLAUDE.md` in the repo root from **Appendix A** (or merge Appendix A into the existing one).
> 3. Before phase 14, Claude Code asks Asmeen questions **Q1–Q3** in section 25. The rest can wait until the phase that needs them.
> 4. Add phases 14–20 (section 14) to `.planning/ROADMAP.md` and plan them one at a time with GSD.
> 5. Items marked **VERIFY** must be checked before you build on them (section 16).
> 6. Items marked **PROPOSED** (section 21.4) are not agreed. Don't build them until Asmeen marks them Agreed.
> 7. At the end of every session, update the status tracker (section 24).

### What changed in v1.1

- **Research update (section 21):** Meta oEmbed no longer returns `author_name`, and its documented allowed use is showing embeds, which makes V2 the biggest open risk. FSQ OS Places moved to a gated portal. Supabase free tier pauses idle projects. The reels-to-map market is far more crowded than v1.0 said (20+ apps), and some rivals already plan days from saves and run on Android.
- **Proposed decisions P1–P6 (section 21.4):** feature-flag Meta captions, a home-city "Tonight" view for weekly use, screen-recording capture brought forward, Google Maps export, public list pages for growth, and a beachhead niche.
- **Gaps fixed (section 22):** a capture-limit mismatch (daily vs monthly), file uploads that would hit the serverless body limit, a share-target/install-prompt deadlock, missing `events` and `cost_log` tables, and more.
- **For Claude Code:** a working agreement (section 23), a phase status tracker (section 24), open questions (section 25), a `CLAUDE.md` starter (Appendix A) and extra SQL (Appendix B).

---

## 1. Decisions so far

These were agreed in planning. Don't revisit them without asking Asmeen.

| # | Decision | Why |
|---|---|---|
| D1 | Rebuild Barabula around **your own saved places**; the AI itinerary becomes step two | "Chat → itinerary" is crowded (Layla, Mindtrip) and Google Maps' Ask Maps now builds itineraries |
| D2 | Merge Reel Mapper into Barabula as the **capture** feature | One product, one backend |
| D3 | **Web-first PWA** in the existing Next.js code; Android share via the Web Share Target API | No native app needed to receive shares on Android |
| D4 | Capture from **Instagram, TikTok and Facebook** reels, plus screenshots and screen recordings the user shares | User's real use case. Google Maps already reads screenshots, but not reels |
| D5 | **No scraping.** Only official oEmbed lookups and files the user shares from their own phone | Platform terms; account safety |
| D6 | Store places from an **open dataset (FSQ OS Places)**, not Mapbox | Mapbox's free geocoding tier forbids storing results |
| D7 | **Minimalist, calm UI** is a core product principle (section 4) | Main complaint about competitors is clutter and pop-ups |
| D8 | Conversational **"Ask Barabula"** sits in the paid Plus tier, with 5 free Asks a month | Most-felt feature; usage-based cost |
| D9 | Monetisation is switched on **only after phase 19** | Hobby first; prove you use it yourself |
| D10 | **Out of scope:** visa documents, native Android app, group collaboration, real-time streaming chat | Complexity; revisit later |

> Proposed decisions P1–P6 (section 21.4) sit alongside these. They are **not** agreed until Asmeen says so.

---

## 2. Product

**One line:** The places you saved, turned into a trip.

**Who it's for (first):** Asmeen and friends. Then: people who save travel and food reels on Instagram, TikTok and Facebook and never find them again. Android first.

**The core loop:**

1. **Capture:** share a reel, link or screenshot to Barabula.
2. **Confirm:** a review card shows the place(s) found; one tap keeps them.
3. **Collect:** saves land on your map, grouped by city, each with its source.
4. **Plan:** choose a city and dates; the AI builds days around your saves.
5. **Go:** on the trip, see today's plan, what's open near you from your saves, and directions.

**Non-goals for now:** social feed, public profiles, reviews, booking engine, flights search, group editing, visa paperwork.

---

## 3. Market and how Barabula wins

### 3.1 The landscape (checked October 2026)

| App | What it does | Platforms | Notes |
|---|---|---|---|
| Plotline | Reels/TikTok/YouTube/Maps lists → personal map | iOS; Android waitlist | Claims 30,000+ users, 2M+ places (self-reported) |
| MapDreamy | Share a reel → place on map, plus a discovery feed | Android | Direct Android competitor |
| DocentPro (SpotFetch) | Extract from IG/TikTok/YouTube/Facebook/screenshots → AI itinerary → hotel booking | iOS, Android | Most complete feature set |
| Tripsy | Reel → places; 5 free extractions/month; "search and swap" for wrong places | iOS | Shows accuracy is a known issue |
| TripSpire | TikTok → guide; $6.99/month, $1.99/week, $4.99 for 5 imports | iOS | Price benchmark |
| GeoTok, TokSpot, ReelTravel, Triply, Nifl, Rhyme, Pintra | Variations on reels → map | Mostly iOS | Nifl already does "near a saved place" reminders |
| Mapstr | Manual saving, beautiful personal map | iOS, Android | 4.7 from 2,553 ratings; no video extraction |
| Wanderlog | Full itinerary planner, collaboration | iOS, Android, Web | Pro $39.99/year; 1M+ users tried it |
| Layla, Mindtrip | Chat → itinerary → booking | Web, apps | Mindtrip raised about $19–22M |
| Google Maps | Screenshot list (Gemini reads places in screenshots); Ask Maps itineraries (US and India, March 2026) | All | Free, huge data; doesn't read reels. Screenshot list launched on iOS first, off by default |
| *Added in v1.1:* Rhyme (formerly Roamy) | IG/TikTok → map → day-by-day plan for your number of days | iOS | 4.8 from about 3.2K ratings; Pro $9.99–$14.99/month; users report billing-transparency complaints |
| Go There | Forward IG DMs, reels, stories, TikTok, YouTube, Maps links → map; AI trip plans; verifies against Google Places | iOS, Android | Android competitor with the "plan from saves" loop already |
| Korka | Food-only: IG/TikTok restaurant saves → personal map, share a city list by link | iPhone | "No subscription" is part of its pitch |
| Reelpin | IG reels → searchable library with summaries, transcripts and map pins | Android | General "save graveyard" tool, not travel-only |
| Echo, Triply, glide, ReelsMap, Everyplace, YK | More reels → map variants (Echo saves straight into Google Maps) | Mostly iOS | Confirms the category is crowded |
| Gemini app | Can open a map of places from a chat and export them to a Google Maps list | Android, iOS | Google keeps closing the "chat → saved list" gap |

> **v1.1 note:** the space holds at least 20 reels-to-map apps. Full analysis and the niche recommendation are in `docs/PROJECT.md` and section 21.

### 3.2 What users complain about (the opening)

- **Clutter and pop-ups:** Wanderlog reviews describe the interface as too busy, with constant pop-ups and suggestions.
- **Basic UI behind a paywall:** Wanderlog's top complaint theme is gating dark mode behind the $40/year plan.
- **Hard to sequence a plan:** reviewers say setting dates, times and locations in order, with travel time, was complicated.
- **Wrong extractions:** apps like Tripsy add "swap the wrong place" tools, which shows AI place-finding is often wrong.
- **iOS-first:** many reels-to-map apps are iPhone-only.

### 3.3 Is "minimal and easy" the right edge?

**Yes, as the foundation, but not on its own.** Calm, simple design is the reason people *stay*. It's also easy for others to copy. Combine it with five things that are hard to fake (v1.1: points 3 and 4 are no longer unique; see section 21.3):

1. **Fastest capture:** share → pin confirmed in under 10 seconds, one tap. This is the moment that matters most; measure it.
2. **Trustworthy results:** a review card before anything is saved, with a one-tap fix when the AI is wrong. Never silently add a wrong place.
3. **The loop is finished:** most apps stop at "pins on a map". Barabula goes on to a usable day plan and an on-trip "Today" view. *(v1.1: Rhyme and Go There already plan days from saves; the on-trip Today view and a home-city "Tonight" view (P2) are where Barabula can still lead.)*
4. **Android done properly:** many rivals are iOS-first. *(v1.1: Go There, Reelpin and MapDreamy are on Android. The stronger angle is phone + laptop: capture on the phone, plan on a big screen, which app-only rivals don't offer.)*
5. **Respect:** no pop-ups, no nags, no paywalled basic UI (dark mode, export, deleting data are always free).

---

## 4. Design principles and UX spec

### 4.1 Principles

1. **One primary action per screen.** If a screen has two equal buttons, one is wrong.
2. **The map is the interface.** UI chrome recedes; colour lives on the pins.
3. **Three tabs, no more:** Map · Trips · You. "Ask" is a sheet you open from Map or a trip, not a tab.
4. **Progressive disclosure.** Details (hours, rating, source reel, notes) live in a bottom sheet, opened on tap.
5. **No interruptions.** No pop-ups, tooltips tours, rating prompts or upsell modals. One quiet upgrade line where a limit is reached.
6. **Plain words.** Name things by what people do ("Save place", "Plan a trip"), never by how it's built.
7. **Fast and forgiving.** Every destructive action has undo. Every AI result can be corrected in one tap.
8. **Basic UI is never paid.** Dark mode, export, delete account, offline for one trip: always free.
9. **Thumb-first on Android.** Primary actions in the bottom third; works one-handed.
10. **Quality floor:** WCAG AA contrast, visible focus, respects reduced motion, works in bright sunlight.

### 4.2 Information architecture

```
Map (home)
 ├─ Search / filter bar (city, type, visited)
 ├─ Place sheet (tap a pin)
 └─ Ask sheet (button)
Trips
 ├─ Trip list
 └─ Trip → Plan (days) / Today (on the trip) / Share
You
 └─ Plan & usage, dark mode, export, delete, sign out
Capture sheet (opens from Android share or the + button)
```

### 4.3 Key screens (wireframes)

**Capture sheet** (after sharing from Instagram/TikTok/Facebook):

```
┌─────────────────────────────┐
│  Finding places…            │  ← progress, under 10 s
│  @creator · Lisbon          │
├─────────────────────────────┤
│ ☑ Time Out Market   Food    │
│ ☑ Miradouro da Graça View   │
│ ☐ Pastéis de Belém  Bakery  │  ← low confidence: unticked
│   Not right? Change         │
├─────────────────────────────┤
│        [ Save 2 places ]    │  ← single primary action
└─────────────────────────────┘
```

**Map (home):**

```
┌─────────────────────────────┐
│ 🔍 Lisbon · All · Not visited│
│                             │
│      •    •                 │
│   •     (map)    •          │
│         •                   │
│                      [Ask]  │
│                       [ + ] │
├─────────────────────────────┤
│  Map     Trips     You      │
└─────────────────────────────┘
```

**Place sheet:** name, category, open now/closed, source reel (creator + link), your note, "Directions", "Add to trip", "Visited".

**Trip plan:** day pills across the top, a short list per day (your saves marked, AI suggestions marked "suggested"), a mini-map. Drag to reorder.

**Today:** "Next: Time Out Market · 12 min walk" at the top, the rest of the day below, "Open now near me (from your saves)" as one row.

**Ask sheet:** one input, three example prompts, answers that change the plan appear as a proposed edit with "Apply".

### 4.4 Visual direction (proposal; refine with the frontend-design skill)

The current palette (sand `#F5EDE3` background + coral `#D67940` accent) reads as a generic AI-generated look. Move to a calm, map-first system and keep navy as the brand link.

| Token | Hex | Use |
|---|---|---|
| Paper | `#FFFFFF` | Backgrounds |
| Mist | `#EEF2F5` | Sheets, inputs, dividers |
| Ink | `#16202B` | Text |
| Navy (brand) | `#285185` | Primary buttons, selected state |
| Tag yellow | `#F2A900` | Saved pins (luggage-tag colour) |
| Visited green | `#2E8B57` | Visited pins |

- **Type:** one family, chosen for legibility on the move (for example Atkinson Hyperlegible Next). Drop the three-font setup; keep the logo face for the wordmark only.
- **Shape:** rounded sheets (16 px), flat list rows, no card grids, no gradient washes, no shadows except on the bottom sheet.
- **Motion:** only in response to actions (sheet opens, pin drops after save). The pin drop is the one memorable moment.
- **Dark mode** from day one, free.

### 4.5 Anti-patterns (don't build)

- Onboarding carousels and feature tours.
- Upsell modals, "rate us" prompts, notification permission on first launch (ask when the user turns on near-me alerts).
- A chat box as the home screen.
- Card grids of destinations, video heroes, stock photos on the home screen (remove the current landing hero).
- More than 3 tabs or a hamburger menu.

### 4.6 Performance budgets (mid-range Android, 4G)

| Moment | Budget |
|---|---|
| Share → review card visible | ≤ 3 s (skeleton) |
| Share → places shown | ≤ 10 s (p90) |
| Map interactive on open | ≤ 2 s |
| Place sheet open | ≤ 300 ms |
| JS shipped on Map route | ≤ 200 KB gzipped (excluding map library) |

---

## 5. Current codebase (audit of public repo, last commit 12 March 2026)

| Area | State | Notes |
|---|---|---|
| Stack | Done | Next.js 16 App Router, Supabase (Postgres, RLS, Auth), Vercel, Tailwind 3, Vitest, Playwright |
| Auth | Done | Email/password + Google via Supabase |
| Landing | Done | Video hero, prompt box, chips, destination cards. **To be replaced** by the Map home |
| AI chat | Done | `src/app/api/chat/message/route.ts`, `gpt-4.1`, `max_tokens: 32768`, zod structured output (`src/lib/ai/schemas.ts`), `maxDuration = 60` |
| Itinerary | Done | Day sections, activity tiles, flights, hotels, eat & drink, inline edit |
| Map | Done | MapLibre via `react-map-gl` |
| Geocoding | **Must change** | `src/lib/geocoding.ts`: Mapbox, then Nominatim; caches coordinates in `activities.extra_data` (breaks Mapbox temporary terms) |
| Enrichment | Done | Unsplash/Pexels images; Foursquare v3 ratings (`src/lib/places.ts`) |
| Sharing | Done | `itineraries.is_public` + anon RLS policies |
| Chat sessions | **Must change** | `trip_sessions` and `chat_history` keyed by `user_id` only: one active chat per user |
| Collaboration, streaming | Not started | Out of scope (D10) |
| Legacy code | **Delete** | `frontend/` (CRA), `backend/` (FastAPI), `mcp-server/`, `test_auth.py`, outdated README |
| PWA | None | No manifest or service worker |

---

## 6. Target architecture

```
Android share sheet ──► /share (PWA share_target, reads `text`, `url`, files)
                          │
                          ▼
                    /api/capture  ──► platform detect (instagram | tiktok | facebook | web | file)
                          │                 │
                          │                 ├─ TikTok oEmbed (no token)
                          │                 ├─ Meta oEmbed: instagram_oembed / oembed_video (no token, 1,000/h)
                          │                 ├─ Page meta tags (title/description) as extra text
                          │                 └─ File (screenshot/recording) → Gemini vision/video
                          ▼
                    LLM extraction (zod: name, city, country, category, confidence, evidence)
                          ▼
                    Place matcher (FSQ OS Places in Postgres + PostGIS; name similarity + city + distance)
                          ▼
                    Review card (client) ──► POST /api/saves
                          ▼
             places · sources · saves (Supabase, RLS)
                          ▼
     Map (home) ── Trips/Plan (existing itinerary engine, now "plan from saves") ── Today ── Ask
```

**Environment variables (add):**

```
# Existing (check names against .env.example / the code before renaming anything)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server only; never shipped to the client
OPENAI_API_KEY=                 # full itinerary generation
FOURSQUARE_API_KEY=             # live details only (not stored) — VERIFY terms

# New
GEMINI_API_KEY=                 # extraction from files + Ask
GEMINI_MODEL_EXTRACT=           # model id, not hard-coded — prices differ a lot between Flash-Lite generations (V7)
GEMINI_MODEL_ASK=
OPENAI_MODEL_PLAN=gpt-4.1       # keep current model; swap after measuring (section 10)
META_GRAPH_VERSION=v26.0        # Graph API version for Meta oEmbed; docs moved past v25.0 — VERIFY
CAPTURE_META_CAPTIONS=true      # PROPOSED P1: switch off before public launch unless V2 clears
MAP_STYLE_URL=                  # tile provider for MapLibre — VERIFY terms (section 16)
CAPTURE_MONTHLY_LIMIT_FREE=15   # v1.1 fix: v1.0 said "daily" here but "per month" in section 13
ASK_MONTHLY_LIMIT_FREE=5
```

Keep a matching `.env.example` with names only. Never commit real values.

---

## 7. Data model

Migration `supabase/migrations/20261005000000_saves_first.sql`:

```sql
create extension if not exists postgis;
create extension if not exists pg_trgm;   -- fuzzy name matching

-- Real-world places (shared across users). Loaded from FSQ OS Places.
create table public.places (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null default 'fsq_os',  -- 'fsq_os' | 'osm' | 'manual'
  provider_id   text not null,                    -- fsq_place_id etc.
  name          text not null,
  category      text,
  city          text,
  country       text,                             -- ISO-2
  address       text,
  geog          geography(point, 4326) not null,
  extra         jsonb not null default '{}',      -- static attributes only
  updated_at    timestamptz not null default now(),
  unique (provider, provider_id)
);
create index places_geog_idx on public.places using gist (geog);
create index places_name_trgm_idx on public.places using gin (name gin_trgm_ops);
create index places_city_idx on public.places (country, city);

-- Where a save came from (reel, link, screenshot)
create table public.sources (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  url           text,                              -- null for files
  url_hash      text,                              -- for idempotency
  platform      text not null,                     -- instagram | tiktok | facebook | gmaps | web | screenshot | recording | manual
  caption       text,
  creator       text,
  status        text not null default 'pending',   -- pending | done | failed | needs_input
  error         text,
  created_at    timestamptz not null default now(),
  unique (user_id, url_hash)
);

-- A user's bookmark of a place
create table public.saves (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  place_id      uuid not null references public.places(id),
  source_id     uuid references public.sources(id) on delete set null,
  note          text,
  tags          text[] not null default '{}',
  visited_at    timestamptz,
  created_at    timestamptz not null default now(),
  unique (user_id, place_id)
);
create index saves_user_idx on public.saves (user_id, created_at desc);

-- Capture candidates shown on the review card (before saving)
create table public.capture_candidates (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid not null references public.sources(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  raw_name      text not null,
  raw_city      text,
  category      text,
  confidence    real not null,                    -- 0..1 from extractor
  match_place_id uuid references public.places(id),
  match_score   real,                             -- 0..1 from matcher
  evidence      text,                             -- caption snippet that mentions it
  created_at    timestamptz not null default now()
);

-- Usage counters for limits (captures, asks)
create table public.usage (
  user_id       uuid not null references public.users(id) on delete cascade,
  period        date not null,                    -- first day of month
  captures      int not null default 0,
  asks          int not null default 0,
  primary key (user_id, period)
);

-- Entitlements (phase 20)
create table public.entitlements (
  user_id       uuid primary key references public.users(id) on delete cascade,
  plan          text not null default 'free',     -- free | plus | trip_pass
  expires_at    timestamptz,
  provider      text,                             -- polar | creem | dodo
  provider_ref  text,
  updated_at    timestamptz not null default now()
);

-- Link plan activities to places; one chat per trip
alter table public.activities add column if not exists place_id uuid references public.places(id);
alter table public.activities add column if not exists from_save boolean not null default false;
alter table public.trip_sessions add column if not exists itinerary_id uuid references public.itineraries(id) on delete cascade;
alter table public.chat_history add column if not exists itinerary_id uuid references public.itineraries(id) on delete cascade;

-- RLS
alter table public.places enable row level security;
alter table public.sources enable row level security;
alter table public.saves enable row level security;
alter table public.capture_candidates enable row level security;
alter table public.usage enable row level security;
alter table public.entitlements enable row level security;

create policy "places readable by signed-in users" on public.places
  for select to authenticated using (true);
-- writes to places only via service role (server)

create policy "own sources" on public.sources
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own saves" on public.saves
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own candidates" on public.capture_candidates
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own usage (read)" on public.usage
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own entitlement (read)" on public.entitlements
  for select to authenticated using ((select auth.uid()) = user_id);

-- Near-me over a user's saves
create or replace function public.saves_near(lat double precision, lng double precision, radius_m int default 1500)
returns table (save_id uuid, place_id uuid, name text, category text, distance_m double precision)
language sql stable security invoker as $$
  select s.id, p.id, p.name, p.category,
         st_distance(p.geog, st_makepoint(lng, lat)::geography)
  from public.saves s join public.places p on p.id = s.place_id
  where s.user_id = auth.uid()
    and st_dwithin(p.geog, st_makepoint(lng, lat)::geography, radius_m)
  order by 5 asc limit 50;
$$;
```

**Note:** check the existing `trip_sessions` definition before running (it isn't in `supabase/schema.sql`); adjust the `alter` if needed.

**v1.1 notes:**
- This migration references `public.users(id)`. Confirm that table exists and mirrors `auth.users` (many Supabase apps only have `auth.users`). If it doesn't, reference `auth.users(id)` instead.
- `events` (section 18) and `cost_log` (phase 14) were used but never defined. Their SQL, an atomic usage counter and a clean-up job are in **Appendix B**. Put them in a second migration, `20261005000100_events_costs.sql`.
- Manual adds (phase 16) write `places` rows with `provider = 'manual'` through the server (service role), because clients can't write to `places`.

---

## 8. Capture pipeline

### 8.1 API contract

`POST /api/capture`

```json
// request (JSON) — link
{ "url": "https://www.instagram.com/reel/ABC123/", "text": "optional shared text" }
// request (multipart) — file
// fields: file=<image|video>, text=<optional>
```

```json
// response 200
{
  "source_id": "uuid",
  "platform": "instagram",
  "creator": "@lisbonfood",
  "status": "done",            // done | needs_input | failed
  "candidates": [
    { "id": "uuid", "name": "Time Out Market", "city": "Lisbon", "category": "food",
      "confidence": 0.92, "match": { "place_id": "uuid", "score": 0.88, "address": "…" },
      "preselected": true }
  ],
  "prompt": null               // e.g. "Which place is this?" when status = needs_input
}
```

`POST /api/saves` → `{ "candidate_ids": ["uuid"], "note": "optional" }` creates saves; returns the saved places.

**v1.1:** `creator` is nullable. TikTok oEmbed returns `author_name`; Meta oEmbed stopped returning `author_name`, `author_url` and thumbnails (fully removed 3 November 2025). For Instagram and Facebook, try to read the handle from the embed `html`; otherwise leave it `null`. Never fetch it some other way.

### 8.2 Stages

1. **Normalise the input.** On Android the shared link arrives in `text`, not `url`; extract the first URL from both. Strip tracking parameters. Hash for idempotency (`user_id + url_hash`): a repeat share returns the existing result.
2. **Detect platform** by hostname: `instagram.com`, `tiktok.com` / `vm.tiktok.com` (resolve redirect), `facebook.com` / `fb.watch`.
3. **Fetch text:**
   - TikTok: `GET https://www.tiktok.com/oembed?url=<url>` → `title` (caption), `author_name`, embed `html` (strip tags for caption + hashtags).
   - Instagram: `GET https://graph.facebook.com/${META_GRAPH_VERSION}/instagram_oembed?url=<url>` (no token since 15 June 2026; 1,000/hour per endpoint). Parse caption from `html` if present. **VERIFY** what's returned.
   - Facebook reels: `GET https://graph.facebook.com/${META_GRAPH_VERSION}/oembed_video?url=<url>` (no token). **VERIFY** caption presence.
   - **v1.1:** both Meta calls run only when `CAPTURE_META_CAPTIONS=true` (PROPOSED P1). Meta documents the allowed use of oEmbed as showing front-end views of public posts; using the caption to extract places may fall outside that (V2). Showing the embed on the review card is inside it.
   - Optional: public page `<title>` / `og:description` via a plain GET (no login, respect robots). If blocked, skip.
4. **Extract places** with a small model and a zod schema:

```ts
const Extracted = z.object({
  places: z.array(z.object({
    name: z.string(),
    city: z.string().nullable(),
    country: z.string().nullable(),   // ISO-2 if known
    category: z.enum(['food','drink','cafe','sight','nature','beach','stay','shop','activity','other']),
    confidence: z.number().min(0).max(1),
    evidence: z.string(),             // exact words from the caption
  })).max(15),
  needs_more_info: z.boolean(),
})
```

   Rules for the prompt: only places actually named or clearly shown; never invent; return `needs_more_info: true` when nothing specific is found.
5. **Match** each candidate to `places`:
   - Filter by city/country when known; otherwise use the creator's usual city if known, else ask.
   - Score = 0.6 × name trigram similarity + 0.2 × category agreement + 0.2 × city match. Keep the top 3.
   - `preselected = confidence ≥ 0.7 and score ≥ 0.6`. Below that, show unticked with "Change".
6. **Fallback ladder** when nothing is found: (a) ask the user "Which place is this?" with a search box; (b) offer "Share a screenshot or screen recording instead".
7. **Files:** images and short videos go to Gemini (vision/video) with the same zod schema. Don't store the file after processing; keep only the extracted text.
   - **v1.1 upload path:** don't send files through the Next.js route body. Serverless functions have a small request-body limit (about 4.5 MB on Vercel — **VERIFY**, V11) and screen recordings are bigger. Instead: the service worker receives the shared file (share-target POST), stores it in IndexedDB, then the page asks `/api/capture/upload-url` for a signed upload URL to a **private** Supabase Storage bucket (`capture-uploads`), uploads directly, and calls `/api/capture` with the storage path. The server passes the file to Gemini and deletes the object once processing ends (success or failure). Add a daily clean-up for anything older than 24 h.
   - Ask Gemini for spoken names and on-screen text as well as what is shown; this is the main way to catch reels whose caption doesn't name the place (PROPOSED P3).
8. **Count usage** (`usage.captures`) only on `done`.

### 8.3 Limits and costs

- Meta oEmbed: 1,000 calls/hour per endpoint without a token → queue and back off; cache results per `url_hash`.
- Text extraction: well under 1 US cent per link.
- Video: about 300 tokens per video second → a 60-second clip ≈ 18,000 tokens, under 2 US cents on a Flash-class model.

### 8.4 Hard rules

- Never download videos from Instagram, TikTok or Facebook servers. Never log in as the user. Never scrape logged-in pages.
- Never save without the user's confirmation.

---

## 9. Places data (FSQ OS Places)

- **What:** Foursquare's open-source places dataset: 100M+ points of interest, Apache 2.0, free for commercial use, refreshed monthly. **VERIFY** current download location, schema and attribution requirements in Foursquare's docs.
- **v1.1 access update:** since October 2025, new releases are no longer on the public S3 bucket. Get them through the Foursquare Places Portal (free account, access token, Iceberg catalog), the Snowflake listing, or the gated Hugging Face dataset (accept the conditions first). Attribution: ship Foursquare's `NOTICE.txt` with the data and credit Foursquare in the app's About/Credits screen.
- **Practical load path:** use DuckDB locally to read the Parquet files, filter by country, city bounding box, category (food, drink, sights, nature, shops) and "not closed", then upsert into Postgres. Measure the size of each city before loading: the Supabase free tier is 500 MB in total (V8).
- **Load:** a script `scripts/load-fsq-os.ts` that downloads the release for selected countries only (start: GB plus 3–5 trip destinations) and upserts into `places` (`provider = 'fsq_os'`, `provider_id = fsq_place_id`). Keep under the Supabase free-tier database limit; check size per country first.
- **Refresh:** monthly job (manual for now); upsert by `provider_id`, never delete a place that has saves.
- **Live details** (open now, rating, photos): fetch at view time from the Foursquare Places API; cache in memory only. **VERIFY** Foursquare's storage terms.
- **Replace** `src/lib/geocoding.ts` Mapbox storage with the matcher above. Keep Nominatim only for city-level lookups, at under 1 request/second.

---

## 10. Plan from saves

Reuse the existing itinerary engine and UI. Changes:

1. **Input:** trip city + dates + the user's saves in that city (name, category, coordinates, note).
2. **Pre-group on the server** (no LLM): cluster saves by distance (PostGIS `ST_ClusterDBSCAN`, eps ≈ 1.5 km) into areas; give the LLM the clusters, not raw points.
3. **Prompt rules:** every save is a fixed anchor unless the user has more saves than fit; one area per half-day; fill gaps with at most 2 suggestions per day, marked `from_save = false`; respect known opening days; leave free time.
4. **Output:** the existing `GeneratedItinerary` schema plus `place_id` on activities that came from saves.
5. **Model:** keep `gpt-4.1` for full plans (it's the existing code); measure token use and move to a cheaper model if quality holds.

---

## 11. On the trip

- **Today view:** next activity with walking time (open in Google Maps for directions via URL; no routing API needed).
- **Near me:** `saves_near(lat, lng)` on demand (button), not background tracking.
- **Offline:** service worker caches the trip JSON, place details and the app shell. Map tiles: cache only what the tile provider's terms allow (**VERIFY**); show a list view when offline.
- **Alerts (later):** "You're near a saved place" needs background location, which a PWA can't do reliably on Android. Defer to a native app if ever built.

---

## 12. Ask Barabula

- **Where:** a sheet from the Map and from a trip.
- **What:** questions answered from the user's own saves and trip: "What's open near me from my saves?", "It's raining, swap this afternoon", "Move day 2's dinner near the hotel".
- **How:** function calling with three tools:
  - `search_saves(city?, category?, near?: {lat,lng}, open_now?: boolean)`
  - `propose_itinerary_edit(trip_id, changes[])` → returns a diff the user applies
  - `get_place_details(place_id)`
- **Model:** a cheap Flash-Lite-class model (about $0.30 in / $2.50 out per million tokens). About 3,000 tokens in and 500 out ≈ $0.002 per Ask.
  - **v1.1:** Flash-Lite prices now vary by generation (third-party price lists in September 2026 show the 2.5 generation at about $0.10/$0.40 and newer ones at $0.25–$0.30 in and $1.50–$2.50 out). Read the model id from `GEMINI_MODEL_ASK` and log real costs in `cost_log`. **VERIFY** on Google's pricing page.
- **Limits:** free 5/month; Plus fair use 300/month. Count in `usage.asks`.
- **Never** let Ask edit data without the user tapping "Apply".

---

## 13. Monetisation (phase 20, only after phase 19)

| Plan | UK | US | India | Includes |
|---|---|---|---|---|
| Free | £0 | $0 | ₹0 | Unlimited manual saves, 15 link captures/month, 1 planned trip, 5 Asks/month, share links, dark mode, export |
| Plus monthly | £3.99 | $4.99 | ₹199 | Unlimited captures and trips, Ask, screen-recording capture, offline trips |
| Plus annual | £24.99 | $29.99 | ₹1,299 | Same |
| Trip Pass (30 days) | £4.99 | $5.99 | ₹249 | Plus for one trip, no renewal |

- **Checkout:** merchant of record (Polar, Creem or Dodo) while web-only; webhook → `entitlements`. If the app ever ships on Google Play, digital subscriptions fall under Play Billing rules (**VERIFY** UK/India alternatives).
- **Booking commissions:** GetYourGuide/Viator links on activity tiles (about 8% of booking value, ~30-day cookie); Booking.com on hotel cards (a share of Booking's commission). Label links "affiliate"; never rank by commission.
- **Benchmarks:** Wanderlog Pro $39.99/year; Polarsteps Plus €8.99/month; TripSpire $6.99/month; Tripsy 5 free extractions/month.
- **Reality check:** travel is among the hardest app categories to reach $1,000/month, though it has the best annual renewal rate (40% median). Expect roughly £120/month at 1,000 monthly users with 3% paying.

---

## 14. Roadmap (GSD phases 14–20)

Each phase ends with its "Done when". Don't start the next phase until it passes **and** Asmeen confirms. Record progress in section 24.

> v1.1 lines are marked *(v1.1)*. Lines marked *(if P#)* only apply if that proposal is agreed (section 21.4).

### Phase 14 — Reset (1 weekend)
- [ ] Branch `rebuild/saves-first`
- [ ] Delete `frontend/`, `backend/`, `mcp-server/`, `test_auth.py`; rewrite README
- [ ] Update dependencies; `npm test` green
- [ ] Per-trip chat: add `itinerary_id` to `trip_sessions` and `chat_history`; update routes
- [ ] Stop storing Mapbox coordinates; add a `cost_log` (route, model, tokens, external calls)
- [ ] *(v1.1)* `CLAUDE.md` from Appendix A; `.env.example` with names only (section 6)
- [ ] *(v1.1)* Migration `20261005000100_events_costs.sql` from Appendix B (`events`, `cost_log`, `bump_usage`)
- [ ] *(v1.1)* Confirm whether `public.users` exists; fix the section 7 references if not
- **Done when:** app deploys; two trips can be planned side by side; no Mapbox results stored

### Phase 15 — Capture spike (1–2 weekends)
- [ ] Test set: 50 real links (mix of Instagram, TikTok, Facebook) with the correct places written down in `tests/fixtures/capture.json`
- [ ] Migration from section 7 (places, sources, capture_candidates, usage)
- [ ] Load FSQ OS Places for 2–3 test cities
- [ ] `/api/capture` stages 1–5 (links only)
- [ ] Script `npm run eval:capture` → precision, recall, p90 time, cost per link
- [ ] *(v1.1)* Tag each fixture with where the place name appears: `caption`, `on_screen`, `spoken`, `not_named`. Report accuracy per tag
- [ ] *(v1.1, if P3)* Second eval arm: 15 of the links as your own screen recordings through Gemini; compare with the caption arm
- [ ] *(v1.1)* Write down the V2 answer (Meta terms) before any phase builds on Meta captions
- **Gate:** ≥ 70% of places correct; p90 ≤ 10 s. If not, build the fallback ladder and re-test before going on

### Phase 16 — Saves and the map (2 weekends)
- [ ] Map home (replaces the landing page for signed-in users), filters, place sheet
- [ ] Review card → `/api/saves`
- [ ] Manual add (search places), Google Maps link import
- [ ] New visual system (section 4.4) and 3-tab navigation
- [ ] *(v1.1)* Paste-a-link capture from the + button (needed before the PWA is installed; see phase 17)
- [ ] *(v1.1)* Free basics promised in section 4.1: export (CSV; KML if P4), delete account (cascades), dark mode
- [ ] *(v1.1)* "Open in Google Maps" on the place sheet (URL link, no API)
- [ ] *(v1.1)* Credits screen with the Foursquare attribution (section 9)
- **Done when:** 100+ real places saved; you stop using each app's saved folder

### Phase 17 — Share from the phone (1 weekend)
- [ ] `manifest.webmanifest` with `share_target` (GET for links; POST multipart for files)
- [ ] Service worker (app shell), install prompt shown only after the first successful capture
  - *(v1.1)* The share sheet only lists Barabula once the PWA is installed (**VERIFY**, V12). So the first capture always comes from pasting a link (phase 16). Straight after it succeeds, show one quiet line: "Install Barabula to share straight from Instagram." No modal.
- [ ] File capture (screenshot, screen recording) via Gemini
  - *(v1.1)* Use the signed-upload path in section 8.2, stage 7, not the route body
- [ ] *(v1.1)* Record which fields each app actually sends (`title`, `text`, `url`, files) for Instagram, TikTok and Facebook on Android; save as a fixture
- **Done when:** share from each of the three apps → place on your map in under 10 seconds

### Phase 18 — Plan from saves (2–3 weekends)
- [ ] Clustering function; new planner prompt (section 10)
- [ ] Trip plan screen reusing itinerary components; saves vs suggestions marked
- **Done when:** a 3-day city plan using 10+ saves needs fewer than 5 manual edits

### Phase 19 — On the trip (2 weekends)
- [ ] Today view, near-me (`saves_near`), directions links
- [ ] Offline trip cache
- [ ] *(v1.1, if P2)* Home city "Tonight" view: open now near me from my saves, one row per place, no plan needed
- **Done when:** you use it for a whole real trip *(and, if P2, you use Tonight on 3 separate evenings at home)*

### Phase 20 — Ask and money (2 weekends)
- [ ] Ask sheet with tools (section 12), usage limits
- [ ] Merchant-of-record checkout + webhook → `entitlements`; plan gating
- [ ] Affiliate links on activity and hotel cards
- [ ] *(v1.1)* Clear billing: price, renewal date and a one-tap cancel link on the You tab (a common complaint about rivals)
- [ ] *(v1.1, if P5)* Public city-list pages (works without the app; indexable; "Save to my Barabula" button)
- **Done when:** 5 friends use Ask on a trip; first payment or commission

---

## 15. First weekend (start here)

**Before Saturday (15 minutes)**
- [ ] Asmeen answers Q1–Q3 (section 25)
- [ ] Create `CLAUDE.md` from Appendix A; commit this file as `docs/HANDOVER.md` and the project description as `docs/PROJECT.md`

**Saturday — phase 14**
- [ ] Create branch; confirm local and Vercel builds work
- [ ] Delete legacy folders; fix references; new README
- [ ] Update dependencies; run tests
- [ ] Per-trip chat sessions
- [ ] Cost log; stop storing Mapbox coordinates

**Sunday — phase 15 start**
- [ ] Collect the 50-link test set
- [ ] Call TikTok and Meta oEmbed for 10 links by hand; record exactly what text comes back (this answers the biggest open question). *(v1.1: expect no `author_name` from Meta; note whether the caption is inside `html`)*
- [ ] Zod extractor + eval script on those 10
- [ ] Decide whether captions are good enough or the fallback ladder is needed early

---

## 16. Verification backlog (research before building)

| # | Question | Why it matters | Where to check |
|---|---|---|---|
| V1 | Do Instagram and Facebook oEmbed responses include the caption text? | Core of capture | Call the endpoints on 10 public reels |
| V2 | Do Meta Platform Terms allow using oEmbed data to *extract* information, not only to display an embed? **v1.1: HIGH RISK.** Meta's feature page lists the allowed use as front-end views of public posts. Ask Meta developer support, or treat captions as off by default (P1) | Legal basis of capture | Meta Platform Terms, Developer Policies, Meta oEmbed Read feature page |
| V3 | Same for TikTok's oEmbed and embed terms | Legal basis | TikTok developer terms |
| V4 | FSQ OS Places download location, schema, size per country, attribution. **v1.1: partly answered** (portal / Snowflake / gated Hugging Face; `NOTICE.txt`). Still need size per city | Places data | Foursquare open data docs, places.foursquare.com |
| V5 | Foursquare Places API: free calls (sources say 500 or 10,000) and whether details may be cached | Cost and terms | foursquare.com/products/pricing |
| V6 | MapLibre tile provider and its offline/caching terms | Map and offline | Chosen provider's terms |
| V7 | Current Gemini model names and prices for video and Flash-Lite. **v1.1:** several Flash-Lite generations with very different prices; keep model ids in env vars | Cost | ai.google.dev pricing |
| V8 | Supabase free-tier limits (DB size, edge functions) vs FSQ data size. **v1.1:** third-party guides (Sept 2026) say 500 MB database, 1 GB file storage with 50 MB max per file, and free projects pause after a week of inactivity | Hosting | Supabase pricing |
| V9 | Google Play Billing rules for a PWA wrapped as a TWA, UK and India | Only if listing on Play | Play Console help |
| V10 | Affiliate programme approval requirements (GetYourGuide, Viator, Booking.com, Travelpayouts) | Phase 20 | Each programme's terms |
| V11 | *(v1.1)* Vercel function request-body limit and max duration on your plan | File capture; Gemini video calls can be slow | Vercel limits docs |
| V12 | *(v1.1)* Does the Android share sheet list a PWA share target only when installed? Which fields do Instagram, TikTok and Facebook send? | Phase 17 flow | Chrome Web Share Target docs; test on your phone |
| V13 | *(v1.1)* FSQ OS Places coverage and freshness in your beachhead cities (closed venues, missing places), especially outside the US and UK | Matching accuracy | Sample 50 places you know |
| V14 | *(v1.1)* Google Places API as a fallback matcher: what may be stored (place IDs) and cost | Plan B if FSQ coverage is weak | Google Maps Platform terms and pricing |
| V15 | *(v1.1)* UK GDPR (and India's DPDP Act if you target India): privacy policy, data export/deletion, location and uploaded media | Legal basics before friends outside your circle sign up | ICO guidance; MeitY |
| V16 | *(v1.1)* Which merchant of record supports INR/UPI, GBP and USD with low fees | Phase 20 pricing in three markets | Polar, Creem, Dodo docs |

---

## 17. Testing and quality

- **Capture eval:** `tests/fixtures/capture.json` (50 links → expected places). Run on every change to prompts or matching. Track precision, recall, p90 latency, cost.
- **Unit (Vitest):** URL normalisation, platform detection, oEmbed parsing, matcher scoring, usage limits.
- **E2E (Playwright):** share-target page with a link → review card → save → pin on map; plan from saves; Today view offline.
- **Accessibility:** axe check in Playwright on Map, Capture, Trip.
- **Error copy:** say what went wrong and what to do ("Couldn't read this reel. Share a screenshot instead.").

## 18. Metrics (store in a small `events` table; no third-party trackers)

- Activation: first capture saved within 24 h of sign-up.
- Share → pin time (p50, p90).
- Capture accuracy (from eval set and user corrections).
- Weekly saves per active user.
- Trips planned from saves; trips opened in Today view.
- Ask per Plus user; free→Plus conversion (phase 20).
- *(v1.1)* Capture accuracy split by where the name appeared (caption, on-screen, spoken).
- *(v1.1, if P2)* Weekly "Tonight" opens in the home city — the main weekly-use signal, since trips happen only a few times a year.

## 19. Risks and kill criteria

**Risks:** platform terms change for oEmbed; Instagram/Facebook captions not returned; Google Maps adds reel import; place-matching errors; scope creep.

**Kill or pause if:**
- Capture accuracy stays under 70% after the fallback ladder.
- You don't use it on one real trip.
- After 60 days with friends, fewer than 10 people come back weekly.
  - *(v1.1)* This test only makes sense if there is a weekly reason to come back (P2). If P2 is rejected, change it to "fewer than 10 people save something in 2 separate weeks of each month".

## 20. Sources

- Barabula repo: https://github.com/asmeenray/barabula
- TikTok oEmbed: https://developers.tiktok.com/doc/embed-videos
- Meta tokenless oEmbed (15 June 2026): https://developers.facebook.com/blog/post/2026/06/15/tokenless-access-to-meta-oembed-apis/
- Meta oEmbed field changes: https://developers.facebook.com/blog/post/2025/04/08/oembed-updates/
- Meta Embeds plugin (reel URL formats): https://wordpress.org/plugins/meta-embeds/
- Web Share Target API: https://developer.chrome.com/docs/capabilities/web-apis/web-share-target
- Geocoding storage terms (Mapbox temporary vs permanent): https://www.geocod.io/geocoding-terms-of-use-comparison
- FSQ OS Places overview: https://openplacesapi.com/blog/fsq-os-places-free-place-search
- Foursquare pricing: https://foursquare.com/products/pricing/
- Gemini video token rates: https://www.forasoft.com/learn/ai-for-video-engineering/articles-ai/real-cost-of-ai-in-video-products-gemini-openai-pricing
- Gemini Flash-Lite pricing: https://www.orcarouter.ai/blog/gemini-agentic-video-understanding
- RevenueCat renewal benchmarks: https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category
- Wanderlog complaints: https://chrome-stats.com/d/com.wanderlog.android · https://marlvel.ai/apps/wanderlog-travel-planner · https://trustpilot.com/review/wanderlog.com
- Plotline: https://getplotline.app/blog/best-apps-save-instagram-reels-travel-map
- MapDreamy: https://play.google.com/store/apps/details?id=com.retify.mapdreamy
- DocentPro comparison: https://docentpro.com/blog/best-apps-to-save-places-from-tiktok-instagram-youtube
- Tripsy: https://www.mergeek.com/en/latest/K5lYgAMYq96A1wx2 · TripSpire: https://apps.apple.com/app/6753126737
- Google Maps screenshot list: https://blog.google/products-and-platforms/products/maps/how-to-google-maps-screenshot-save-gemini/
- Ask Maps (AP): https://www.fox19.com/2026/03/12/google-unveils-major-changes-its-maps-app
- Affiliate rates: https://track360.io/blog/best-travel-affiliate-programs-2026-operator-rate-card-benchmark
- Polarsteps revenue streams: https://nl.linkedin.com/in/yves-dukker

**Added in v1.1 (checked 5 October 2026)**
- Meta oEmbed reference (removed fields; tokenless limits): https://developers.facebook.com/docs/graph-api/reference/oembed-video/
- Meta oEmbed Read feature (allowed usage): https://developers.facebook.com/documentation/development/features-reference/meta-oembed-read
- Meta oEmbed setup docs: https://developers.facebook.com/docs/instagram-platform/oembed
- Tokenless oEmbed explainer: https://wpmayor.com/meta-tokenless-oembed-wordpress/
- TikTok oEmbed response example: https://developers.tiktok.com/doc/embed-videos
- FSQ OS Places access change: https://medium.com/@foursquare/evolving-fsq-os-places-fa7a3f5197cd · https://huggingface.co/datasets/foursquare/fsq-os-places
- Supabase free tier (third-party summaries): https://makerkit.dev/blog/md/saas/supabase-pricing · https://aiagencyplus.com/supabase-free-tier-limits/
- Gemini pricing (third-party summaries; confirm on ai.google.dev): https://developer.puter.com/tutorials/gemini-api-pricing/ · https://anotherwrapper.com/llm-pricing/gemini-2.5-flash-lite
- Rhyme/Roamy: https://apps.apple.com/us/app/6748781672 · https://apppricinglab.com/app/apple/6748781672 · https://marlvel.ai/api/llm/apps/travel/ai-fortheplot
- Go There: https://hunted.space/product/go-there · https://www.indiehackers.com/post/i-kept-dming-myself-instagram-reels-i-never-visited-so-i-built-an-app-that-turns-them-into-a-map-d4e737ac1d
- Korka: https://mwm.ai/apps/korka-food-map/6762612703 · Reelpin: https://hunted.space/product/reelpin · Echo: https://peerpush.com/p/echo-your-travel-companion
- Gemini app → Google Maps list export: https://support.google.com/gemini/answer/16622866
- Google Maps screenshots (iOS first): https://9to5google.com/2025/03/27/google-maps-gemini-screenshots/
- Instagram Map (friends' locations, tagged content): https://techcrunch.com/2025/08/06/instagram-takes-on-snapchat-with-new-instagram-map
- India Instagram audience (551M, July 2026, NapoleonCat via Republic): https://www.republicworld.com/initiatives/how-indians-are-saving-instagram-reels-and-videos-using-just-a-browser-link-in-2026-2026-09-03-136201

---

# v1.1 additions

## 21. Research update (5 October 2026)

### 21.1 Platform and data facts that change the build

| Area | What we found | What changes |
|---|---|---|
| Meta oEmbed fields | `author_name`, `author_url` and the thumbnail fields are no longer returned (fully removed 3 November 2025) | `creator` is nullable; parse the handle from embed `html` if it's there (section 8.1) |
| Meta oEmbed access | Tokenless since 15 June 2026, 1,000 calls per endpoint per hour. With an approved app and token, up to 5 million per endpoint per day | Queue and cache as planned. If Barabula ever grows past friends, apply for Meta oEmbed Read |
| Meta oEmbed allowed use | Meta's feature page lists the allowed use as front-end views of public pages, posts and videos | V2 is the top risk. Captions sit behind a flag (P1); showing the embed on the review card is fine |
| Graph API version | Meta's reference pages now show v26.0 in examples | Version comes from `META_GRAPH_VERSION`, not hard-coded |
| TikTok oEmbed | Returns caption text and hashtags inside the embed `html`, plus the creator handle | Section 8.2 holds; V3 (terms) still open |
| FSQ OS Places | New releases only via the Places Portal (Iceberg, token), Snowflake, or gated Hugging Face; Apache 2.0 with `NOTICE.txt` attribution | Section 9 updated; credits screen added to phase 16 |
| Supabase free tier | 500 MB database, 50 MB max file upload, projects pause after a week idle (third-party summaries; VERIFY) | Load only filtered city subsets; move to Pro before friends rely on the app |
| Gemini prices | Flash-Lite prices differ a lot between generations | Model ids in env vars; log real costs |

### 21.2 Competitor update (short version; full analysis in `docs/PROJECT.md`)

- **The category is crowded.** At least 20 apps turn reels into map pins. Most are indie, iOS-first and launched in 2025–2026.
- **"Plan from saves" is taken.** Rhyme (formerly Roamy) builds day-by-day plans from saved reels, has about 3.2K ratings at 4.8, and charges $9.99–$14.99 a month. Go There does saves → AI plans on iOS and Android.
- **Android isn't empty.** Go There, Reelpin and MapDreamy are there.
- **Food-only apps exist** (Korka, YK), and some sell "no subscription" as a feature.
- **Google keeps moving in.** Screenshots list in Maps, Ask Maps in the US and India, and the Gemini app can export places to a Google Maps list.
- **Trust is a weak spot for rivals.** Rhyme's reviews raise billing-transparency and support complaints.

### 21.3 What this means for how Barabula wins

- Calm UI and "finishing the loop" are still worth doing, but they are no longer reasons to pick Barabula.
- The remaining openings are narrower and more specific:
  1. **Weekly use, not just trips.** Almost everyone positions as "travel", which people do a few times a year. Saved food and going-out spots in your own city are used every week (P2).
  2. **Hard reels, done properly.** Many reels name the place only out loud or on screen. Reading your own screen recording catches those without breaking platform rules (P3).
  3. **Phone and laptop.** Capture on the phone, plan on a big screen. App-only rivals can't do this; the PWA can.
  4. **Your data stays yours.** Export to Google Maps, CSV and KML, plus "Open in Google Maps" everywhere (P4).
  5. **Shareable without an app.** A friend opens your list in a browser; no install needed (P5).
  6. **Honest pricing.** Trip Pass, clear renewal dates and one-tap cancel.

### 21.4 Proposed decisions (PROPOSED — not agreed)

Claude Code: don't build any of these until Asmeen marks them **Agreed** in this table.

| # | Proposal | Why | Roadmap change | Status |
|---|---|---|---|---|
| P1 | Meta caption extraction behind `CAPTURE_META_CAPTIONS`. Asmeen decides whether to use it during the private beta; before any public launch it stays off unless V2 is answered yes in writing. When off, Instagram/Facebook capture = embed on the review card + "Which place is this?" search + "Share a screen recording instead" | Meta's documented allowed use is showing embeds | Phase 15 adds the flag; phase 17 screen recording becomes essential for Instagram/Facebook | **Agreed** as proposed: flag on for Asmeen and friends, off before any public launch unless V2 is answered yes in writing (Asmeen, 5 Oct 2026) |
| P2 | Home city as a first-class space with a **Tonight** view: open now, near me, from my saves. No AI, no plan needed | Gives a weekly reason to open the app; most food reels are local | Phase 19 adds Tonight; metrics and kill criteria use it | **Agreed**: Tonight ships in phase 19 alongside the trips-first lead (Asmeen, 5 Oct 2026) |
| P3 | Screen recording (voice + on-screen text) as the accuracy edge; measured in phase 15 | Caption-only extraction misses reels that don't name the place; Google Maps reads screenshots, not recordings | Phase 15 adds a second eval arm; phase 17 unchanged | **Agreed**: second eval arm (15 of the 50 links as screen recordings) in phase 15 (Asmeen, 5 Oct 2026) |
| P4 | Free export and Google Maps interop: CSV, KML (imports into Google My Maps), "Open in Google Maps" per place and per day | People navigate in Google Maps; portability builds trust | Phase 16 (export, place link); phase 19 (day link) | **Agreed** as proposed (Asmeen, 5 Oct 2026) |
| P5 | Public list pages: a shared city list opens in any browser, is indexable, and has "Save to my Barabula" | The cheapest growth channel a web app has; app-only rivals need an install | After phase 18 or in phase 20 | **Agreed**: build after phase 18 (Asmeen, 5 Oct 2026) |
| P6 | Beachhead niche: Android + laptop users who save food and going-out reels in one city (start with Asmeen's own city and friends); trips are the second use | Avoids the crowded "travel reels → plan" pitch and fits P2 | FSQ load starts with the home city; default categories food/drink/cafe; copy and examples food-first | **Agreed (changed)**: beachhead is **trips-first**: Android + laptop users who save travel and food reels; home city is the second use (Tonight). Asmeen takes 6+ trips a year and retrieves saves when planning trips; saves are about half local, half travel. FSQ load: home city + upcoming trip cities (Asmeen, 5 Oct 2026) |

---

## 22. Gaps in v1.0 and how v1.1 fixes them

| # | Gap | Fix |
|---|---|---|
| 1 | Capture limit was "daily" in section 6 but "per month" in section 13 | `CAPTURE_MONTHLY_LIMIT_FREE=15` |
| 2 | Files would go through the route body and hit the serverless body limit | Signed direct upload to private Supabase Storage, deleted after processing (section 8.2, stage 7) |
| 3 | Share target needs an installed PWA, but the install prompt only appeared after the first capture | First capture by pasting a link (phase 16); then one quiet install line (phase 17) |
| 4 | `events` and `cost_log` were used but never defined | Appendix B |
| 5 | Migration assumed `public.users` exists | Check in phase 14 |
| 6 | API contract expected `creator` from Meta, which no longer returns it | Nullable; parse from embed `html` |
| 7 | Graph API version hard-coded | `META_GRAPH_VERSION` |
| 8 | Free export and delete account were promised but in no phase | Phase 16 |
| 9 | FSQ attribution wasn't in any phase | Credits screen, phase 16 |
| 10 | Usage counters could race under parallel captures | Atomic `bump_usage()` (Appendix B) |
| 11 | `capture_candidates` and uploads would grow forever | Clean-up job (Appendix B) |
| 12 | "Weekly return" kill criterion doesn't fit a travel-only app | Tied to P2, with an alternative (section 19) |
| 13 | Model names hard-coded | `GEMINI_MODEL_*`, `OPENAI_MODEL_PLAN` |
| 14 | Supabase free projects pause when idle, which would break the app for friends | Move to Pro before friends rely on it (V8) |
| 15 | Section 3.3 said "four things" and listed five | Fixed |

---

## 23. Claude Code working agreement

### 23.1 First message to paste into a new Claude Code session

```
Read CLAUDE.md, docs/HANDOVER.md and docs/PROJECT.md.
1. Summarise where we are from section 24 of the handover.
2. List any questions in section 25 that block the current phase, and ask me them.
3. Propose a GSD plan for the current phase only. Don't change code until I approve it.
```

### 23.2 How to work

- **One phase at a time.** Plan with GSD; finish the phase's "Done when"; get Asmeen's OK before the next one.
- **Small steps.** Small commits on `rebuild/saves-first`; one concern per commit; clear messages.
- **Check before trusting.** Anything marked VERIFY gets checked (or reported as unchecked) before code depends on it.
- **Measure capture.** Any change to extraction prompts, matching or models re-runs `npm run eval:capture` and reports precision, recall, p90 time and cost per link.
- **Keep budgets.** Section 4.6 performance budgets are tests, not hopes. Report when one is missed.

### 23.3 Ask Asmeen first

- Changing anything in section 1 (D1–D10) or building any P1–P6 item not marked Agreed.
- Adding a paid service, an API key, or a dependency that adds much to the Map route bundle.
- Schema changes beyond section 7 and Appendix B.
- Anything that deletes data, touches auth, or changes RLS policies.
- Anything user-visible that adds a modal, a tooltip, a fourth tab or a notification.

### 23.4 Never

- Scrape, log in as the user, or download videos from Instagram, TikTok or Facebook.
- Save a place without the user's confirmation, or apply an Ask edit without "Apply".
- Store Mapbox geocoding results.
- Commit secrets, real user data or uploaded media.
- Keep uploaded screenshots or recordings after processing.

### 23.5 End of every session

1. Update section 24 (status, date, what's next, blockers).
2. Add new questions to section 25.
3. Commit the handover with the code it describes.

---

## 24. Phase status tracker

| Phase | Status | Last updated | Notes / blockers |
|---|---|---|---|
| 14 Reset | Planning | 5 Oct 2026 | Session 1 (5 Oct): docs copied to `docs/`, `CLAUDE.md` created, repo audited. Baseline: 2 of 157 unit tests fail (`hotel-card` star rating, `api/chat` itineraryId). Q1–Q3, Q9–Q12, Q15 answered; P1–P6 agreed (P6 changed to trips-first). Phase 14 discussed: `.planning/phases/14-reset-clean-repo-per-trip-chats-cost-log-claude-md/14-CONTEXT.md` (D-01–D-24; gate = prod deploy after Asmeen's "merge"). Next: `/gsd-plan-phase 14`. Blocker for the migrations plan: Q13 (Supabase paused?) |
| 15 Capture spike | Not started | — | V1, V2, V3 shape this phase |
| 16 Saves and the map | Not started | — | |
| 17 Share from the phone | Not started | — | V11, V12 |
| 18 Plan from saves | Not started | — | |
| 19 On the trip | Not started | — | Includes Tonight (P2 agreed) |
| 20 Ask and money | Not started | — | V9, V10, V16 |

Status values: Not started · Planning · In progress · Blocked · Done (gate passed) · Done (Asmeen confirmed).

---

## 25. Open questions for Asmeen

| # | Question | Needed by | Answer |
|---|---|---|---|
| Q1 | Which GSD do we use for Barabula: the original, or Open GSD Core? Should phases 1–13 be migrated or left as history? | Phase 14 | **Open GSD Core.** Phases 1–13 stay as history (no migration); fix the STATE/ROADMAP bookkeeping once. (Asmeen, 5 Oct 2026) |
| Q2 | The repo is public. Should `.planning/` be committed, or kept local only (add to `.gitignore`)? | Phase 14 | **Local only.** Add to `.gitignore` and `git rm --cached` (files stay on disk). The 161 files already in history stay public; no history rewrite. (5 Oct 2026) |
| Q3 | Which of P1–P6 do you agree with? | Phase 14 (P6), phase 15 (P1, P3) | **All six agreed; P6 changed to trips-first** (see 21.4). Decided in a `/gsd-explore` session. (5 Oct 2026) |
| Q4 | Beachhead city for the first FSQ load and for friends testing | Phase 15 | |
| Q5 | Map tile provider for MapLibre (affects offline, V6) | Phase 16 | |
| Q6 | Is India a target market at launch, or later? (Affects FSQ coverage checks, pricing, V15, V16) | Phase 16 | |
| Q7 | Domain and app name shown when installed (PWA `name` / `short_name`) | Phase 17 | |
| Q8 | Budget ceiling per month for AI and hosting before monetisation | Phase 15 | |
| Q9 | Per-trip chat: the itinerary row is only created when the chat finishes, so `itinerary_id` is empty during intake. Key `chat_history` by a session id (`trip_sessions.id`) and set `trip_sessions.itinerary_id` on save, instead of keying chat by `itinerary_id`? `trip_sessions` also has `UNIQUE (user_id)`, which must go | Phase 14 | **Session id + itinerary link.** `chat_history.session_id` → `trip_sessions.id`; `trip_sessions.itinerary_id` set when the itinerary is saved; drop `UNIQUE (user_id)`. Agreed schema change beyond section 7. (5 Oct 2026) |
| Q10 | Old GSD phases 4 (Collaboration), 5 (AI Streaming) and 6 (Cleanup and Tests) were never run. Close 4 and 5 as dropped (D10) and fold 6 into phase 14? | Phase 14 | **Drop 4 and 5 (D10); fold 6 into phase 14.** (5 Oct 2026) |
| Q11 | Legacy items not in section 5's delete list: empty `infrastructure/`, `mobile/`, `shared/`; `Inspiration/` (7 PNGs); root `manifest.json` (Pexels image credits, not a PWA manifest); `docs/SETUP.md`. Delete, keep or move? | Phase 14 | **Delete the whole list in phase 14**, after the Q12 backup: `frontend/`, `backend/`, `mcp-server/`, `test_auth.py`, empty `infrastructure/` `mobile/` `shared/`, orphaned root `manifest.json` (lists image files that don't exist), `docs/SETUP.md`. Move `Inspiration/` PNGs to `~/barabula-legacy-backup/`. (5 Oct 2026) |
| Q12 | `frontend/.env`, `backend/.env` and `backend/barabula_dev.db` exist locally (untracked). Back them up outside the repo before deleting the folders? | Phase 14 | **Back up outside the repo first** (`~/barabula-legacy-backup/`) before deleting the folders. Contents not to be read. (5 Oct 2026) |
| Q13 | The Supabase project has had no commits since 12 March 2026; free projects pause after a week idle. Is it paused, and is a restore OK? | Phase 14 | |
| Q14 | Section 4.4 drops the sand/coral palette; the current project rule is "sand/coral, no blue". Which wins? | Phase 16 | |
| Q15 | How much of the current app code survives the revamp? | Phase 14 | **Keep the engine, replace the UI.** Keep auth, Supabase clients, the itinerary generator and itinerary components (reused in phase 18). Each phase deletes the old UI it replaces (landing, chat-as-entry, dashboard go in phase 16). Kept code must pass tests. Chosen by Claude on Asmeen's "pick whichever gives the best quality". (5 Oct 2026) |

---

## Appendix A — `CLAUDE.md` starter

Copy into the repo root as `CLAUDE.md`. Keep it short; details live in `docs/HANDOVER.md`.

```markdown
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

## Commands (confirm against package.json)
- npm run dev | npm test | npx playwright test | npm run lint
- npm run eval:capture  (created in phase 15; run after any extraction or matching change)
- Migrations live in supabase/migrations/

## Definition of done (every task)
- Tests pass; new logic has unit tests; capture changes re-run the eval.
- RLS enabled on every new table. No secrets or Mapbox data stored.
- Handover section 24 updated; new questions added to section 25.
- Small, clearly described commits on rebuild/saves-first.

## When unsure
Stop and ask Asmeen. Add the question to handover section 25.
```

---

## Appendix B — Extra SQL (`20261005000100_events_costs.sql`)

```sql
-- Product events (section 18). Written by the server only.
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.users(id) on delete cascade,   -- or auth.users, see section 7 note
  name        text not null,          -- capture_started | capture_saved | capture_failed | plan_created | today_opened | tonight_opened | ask_used | export_done
  props       jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists events_name_time_idx on public.events (name, created_at desc);
create index if not exists events_user_time_idx on public.events (user_id, created_at desc);
alter table public.events enable row level security;
-- No client policies: inserts and reads go through the service role.

-- Cost log (phase 14): one row per paid or rate-limited call.
create table if not exists public.cost_log (
  id             bigint generated always as identity primary key,
  user_id        uuid references public.users(id) on delete set null,
  route          text not null,          -- /api/capture, /api/chat/message, /api/ask ...
  model          text,
  input_tokens   int,
  output_tokens  int,
  external_calls jsonb not null default '{}',   -- {"meta_oembed":1,"tiktok_oembed":0,"fsq":2}
  est_cost_usd   numeric(10,5),
  latency_ms     int,
  created_at     timestamptz not null default now()
);
create index if not exists cost_log_time_idx on public.cost_log (created_at desc);
alter table public.cost_log enable row level security;

-- Atomic usage counter. Call from the server (service role) with the user's id.
create or replace function public.bump_usage(p_user uuid, p_kind text)
returns public.usage
language plpgsql security definer set search_path = public as $$
declare
  r public.usage;
begin
  if p_kind not in ('capture','ask') then
    raise exception 'unknown usage kind %', p_kind;
  end if;
  insert into public.usage as u (user_id, period, captures, asks)
  values (p_user, date_trunc('month', now())::date,
          (p_kind = 'capture')::int, (p_kind = 'ask')::int)
  on conflict (user_id, period) do update
    set captures = u.captures + excluded.captures,
        asks     = u.asks + excluded.asks
  returning * into r;
  return r;
end $$;
revoke all on function public.bump_usage(uuid, text) from public, anon, authenticated;

-- Clean-up (run daily; pg_cron if enabled on the project, otherwise a Vercel cron route).
-- 1. Candidates for finished sources older than 7 days.
-- delete from public.capture_candidates c
--   using public.sources s
--  where c.source_id = s.id and s.status in ('done','failed') and c.created_at < now() - interval '7 days';
-- 2. Uploaded files older than 24 h in the private 'capture-uploads' bucket: delete via the Storage API
--    from the cron route (don't delete storage.objects rows directly).
```
