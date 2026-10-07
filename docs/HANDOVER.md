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
| D1 | ~~Rebuild Barabula around **your own saved places**; the AI itinerary becomes step two~~ **Revised 5 Oct 2026 (Asmeen, Q30): Barabula is a trip planner fed by your saves.** Trips are the core object; places come in by search, paste and (later) reels; the AI plans days around your own places. Capturing a reel straight into a trip stays a feature | Plain "chat → itinerary" is crowded (Layla, Mindtrip, Google Maps' Ask Maps); pure saves-first makes the MVP depend on capture accuracy and sits in a 20+ app reels-to-map niche (Placify 2.0, released 24 Sep 2026 per the US App Store). Asmeen: the itinerary is what she would use most |
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
6. **Plain words.** Name things by what people do ("Save place", "Plan a trip"), never by how it's built. *(Refined 6 Oct 2026, phase 16 D-05: headings, statuses and moments may use an airline voice — "Now boarding: Lisbon", DELAYED — but buttons and form labels always stay plain verbs.)*
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
| Map interactive on open | ≤ 2 s — *revised 6 Oct 2026 (Asmeen, Q46), see below* |
| Place sheet open | ≤ 300 ms |
| JS shipped on Map route | ≤ 250 KB gzipped (excluding map library) — raised from 200 KB by Asmeen on 7 Oct 2026 (Q63) |

*Map budget revised 6 Oct 2026 (Asmeen, Q46, "A + C").* On the trip plan, measured on the throttled phone profile (slow 4G 1.6 Mbps/150 ms + 4x CPU, `e2e/budgets.spec.ts`): **board (title and rows painted) ≤ 2 s**; **map interactive ≤ 9.5 s** on slow 4G (the worst of 3 runs after the byte cuts, 9,364 ms, rounded up to the next 500 ms; it was ~10.5–11.4 s before); JS budget unchanged. The 2 s limit no longer applies to the map on slow 4G.

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
| Geocoding | Done (phase 14) | Server route, Nominatim only, OSM coordinates tagged `geo_source`; the commercial geocoder is removed |
| Enrichment | Done | Unsplash/Pexels images; Foursquare v3 ratings (`src/lib/places.ts`) |
| Sharing | Done | `itineraries.is_public` + anon RLS policies |
| Chat sessions | Done (phase 14) | Per-trip sessions (`trip_sessions.id`, `chat_history.session_id`) |
| Collaboration, streaming | Not started | Out of scope (D10) |
| Legacy code | Removed (phase 14) | `frontend/` (CRA), `backend/` (FastAPI), `mcp-server/`, `test_auth.py` deleted; README rewritten |
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
- [x] Branch `rebuild/saves-first`
- [x] Delete `frontend/`, `backend/`, `mcp-server/`, `test_auth.py`; rewrite README
- [x] Update dependencies; `npm test` green (TypeScript 7 / ESLint 10 tried and reverted, Q22)
- [x] Per-trip chat: add `itinerary_id` to `trip_sessions` and `chat_history`; update routes (built as Q9 says: `chat_history.session_id` plus `trip_sessions.itinerary_id`)
- [x] Stop storing Mapbox coordinates; add a `cost_log` (route, model, tokens, external calls)
- [x] *(v1.1)* `CLAUDE.md` from Appendix A; `.env.example` with names only (section 6)
- [x] *(v1.1)* Migration `20261005000100_events_costs.sql` from Appendix B (`events`, `cost_log`; `bump_usage` moved to phase 15). Applied to the live project on 5 Oct 2026 (plan 14-15)
- [x] *(v1.1)* Confirm whether `public.users` exists; fix the section 7 references if not (it exists on the live DB, Q26)
- **Done when:** app deploys; two trips can be planned side by side; no Mapbox results stored
  - [x] App deploys (production Ready on 5 Oct 2026, plan 14-16)
  - [ ] Two trips side by side: deferred to the AI phase (OpenRouter), blocked by the invalid OpenAI key (Q28)
  - [x] No Mapbox results stored (0 non-OSM coordinates on the live DB; map tagging not yet exercised in production)

### Phase 15 — Capture spike (1–2 weekends)
- [ ] Test set: 50 real links (mix of Instagram, TikTok, Facebook) with the correct places written down in `tests/fixtures/capture.json`
- [ ] Migration from section 7 (places, sources, capture_candidates, usage)
- [ ] Add `bump_usage` (moved from Appendix B, D-25); name the migration with a timestamp after `20261005000100`
- [ ] Load FSQ OS Places for 2–3 test cities
- [ ] `/api/capture` stages 1–5 (links only)
- [ ] Script `npm run eval:capture` → precision, recall, p90 time, cost per link
- [ ] *(v1.1)* Tag each fixture with where the place name appears: `caption`, `on_screen`, `spoken`, `not_named`. Report accuracy per tag
- [ ] *(v1.1, if P3)* Second eval arm: 15 of the links as your own screen recordings through Gemini; compare with the caption arm
- [ ] *(v1.1)* Write down the V2 answer (Meta terms) before any phase builds on Meta captions
- **Gate:** ≥ 70% of places correct; p90 ≤ 10 s. If not, build the fallback ladder and re-test before going on

### Phase 16 — Saves and the map (2 weekends) — RE-SHAPED 5 Oct 2026 (Q31): now "Trips and the planner UI"; the saves items below move to phase 16.2. See .planning/ROADMAP.md
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
| 14 Reset | Done (Asmeen confirmed) | 5 Oct 2026 | **Gate result (5 Oct 2026, plan 14-16):** closed by Asmeen ("Close, chat check deferred"); not marked as gate passed, because one check is deferred. PR #3 merged `rebuild/saves-first` into `main` (merge commit `1c3b23d`); production deployment `dpl_F71wUcbTorxvGw3Z5k3rCKFotYrr` Ready at https://barabula.vercel.app (Node 24.x). App deploys ✓ (smoke: `/login` 200, `/` 200, `/dashboard` and `/chat` logged out → 307 `/login`); auth proxy ✓; no Mapbox results stored ✓ (0 activities with non-OSM coordinates, but 0 of 106 activities have coordinates yet, so map tagging is not yet exercised in production); `cost_log` ✓ (production requests wrote rows with route `/api/chat/message` and `external_calls` `{"openai":1}`; model, tokens and cost empty because the OpenAI call failed); 0 `chat_history` rows without `session_id`. **Two trips side by side: DEFERRED.** Every production `POST /api/chat/message` returned 500 because the `OPENAI_API_KEY` in Vercel is invalid (OpenAI `401 invalid_api_key`), not a phase 14 code defect. Asmeen moved AI to a later phase on OpenRouter with her own credentials; this check moves to that phase's gate (Q28). Session 1 (5 Oct): docs copied to `docs/`, `CLAUDE.md` created, repo audited; phase 14 discussed in `.planning/phases/14-reset-clean-repo-per-trip-chats-cost-log-claude-md/14-CONTEXT.md` (D-01–D-28; gate = prod deploy after Asmeen's "merge"). Done on `rebuild/saves-first` (plans 14-01 to 14-12): 01 branch, `.planning/` local only; 02 legacy stacks deleted after a backup, README and `.env.example` rewritten (names only); 03 baseline green (the 2 failing tests fixed), `npm run lint` runs `eslint .` on a flat config, react-hooks errors left for Q16; 04 dependencies on newest in-range versions, openai 7, Node 24 engines; 05 @supabase/ssr 0.12, auth proxy moved to `src/proxy.ts` (Next ignores a root `proxy.ts` when the app is in `src/app`), Vitest 5; 06 commercial geocoder removed, server-side Nominatim geocoding with OSM attribution; 07 migrations authored and tested on a local DB only: baseline, per-trip chat, `events` + `cost_log`; 08–09 per-trip chat routes and page, "Plan a new trip" keeps old chats, In progress list, Continue planning; 10–11 `cost_log` row for every request with external calls; 12 TypeScript 7 / ESLint 10 tried and reverted (Q22), docs updated; 13 live DB checked (Q13, Q26, Q27): project ACTIVE_HEALTHY, CLI linked; backups taken outside the repo on 5 Oct 2026: `~/barabula-legacy-backup/db/2026-10-05-schema.sql` (9,708 B), `-data.sql` (122,973 B), `-roles.sql` (297 B); remote migration history has only `20260311000000` and `20260312000000`; no remote `trip_sessions` unique constraint (the table is missing on the live DB), so the catch-up migration `20261005000010_catch_up_live.sql` (commit 4056929, tested locally) creates it. **Plan 15 sequence (supersedes plan 15's own repair list):** `migration repair --status applied 20260310000000` only (the baseline; nothing else), then `db push` applies `20260312100000`, `20261005000010`, `20261005000050`, `20261005000100`; 15 migrations pushed to the live DB on 5 Oct 2026 (Asmeen approved the repair and the push): live check before the push found `on_auth_user_created` already on `auth.users`, so the catch-up guard skipped it; `migration repair --status applied 20260310000000` (that version only); `db push` applied exactly `20260312100000`, `20261005000010`, `20261005000050`, `20261005000100`; `migration list` now shows all 7 versions on Local and Remote. Backfill: 2 users with chat got 2 sessions, all 14 chat rows have a `session_id` (0 null), 0 sessions linked to an itinerary (the new sessions have no destination or finished phase, as expected). Read-only post-push check: `trip_sessions` has RLS, `itinerary_id`, no UNIQUE (user_id), the partial unique index on `itinerary_id` and `trip_sessions_user_updated_idx`; `itineraries.is_public` and both anon policies exist; `events` and `cost_log` have RLS on and no policies; both chat policies have WITH CHECK; exactly one trigger on `auth.users` (`on_auth_user_created`); RLS on for every public table. CLI note: the CLI's temporary login role fails on this project (`permission denied to alter role "cli_login_postgres"`), so remote CLI commands need the DB password; Asmeen keeps it in `~/.config/barabula/db.env` (chmod 600, outside the repo; run `source ~/.config/barabula/db.env && npx supabase ...`). **Live chat on the old `main` code is broken until the merge (D-22):** its upsert relied on the dropped UNIQUE (user_id). Tests: 33 files, 300 passed. `npx eslint .`: 4 errors, all Q16. `npm audit`: 45 findings, the direct ones need majors planned for phase 16. Merge and production gate: plan 16 (see the gate result at the start of this row). |
| 15 Capture spike | Not started | — | V1, V2, V3 shape this phase. Runs after phase 16 (Q29) |
| 16 Trips and the planner UI (was Saves and the map) | Done (UAT passed) | 7 Oct 2026 | Re-shaped (Q30, Q31). Done: research rounds 1–2 (`.planning/research/16-design-direction/DESIGN-RESEARCH.md`), `PRODUCT.md`, D1 revised, mockups (`.planning/sketches/16-directions/`), direction Gate Board + photo passes (Q38), **discuss-phase complete: `.planning/phases/16-trips-and-the-planner-ui/16-CONTEXT.md` (D-01–D-37)**. Next: `/gsd-ui-phase 16` (UI-SPEC), then `/gsd-plan-phase 16`. **Migration 20261006000000 pushed 6 Oct 2026 (Asmeen OK, plan 16-04):** dry-run listed only `20261006000000_activities_position_maybe.sql`; backups taken first, outside the repo: `~/barabula-legacy-backup/db/2026-10-06-pre-p16-schema.sql` (15,417 B) and `-pre-p16-data.sql` (131,698 B). Read-only checks: position double precision, day_number nullable, index `activities_itinerary_day_position_idx` present, 0 null positions (106 activities, 0 duplicate positions within a day), RLS on, both policies ("Users can manage own activities", "Activities of public itineraries are viewable by anyone"); `migration list` shows all 8 versions on Local and Remote. **Tracer done (plan 16-05, 6 Oct 2026):** plan route JS 142.5 KB gzip (145,941 B, excl. MapLibre; budget 200 KB, met), map interactive 11,342 ms on throttled phone (slow 4G 1.6 Mbps/150 ms + 4x CPU; budget 2,000 ms, **not met**, see Q46). Same build: 1,796 ms unthrottled, 2,069 ms CPU-only, 10,369 ms network-only. **After Q46 (A + C, 6 Oct 2026):** JS 143.3 KB gzip (146,729 B); board painted 1.27–1.37 s (budget 2 s, met); map 9,234–9,364 ms over 3 runs (new slow-4G limit 9,500 ms, met); hydration ~2.2 s logged (Q50). **Plan 16-06 done (6 Oct 2026):** departure-board rows (# · place · walk · status, NEXT/LATER/VISITED/MAYBE chips), header strip + WHEN/WHO/INTO ticket row, keyboard day tabs, laptop day header rows, phone Expand map / Show list, empty states, three-tab shell (phone tab bar, laptop top-bar tabs, inner back button), traced SVG wordmark, trip-not-found page. Budgets after 16-06: JS 150.8 KB gzip (154,376 B), board painted 1,188 ms, map 8,664 ms (all met). Walk column raised as Q51. **Plan 16-07 done (7 Oct 2026):** place ticket opens inline under its row (one at a time, Escape closes; DAY · STOP · FROM PREV · AREA, note, fixed time, Open in Google Maps), Mark visited / Mark not visited persists `extra_data.visited` through a hardened `PATCH /api/activities/[id]` (JSON only, zod allow-list, geo cache cleared on location change, generic errors), DELAYED · Couldn't save. Retry line + "Not saved yet" on failure, one polite live region, offline banner that pauses edits. Budgets after 16-07: JS 152.9 KB gzip (156,587 B), board painted 1,172 ms, map 8,681 ms (all met). **Plan 16-08 done (7 Oct 2026):** curated photo pipeline with Lisbon only (D-42): manifest (`src/lib/photos/manifest.ts`) with Dale Cruse, CC BY 4.0, Commons file page verified through the Commons API; `scripts/photos/encode.mjs` (SVT-AV1 AVIF + sharp WebP + 8 px blur); Lisbon AVIF l 216,807 B / m 83,448 B / p 142,228 B; server-side `photoFor`; PassCover with the styled CSS/SVG city-map cover for every other city; the plan header strip now shows the cover, with "Photo: Dale Cruse, CC BY 4.0" under the ticket row. The header photo waits for the map (Q52). Budgets after 16-08: JS 155.1 KB gzip (158,806 B), board painted 1,204 ms, map 8,719 ms (all met). **Plan 16-09 done (7 Oct 2026):** row "⋯" menu (Actions for {Place}: Move to day… submenu with Day 1…n and Maybe, Move up, Move down, Move to Maybe / Move to a day…, Edit place (off until 16-11), Remove from trip) in the ticket and as a laptop row button; one PATCH `{ day_number, position }` per move with fractional positions (renumbered when the gap is too small); one Undo toast for 10 s (Base UI Toast, commits on close / next action / pagehide); Remove from trip hides the place and sends the DELETE only when the toast closes (keepalive on pagehide), a failed delete brings it back with DELAYED. `DELETE /api/activities/[id]` hardened (uuid, RLS, 404). Base UI Menu and Toast load on first use (they put the route at 221,394 B). Budgets after 16-09: JS 157.8 KB gzip (161,557 B, met); best 3-run set board painted 1,260–1,284 ms and map 8,831–9,308 ms (met), but other runs on a loaded machine (load average ~27) went over the timing limits, and so did the pre-16-09 build (Q54). **Budget spec now asserts the median of 3 cold runs (Q54, 7 Oct 2026); limits unchanged.** **Plan 16-10 done (7 Oct 2026):** the old landing at `/` is replaced by the new home: the blank "next trip" pass with a server-picked random curated cover (Lisbon is the only curated city so far), one question at a time (Where to? → When? → Who's going? → What are you into?) with progress dots, Back, Skip, stamp lines TO/WHEN/WHO/INTO with Edit, "Your pass is ready.", and Start planning as soon as one city is set. `POST /api/itineraries` now takes only the pass as JSON (strict zod: 1–10 stops, 30-day cap, adults 1–20, kids 0–20, chip allow-list, note ≤ 5,000) and is idempotent per `client_ref`; it stores `extra_data.pass` and `day_count`. First visit (logged out or no trips): the pass, "Fill the pass to plan your first trip." and What Barabula does (SAVE · PLAN · GO, SAVE marked SOON). Logged-out Start planning goes to /login until 16-15. Budgets after 16-10 (median of 3): JS 156.7 KB gzip (160,472 B), board painted 1,244 ms, map 8,769 ms (all met). New question Q55. **Plan 16-11 done (7 Oct 2026):** Add place by hand (D-18): accent FAB on phone / sticky accent bar on laptop opens the place form (Drawer sheet on phone, inline in the list on laptop; Place name, Day 1…n or Maybe, Address or area, Set time switch + Time, Note; Add place / Don't add). The place shows at once, `POST /api/activities` (strict zod, ownership check, server position at the end of the day or Maybe) saves it, and the toast reads "Added to day {n}, after {Place}" / "Added to day {n}" / "Added to Maybe" with Undo (deletes it). Edit place in the row menu (Save place / Discard changes, one PATCH of what changed, no Undo). Map lookups stay the server-side Nominatim path: batch on open after the map is ready, single lookup after add / address change and for the new owner-only "Find on map" (`POST /api/activities/[id]/geocode`, cost_log row per lookup). Rows read "Finding on map…" or NOT ON MAP; after a failed retry the ticket says "Still not on map. Add an address with Edit place." `NOMINATIM_DISABLED=1` kill switch, set for the e2e server. The form loads on first use. Budgets after 16-11 (median of 3): JS 159.6 KB gzip (163,457 B), board painted 1,236 ms, map 9,174 ms (all met). New question Q56. **Plan 16-12 done (7 Oct 2026):** the Trips home now shows the user's trips, computed for their own calendar day (the head script writes a `tz` cookie; UTC on the very first visit). Order: during a trip the NOW pass sits above the blank pass, otherwise the blank pass then the NEXT TRIP pass (soonest dated trip, else the most recently edited undated one). Cover status lines: Now boarding: {City} · Day {n} of {m} · Gate closes tomorrow · Gate closes in {n} days · Departs in {n} days · Dates not set; "Next: {Place}" during a trip. Upcoming passes (WHEN · DAYS · PLACES · STATUS, 3 then "All upcoming ({n})"), the still Past pile ("Past trips · {n}", latest 6 then "Show all past trips") and the Create a new trip tile (Fill the pass). Laptop pairs the blank and Now/Next passes. Budgets after 16-12 (median of 3): JS 161.2 KB gzip (165,074 B), board painted 1,300 ms, map 8,860 ms (all met). New question Q57. **Plan 16-13 done (7 Oct 2026):** "Or describe your whole trip" under Where to? swaps the question card for the describe box: a textarea (3 rows growing to 6, no length limit), "Try" with the 4 UI-SPEC examples, a live TO / WHEN / WHO / INTO preview (missing parts "we'll ask") and Use this, which fills the pass and opens the first open question; "Step by step instead" goes back with nothing lost. Reading is plain keywords in the browser, no AI (`src/lib/pass/describe.ts`): cities only from a known list (curated cities + ~135 hand-written well-known city names and aliases, ambiguous words like Nice, Split, Reading left out), so a city is never invented; lengths, date ranges (placed on or after the user's today), months, people, interests. No city: TO reads ANYWHERE? and, since no curated city has verified climate tags yet, the line "Name a city and we'll fill in the rest." New question Q58. **Plan 16-14 done (7 Oct 2026):** drag and drop on top of the menu moves (D-22). Phone: long-press a row (250 ms, 5 px) and drop it among the day's rows or on a day tab (appends to that day). Laptop: a grip handle ("Drag {Place} to reorder") replaces the # on row hover or focus; day headers and MAYBE are drop targets. Keyboard: Space/Enter on the grip, arrows, Space/Enter to drop, Escape to cancel. A drop is the same single PATCH `{ day_number, position }` as a menu move, with the Undo toast; dnd-kit announces in place words ("Picked up {Place}, day {n}, stop {m}.", "{Place} moved to day {n}, position {m}.", "Move cancelled. …") and the drag's toast is not read out a second time. The drag code loads on idle after the map is up, only while online, and binds through `@dnd-kit/dom` directly (the React adapter cost ~3.3 KB and put the route at 205,319 B). Budgets after 16-14 (median of 3, drag chunk counted): JS 198.2 KB gzip (202,951 B), board painted 1,332 ms, map 9,304 ms (all met). New questions Q59, Q60. **Plan 16-15 done (7 Oct 2026):** sign-in at Start planning (D-19, D-41). Logged out, Start planning keeps the answers on the device (`localStorage` key `barabula-pending-pass`, `{ v: 1, savedAt, pass, clientRef }`, 24 h, re-checked with the create schema when read) and asks the user to sign in: a bottom sheet on phone, an inline panel in the pass on laptop ("Check in to save your trip", "Your answers stay on the pass.", Continue with Google, Use email instead, Back to the pass). Right after sign-in the home creates the trip once from the kept answers (same `client_ref`, so a retry never makes a second trip), clears them and opens the plan. Back on the pass without signing in: the answers are shown again with DELAYED · Sign-in didn't finish. Your answers are kept. Retry sign-in. Email sign-in and sign-up now land on `/` instead of `/dashboard`; the Google redirect URL, the auth callback, the proxy and RLS are unchanged. Clearing on sign-out comes with the You tab (16-19). Plan route not touched (sign-in code loads on first use on the home only). New question Q61. **16-21 (7 Oct 2026):** curated photos grew from Lisbon to 40 cities plus 40 countries (69 country photos: default, beach when interests include Beaches, approved season variants). Files per photo cut to laptop AVIF, phone AVIF and phone WebP (Asmeen's size-gate answer E; Lisbon trimmed too); 34.9 MB of photo files now (net +33.95 MB on `public/images/` since the plan started). Covers resolve city photo → country photo (GeoNames `cities15000` lookup, trimmed to 972,671 B, server-only) → map cover. Climate tags are live, so Cities that fit now suggests real matches. GeoNames credit is in `dataCredits()` for the 16-19 credits page. New question Q62. **16-16 (7 Oct 2026):** the plan map now shows numbered tag pins (yellow, Geist Mono number, ink ring; visited = slate with a check; selected = 1.15 with an outline), drawn on demand through MapLibre's missing-image resolver after the font loads. The selected day's route is a 4 px yellow line (light theme adds a 7 px ink casing); places without coordinates are skipped. On laptop other days' pins are dimmed; hovering a row grows its pin and hovering a pin washes its row; tapping a pin opens that place's ticket. Maybe places are not pinned on the plan map (they go on Places, 16-18). Budgets (median of 3): JS 204,762 B (limit 204,800), board 1,324 ms, map 9,299 ms. New question Q63. **16-17 (7 Oct 2026):** route JS limit raised to 256,000 B (Q63). Trip details are editable from the plan header (D-20): the city strip and the WHEN / WHO / INTO cells open that one question (phone sheet, laptop inline under the ticket row) with Save / Cancel and a "Trip details saved" Undo toast; `PATCH /api/itineraries/[id]` is now strict (TripPatchSchema: dates as a pair with the 30-day cap, extra_data only `pass` and `day_count`, `is_public` not writable, generic errors). A shorter WHEN first moves the places on removed days to Maybe ("{n} places moved to Maybe", one Undo for places and dates). Undated trips get "+ DAY". Delete trip (D-27) is in the trip "⋯" menu (Trip actions → Delete trip): back to Trips, the pass hides, "Deleted your {City} trip" with Undo for 10 s, no dialog; the DELETE goes out only when the Undo window ends (keepalive on page leave); a failure brings the trip back with DELAYED · Couldn't delete {City}. It's back on your list. Retry. Budgets (median of 3): JS 208,457 B (limit 256,000), board 1,332 ms, map 9,387 ms. New question Q64. **16-18 (7 Oct 2026):** the Places tab (D-28) at `/places`: every place across the user's trips (auth-guarded server page, RLS read with a `user_id` guard). Phone: map between the top bar and the tab bar, search ("Search your places") and a filter row floating on it (All trips · All / To visit / Visited · All types, only types in the data), and a non-modal list sheet that snaps 148 px / 50% / 92% and cannot be swiped away. Laptop: a 400 px list panel beside the map. List grouped by trip (trip colour dot + title), one line per place, NOT ON MAP for places without coordinates, "1 place" / "{n} places". Tapping a row or pin opens the small card (name, {type} · {area}, {Trip} · Day {n} / Maybe, Visited switch, Open in Google Maps, Open trip); phone shows it in the sheet at 50% with a back arrow, laptop inline under the row. Map: one clustered source, pins in six trip colours (no blue) with a 2 px ring, visited hollow, ink cluster discs 32/40/48 px with Geist Mono counts; tap a cluster to zoom in. Empty, no-results and load-error states use the UI-SPEC copy. Trips being deleted leave the tab during the Undo window. Plan route untouched. New question Q65. **16-19 (7 Oct 2026):** the You tab (D-29) at `/you`: passenger card (Google avatar or initials, PASSENGER + name, TRIPS {n} · HOME {city or —}) and Settings: Appearance System · Light · Dark (device-stored `barabula-theme`, applied at once; System follows the OS live on every page through ThemeSync; both maps swap Positron / Dark live and the plan pins survive the swap, so assumption A1 holds without a workaround), Home city (saved to the user's own `user_metadata.home_city` through the browser auth client's updateUser, D-43; no table or column; suggestions from the curated city names), Haptics (device-stored `barabula-haptics`, on by default; `vibrate()` is used by 16-20/16-22), Credits & attributions (`/you/credits`: one line per city and country photo from the manifests with licence and source links, GeoNames CC BY 4.0, OpenStreetMap, OpenFreeMap © OpenMapTiles, Nominatim, app version), Sign out (clears `barabula-pending-pass`, then signs out and goes to /), and "Barabula {version}". Export and delete account not shown (16.2). Login and register restyled to the tokens (Google primary, email form below; same server actions, ids and names). Budgets (median of 3): JS 209,410 B (limit 256,000), board 1,320 ms, map 8,999 ms. New question Q66. **16-20 (7 Oct 2026):** motion, first half (D-30–D-32). Split-flap text (A–Z and space, 9 × 34 ms; the real text in `aria-label`, glyphs `aria-hidden`; final text at once under reduced motion). Moment 1 "pass prints itself": a new stamp line rises 8 px and fades in (240 ms) and its value flips; a new city's photo crossfades in (450 ms, once loaded) and the title flips; `vibrate(8)` on a city pick when Haptics is on. Moment 3 "day switch": the day's date and first 6 names flip (240 ms, 40 ms stagger), walk and status cells flip in (260 ms), the map fits the day over 600 ms; all instant under reduced motion. The Now/Next title flips once per browser session (`sessionStorage` `barabula-nownext-flap`). LOADING… board row after 300 ms, kept ≥ 400 ms: over a tapped pass while its plan opens, and LOADING MAP… over both maps until they load. Laptop plane cursor beside the real cursor on the home blank pass only (lazy, mouse/trackpad only, off under reduced motion). Motion runs through LazyMotion strict + `reducedMotion="user"` in the (app) tree; the plan route's flips are CSS, because Motion on the board put the route at 260,861 B (over the limit), and Motion's features load only where a screen asks (the home pass). Budgets (median of 3): JS 223,974 B (limit 256,000), board 1,300 ms, map 9,160 ms. New question Q67. **16-22 (7 Oct 2026):** motion, second half (D-30). Moment 2 "place lands in plan": the new row slides from the place form to its slot (380 ms), its name flips from 200 ms, and it keeps a lit wash (accent 18%) for 6 s; `vibrate(12)` when Haptics is on. When the place is first found on the map, the map eases to its day (600 ms), its pin drops with one small bounce and a pulse ring, then the route draws on to it (400 ms) and the normal map pin takes over. Moment 4 "trip opens from its pass": the pass cover morphs into the plan header strip (React ViewTransition `trip-cover-{id}`, 480 ms), the list under it fades in 210 ms later; Start planning uses the same morph. Reduced motion: the row and pin fade in over 150 ms, no ring, route complete, no view transitions. All CSS / Web Animations on the plan route (no Motion runtime). Budgets (median of 3): JS 226,342 B (limit 256,000), board 1,280 ms, map 9,091 ms. New question Q68. **16-23 (7 Oct 2026):** old UI deleted (D-36, D-39): `src/app/(authenticated)/` (chat, dashboard, layout), `src/components/{landing,chat,dashboard,itinerary,ui}/`, `src/lib/landing/prompt-store.ts`, old hero and destination JPGs, 19 old UI tests (85 files). Engine kept for 16.1: `src/lib/ai/*`, every `src/app/api/**` route and its tests, `unsplash.ts`, `places.ts`, `cost-log.ts`; `FlightInputData`/`HotelSaveData` moved to `src/lib/ai/input-types.ts`. `Activity` in `src/lib/types.ts` now has `day_number: number **Phase complete (7 Oct 2026):** verification passed 12/12; UAT 5/5 run by Claude with Playwright on the local stack at Asmeen's request (signed-in home 1.56 s on a mid-Android 4G proxy); UAT fixes in f09d9d5 (phone Add place footer bar, no repeated home photo, stronger pass scrim so titles keep >= 3:1 on all 108 photos, Places chip fade); arrival-board flip on home load and typed-only city list (b18f8ef). PR #4 still a draft. | null` and `position`. `next.config.ts`: `/dashboard` and `/chat` redirect to `/` (not permanent); image `remotePatterns` removed (no `next/image` left). Proxy unchanged. `npm run lint` 0 errors (Q16 resolved). Budgets (median of 3): JS 226,359 B, board 1,264 ms, map 9,005 ms. **16-24 (7 Oct 2026), phase proof:** status "In progress — verification" until Asmeen's device check; then Done (Asmeen confirmed). Shipped in phase 16: Trips home with photo passes (blank pass, Now/Next, upcoming, past, create), the trip plan (board + map, tickets, add/edit/move/drag, visited, delete with Undo, trip details), Places (filters, search, card, clustered map), You (theme, home city, haptics, credits, sign out), the four signature motion moments, and the old UI deleted. Curated photos: 40 cities and 69 country photos (40 countries), approved by Asmeen (16-21). **Measured on the throttled phone (slow 4G 1.6 Mbps/150 ms + 4x CPU, median of 3, Mac load average 8–22):** plan route JS 226,361 B gzip (221.1 KB, limit 256,000 B); board painted 1,272–1,592 ms (limit 2,000); plan map median 8,984 / 9,389 ms at load ~8, 9,721 / 9,979 ms at load 13–22 and 9,476 ms on the final build (limit 9,500; plan code and JS unchanged from 16-23, so the misses are the busy Mac, Q54); place ticket open 9–18 ms and Places card open 13–14 ms (limit 300); Places route JS 253,894 B gzip (247.9 KB); Places map 7,932–8,379 ms (held to 9,500, Q70); home LCP logged out 1,692–2,264 ms (limit 2,500); **home LCP signed in 2,840–3,420 ms and home JS 286,539 / 295,706 B gzip are over (Q69)**. Accessibility: axe (WCAG 2.0 A/AA, 2.1 AA) finds 0 violations on home (logged out and signed in, also with a city picked), plan with a ticket open, Places with a card open, You, credits and login, in light and dark, on phone and laptop (28 screen checks). Fixed: split-flap text no longer puts `aria-label` on a plain span (ARIA 1.2). Theme is set before first paint (data-theme right at DOMContentLoaded for dark, light and both stored overrides). 200% zoom (640x400): no sideways scroll on home, plan and Places; the primary action stays reachable. Gate: Vitest 1,279 passed, tsc clean, lint 0 errors, build passes; e2e phone + laptop 168 passed, 12 skipped (device-gated), and the 2 home.spec failures in that run came from a reverted LCP experiment (both pass on the final build); budgets spec red on Q69 (and on the plan map when the Mac is busy, Q54). Left open: Q69, Q70, Q71 and Asmeen's real-device check. |
| 16.1 AI on OpenRouter | Discussed (context gathered 6 Oct 2026) | — | Absorbs 18 (Q31). `.planning/phases/16.1-ai-on-openrouter-inserted-2026-10-05/16.1-CONTEXT.md` D-01–D-29; next: plan with research |
| 16.2 Places and saves | Not started | — | Old phase 16 saves scope (Q31) |
| 17 Share from the phone | Not started | — | V11, V12 |
| 18 Plan from saves | Folded into 16.1 | 5 Oct 2026 | Q31 |
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
| Q5 | Map tile provider for MapLibre (affects offline, V6) | Phase 16 | **Online: OpenFreeMap** (Positron in light, Dark in dark), per 16-CONTEXT D-03 (Asmeen, 6 Oct 2026); built in phase 16 (plan and Places maps). Offline trips (V6) are still open and are decided in phase 19 (see Q33). |
| Q6 | Is India a target market at launch, or later? (Affects FSQ coverage checks, pricing, V15, V16) | Phase 16 | |
| Q7 | Domain and app name shown when installed (PWA `name` / `short_name`) | Phase 17 | |
| Q8 | Budget ceiling per month for AI and hosting before monetisation | Phase 15 | **AI part decided (Asmeen, 6 Oct 2026, 16.1-CONTEXT D-12):** credit limit on the OpenRouter key (amount set by Asmeen in OpenRouter) plus an app-side monthly check on `cost_log` that shows "AI PAUSED". Hosting ceiling still open. |
| Q9 | Per-trip chat: the itinerary row is only created when the chat finishes, so `itinerary_id` is empty during intake. Key `chat_history` by a session id (`trip_sessions.id`) and set `trip_sessions.itinerary_id` on save, instead of keying chat by `itinerary_id`? `trip_sessions` also has `UNIQUE (user_id)`, which must go | Phase 14 | **Session id + itinerary link.** `chat_history.session_id` → `trip_sessions.id`; `trip_sessions.itinerary_id` set when the itinerary is saved; drop `UNIQUE (user_id)`. Agreed schema change beyond section 7. (5 Oct 2026) |
| Q10 | Old GSD phases 4 (Collaboration), 5 (AI Streaming) and 6 (Cleanup and Tests) were never run. Close 4 and 5 as dropped (D10) and fold 6 into phase 14? | Phase 14 | **Drop 4 and 5 (D10); fold 6 into phase 14.** (5 Oct 2026) |
| Q11 | Legacy items not in section 5's delete list: empty `infrastructure/`, `mobile/`, `shared/`; `Inspiration/` (7 PNGs); root `manifest.json` (Pexels image credits, not a PWA manifest); `docs/SETUP.md`. Delete, keep or move? | Phase 14 | **Delete the whole list in phase 14**, after the Q12 backup: `frontend/`, `backend/`, `mcp-server/`, `test_auth.py`, empty `infrastructure/` `mobile/` `shared/`, orphaned root `manifest.json` (lists image files that don't exist), `docs/SETUP.md`. Move `Inspiration/` PNGs to `~/barabula-legacy-backup/`. (5 Oct 2026) |
| Q12 | `frontend/.env`, `backend/.env` and `backend/barabula_dev.db` exist locally (untracked). Back them up outside the repo before deleting the folders? | Phase 14 | **Back up outside the repo first** (`~/barabula-legacy-backup/`) before deleting the folders. Contents not to be read. (5 Oct 2026) |
| Q13 | The Supabase project has had no commits since 12 March 2026; free projects pause after a week idle. Is it paused, and is a restore OK? | Phase 14 | 2026-10-05: ACTIVE_HEALTHY per `supabase projects list`; Asmeen logged in and linked the CLI (whether it had been paused: not stated) |
| Q14 | Section 4.4 drops the sand/coral palette; the current project rule is "sand/coral, no blue". Which wins? | Phase 16 || **Resolved for the Gate Board direction (Asmeen, 6 Oct 2026):** new system with Tag yellow accent (`#F2A900`/`#FFC233`), real light ("airport daylight") and dark themes; sand/coral retired. See `16-CONTEXT.md` D-02, D-03. |
| Q15 | How much of the current app code survives the revamp? | Phase 14 | **Keep the engine, replace the UI.** Keep auth, Supabase clients, the itinerary generator and itinerary components (reused in phase 18). Each phase deletes the old UI it replaces (landing, chat-as-entry, dashboard go in phase 16). Kept code must pass tests. Chosen by Claude on Asmeen's "pick whichever gives the best quality". (5 Oct 2026) **Phase 16 (D-39):** old itinerary UI components deleted; engine (`src/lib/ai`, API routes, `src/lib/unsplash.ts`, `places.ts`, `cost-log.ts`) kept. `FlightInputData`/`HotelSaveData` moved to `src/lib/ai/input-types.ts` (plan 16-23, 7 Oct 2026) |
| Q16 | react-hooks lint errors left in UI that phase 16 replaces (D-28): fix earlier or let phase 16 delete them? `npx eslint .` reports 4 errors, all in old UI (was 5; plan 14-06 removed the old geocoding effect): `src/app/(authenticated)/itinerary/[id]/page.tsx:147` react-hooks/set-state-in-effect; `src/app/(authenticated)/itinerary/[id]/page.tsx:405` react-hooks/preserve-manual-memoization; `src/components/chat/ContextPanel.tsx:57` react-hooks/set-state-in-effect; `src/components/landing/VideoHero.tsx:59` react-hooks/set-state-in-effect | Phase 16 | **Resolved (phase 16): the old UI holding the errors was deleted** (16-CONTEXT D-36, plan 16-23, 7 Oct 2026). `npm run lint` now reports 0 errors. |
| Q17 | Which contact goes in the Nominatim User-Agent? (The policy requires an identifying User-Agent; the old `contact@barabula.app` may not be monitored.) | Phase 14 | **repo-url (Recommended):** `Barabula/<version from package.json> (+https://github.com/asmeenray/barabula)`. (Asmeen, 5 Oct 2026) |
| Q18 | Share viewers (`?share=true`) cannot open the map: the hero hides the Show Map button in share mode. The page now shows share viewers only cached OSM pins and never geocodes. Show the map toggle to share viewers? | Phase 16 | **Still open.** Phase 16 does not touch the share view: logged-out share links stay broken this phase (16-CONTEXT D-40, Q45). Answer together with Q45 in the phase that fixes sharing. |
| Q19 | Phase 15 migration must use a timestamp after `20261005000100`; also drop the section 7 line that adds `chat_history.itinerary_id`, which contradicts Q9 (chat is keyed by `session_id`) | Phase 15 | |
| Q20 | Old QUAL-05 and QUAL-06 (Vitest coverage of auth/RLS helpers; Playwright E2E) came with folded phase 6 but no decision covers them: drop, or move to a later phase? | Phase 15 | |
| Q21 | Shared itinerary links may fail for anonymous viewers because the proxy (`src/proxy.ts`) redirects `/api/*` to /login (only `/itinerary/...?share=true` pages are public). Fix later (touches auth)? | Phase 16 | **Still open.** Same gap as Q18 and Q45: the proxy and the plan page both send anonymous viewers to /login (16-CONTEXT D-40). Touches auth, so it needs Asmeen's OK in the phase that fixes sharing. |
| Q22 | TypeScript 7 + ESLint 10 (D-18 #4): land them now? | Phase 14 | **Tried and reverted (5 Oct 2026, plan 14-12).** `npm install -D typescript@^7 eslint@^10` (no force flags) installed with 11 "ERESOLVE overriding peer dependency" warnings; `npx vitest run` (300 passed), `npx tsc --noEmit` and `npx next build` were green, but `npx eslint .` crashed: "typescript-eslint does not support TS 7.0" (from `typescript-eslint` 8.71.0, pulled in by `eslint-config-next` 16.3.8; tracking issue github.com/typescript-eslint/typescript-eslint/issues/10940). Each alone also fails lint: TS 7 with ESLint 9 gives the same typescript-eslint error; ESLint 10 with TS 5.9 crashes in `eslint-plugin-react` 7.37.5 ("Error while loading rule 'react/display-name': contextOrFilename.getFilename is not a function"). Restored to typescript 5.9.3 and eslint 9.39.5; all gates green again. Retry when typescript-eslint supports TS 7 and `eslint-config-next` supports ESLint 10. |
| Q23 | `next build` rewrites the tracked `next-env.d.ts` (dev and build write different imports), so it shows as modified after every build. Add it to `.gitignore` and untrack it (Next's docs say not to edit it)? | Phase 15 | |
| Q24 | `.gitignore` line `lib/` (Python template) also ignores `src/__tests__/lib/` (only `!src/lib/` is un-ignored), so new test files there need `git add -f`. Add `!src/__tests__/lib/`, or drop the Python block? Also: the local Supabase CLI creates `supabase/.branches/`, which is not ignored. Add `supabase/.branches/` to `.gitignore`? | Phase 15 | |
| Q25 | The layout chat link and the ProfileDropdown "New Trip" link don't reset a chat that is already open at `/chat?session=X` (the page reads `?session=` once on mount), so the URL shows `/chat` while messages still go to X until reload. Fix now, or leave it to phase 16, which replaces this UI? | Phase 16 | **Obsolete: the old chat UI was deleted in phase 16** (plan 16-23, 7 Oct 2026); `/chat` now redirects to `/`. |
| Q26 | P14-10: does `public.users` (and the signup function `handle_new_user`) exist on the live DB? | Phase 14 | public.users exists on the live DB (checked 2026-10-05 from schema dump). `handle_new_user()` is there too. The `on_auth_user_created` trigger lives on `auth.users`, which the dump does not cover, so it could not be checked; the catch-up migration creates it only if missing (Q27). **Resolved 5 Oct 2026 (plan 14-15):** a read-only check found `on_auth_user_created` on `auth.users`, the only trigger there, calling `handle_new_user()`. |
| Q27 | Live schema drift (plan 14-13, 5 Oct 2026): `public.trip_sessions` is missing on the live DB (with its UNIQUE (user_id), RLS and policy), so `20261005000050` would fail; `20260312100000` (phase 11: `itineraries.is_public` and the two anon policies) never ran; the `on_auth_user_created` trigger could not be checked. How do we fix it? | Phase 14 | **"A: new catch-up migration (Recommended)"** (Asmeen, 5 Oct 2026). `supabase/migrations/20261005000010_catch_up_live.sql` (commit 4056929) creates `trip_sessions` exactly as the baseline does, with RLS and its policy, and creates `on_auth_user_created` only if no trigger on `auth.users` already calls `handle_new_user()`. Idempotent, no data changes. Tested locally with and without the trigger. `20260312100000` is pushed, not repaired. Whether the live trigger exists was not reported; the guard covers both cases. **Resolved 5 Oct 2026 (plan 14-15):** pushed to the live DB; the trigger was already there, so the guard skipped it; `trip_sessions`, `is_public` and both anon policies now exist live. |
| Q28 | AI provider: move from OpenAI direct to OpenRouter with Asmeen's credentials (`OPENAI_API_KEY` in Vercel is invalid as of 2026-10-05: production chat returns 500 with OpenAI `401 invalid_api_key`). Which phase? It also carries the phase 14 gate check deferred on 5 Oct 2026: two trips planned side by side, each keeping its own history after reload | AI phase (TBD) | **Decided 5 Oct 2026 (Asmeen):** AI moves to a later phase on OpenRouter with her own credentials; phase number TBD. |
| Q29 | Phase order after phase 14 | Phase 15 | **Decided 5 Oct 2026 (Asmeen):** phase 16 (Saves and the map, the UI revamp) runs next, before phase 15 (Capture spike); the new AI phase (OpenRouter, Q28) comes later. |
| Q30 | Core idea: pure saves-first (D1), a normal itinerary app with saves later, or a trip planner fed by saves? Raised in the phase 16 design brainstorm | Phase 16 | **Trip planner fed by saves (Asmeen, 5 Oct 2026).** Itinerary is what she would use most; reel capture into a trip stays a feature. D1 revised. Follow-ups: section 4.2 IA (Map home vs Trips home) is settled by the phase 16 UI-SPEC; phases 15–20 order and goals need re-shaping (Q31) |
| Q31 | Re-shape phases 15–20 for the trip-planner core (e.g. the planner from phase 18 moves earlier; capture spike later)? | Phase 16 | **Applied (Asmeen, 5 Oct 2026).** Order: 16 Trips and the planner UI (design system + shell + planner UI on existing itinerary data, no new AI) → 16.1 AI on OpenRouter (absorbs 18: clustering, planner prompt, per-day edits with Apply) → 16.2 Places and saves (search, paste a link, Google Maps import, Maybe bucket, export, delete account) → 15 Capture spike (reels into a trip) → 17 Share from the phone → 19 On the trip → 20 Ask and money. See `.planning/ROADMAP.md` |
| Q32 | Try before sign-up: let a visitor make a trip or paste one link before signing in? (Users complain about sign-up walls; touches auth) | Phase 16 || **No guest trips for now:** logged-out users fill the pass; sign-in is asked at Start planning and their answers are kept (16-CONTEXT D-19). |
| Q33 | Basemap for Q5: OpenFreeMap Positron/Dark online (free, no key, MIT, no SLA) plus Protomaps PMTiles for offline trips (phase 19)? See `.planning/research/16-design-direction/DESIGN-RESEARCH.md` §6 | Phase 16 | **Online part decided:** OpenFreeMap Positron/Dark (16-CONTEXT D-03, shipped in phase 16). **Offline part open:** Protomaps PMTiles for offline trips is decided in phase 19. |
| Q34 | Immersive "Where to next?" entry with an HD photo or short video background (Asmeen likes the current landing; handover §4.5 says no video heroes or stock photos on home). Allow it, and where do photos come from (re-encoded Pexels/Mixkit files, or a photo API such as Pexels/Unsplash — a new service)? | Phase 16 || **Partly answered (Asmeen, 6 Oct 2026):** HD photos only, **no video**. Photos: a curated, re-encoded set for popular cities **plus** a photo-API fallback (Unsplash or Pexels) for other destinations; the API is a new service (attribution, rate limits) to confirm before building. Whether the immersive entry overrides §4.5 is still part of the direction choice. |
| Q35 | Desktop plane cursor (Asmeen, 5 Oct 2026): build it beside the system cursor (never replacing it), laptop only, entry/globe screens only? | Phase 16 || **Yes, beside the real cursor, home pass area only, laptop only, no dotted trail** (Asmeen, 6 Oct 2026; 16-CONTEXT D-31). |
| Q36 | Globe: MapLibre globe projection on Trips home (needs MapLibre ≥ 6.12 and loads the map on Trips home) vs cobe (5.8 KB) vs no globe? | Phase 16 || **No globe in phase 16** — the immersive/globe option was not chosen (16-CONTEXT D-37). |
| Q37 | **Passes wallet** (Asmeen, 6 Oct 2026: needed if the gate-board direction is chosen): store boarding passes, tickets and QR codes per trip, show them offline at the gate. Which phase, which import methods (photo/screenshot scan, PDF, email forward, .pkpass), and how to store them safely (they contain name + booking reference; this differs from the "delete uploads after processing" rule, which covers capture files)? Research: `.planning/research/16-design-direction/DESIGN-RESEARCH.md` (round 2) | Phase 16 (decide), build later || **Placement (Asmeen, 6 Oct 2026): phase 19 (On the trip).** Import methods and storage rules still open. |
| Q38 | Phase 16 visual direction | Phase 16 | **Gate Board + photo passes (Asmeen, 6 Oct 2026).** Airport departure-board logic and split-flap moments, with HD destination photos as pass covers ("photo as cover, ticket as content"). The in-app planner pages stay as mocked. A real **light theme** is still to be designed (the mocked "light" board is dark). Home page: **one blank boarding pass for the next trip** at the top, made to look like a real pass with more fields; its photo is a random curated city that switches to the chosen city; sections below: Your trips, Create a new trip, Ask Barabula, What this app does (shown to everyone). Mockup: `.planning/sketches/16-directions/index.html` (Gate Board → "+ photo passes"). Decided 6 Oct 2026: **flights = a "Find flights" link to Google Flights prefilled with from/to/dates** (no API; §2 non-goal kept); **Ask Barabula stays phase 20** (home section appears once Ask works); **suggestions = curated city chips now, "From your saves" chips after 16.2**. Hero pass input (6 Oct 2026, after research `DESIGN-RESEARCH.md` §26): the all-fields design (B) is dropped; **multi-city = "+ Add a stop" rows**; **dates = exact dates OR a length, never both**; **no From on the pass** ("Find flights" uses the home city from the profile); preferred shape = **one question at a time** (Where to → When → Who → What you're into), each answer printed on the pass and editable, plus a visible **"Describe your whole trip instead"** smart box with example prompts that fills the same lines. Open: final pick after the step-by-step mockup, edge cases (discuss-phase 16), accent palette (Q14) |
| Q39 | **Weather source after monetising.** Open-Meteo's free API is non-commercial only ("websites or apps that have subscriptions or display advertisements" count as commercial), and its historical/climate data needs the Professional plan commercially. Use MET Norway for forecasts (free, commercial OK, ~9.5 days) plus climate normals stored in our DB (Meteostat CC BY 4.0, or ERA5 fetched while still free), or pay for Open-Meteo? Until then Open-Meteo is fine. Evidence: `.planning/spikes/002-trip-weather/README.md`, `.planning/spikes/REPORT.html` | Phase 16.1 (pick), phase 20 (switch) | **Decide at phase 20 (Asmeen, 6 Oct 2026).** Open-Meteo until then. |
| Q40 | **City picker data.** Nominatim's usage policy forbids autocomplete, so "Where to?" can't search it per keystroke. Load the GeoNames `cities15000` list (~25K cities with time zones, CC BY 4.0) into a new Postgres table searched with `pg_trgm`? This is a new table (schema change), and the curated list + "Use “{typed}”" stays as the phase 16 fallback. Evidence: `.planning/spikes/004-walking-times/README.md` | Phase 16 or 16.1 | **Yes, add the GeoNames city table (Asmeen, 6 Oct 2026).** Schema change approved in principle; `db push` still needs her OK. |
| Q41 | **"Know before you go" trip card** (public holidays during the trip, rough exchange rate, time difference at the trip dates, two-sentence Wikivoyage intro). Add it to phase 16.1? It needs one server-only dependency (`date-holidays`, ~11 MB, CC BY-SA 3.0 data), no API keys, and Credits lines. India needs a small curated list of moving holidays (Diwali, Holi, Eid) before an India launch (Q6). Evidence: `.planning/spikes/003-know-before-you-go/README.md` | Phase 16.1 | **Yes, in phase 16.1 (Asmeen, 6 Oct 2026).** |
| Q42 | **Foursquare (answers V5).** Since 1 June 2026 Pro calls are free for 0–500 a month, then $15 per 1,000; premium fields (tips, photos, hours/ratings) start at $18.75 per 1,000 with no free calls; the v3 endpoints were deprecated on 15 May 2026. `src/lib/places.ts` still calls `api.foursquare.com/v3/places/search` from the chat route. Migrate to the new Places API now, or drop live ratings until phase 16.2? (A task chip for this was raised on 6 Oct 2026.) | Phase 16.1 / 16.2 | **Remove live ratings for now (Asmeen, 6 Oct 2026);** revisit in 16.2. |
| Q43 | **Walking times between stops.** FOSSGIS's OSRM foot router (keyless, real walking profile) allows commercial use only when routing isn't "a substantial part" of the app and traffic is low; the OSRM demo server is non-commercial and returns car routes. Use FOSSGIS at hobby scale (1 req/s, cached per leg, OSM credit + "fix the map" link, no walking time past ~2.5 km straight line) and re-check before phase 20 (upgrade path: Geoapify or self-hosted)? Evidence: `.planning/spikes/004-walking-times/README.md` | Phase 19 | **Skip walking times (Asmeen, 6 Oct 2026).** Keep the "Open in Google Maps" link. |
| Q44 | Plan clustering (handover §10) names PostGIS `ST_ClusterDBSCAN`, but no migration enables PostGIS and coordinates live in `activities.extra_data`. Enable PostGIS (schema change) or cluster in app code? | Phase 16.1 | |
| Q45 | Share view (?share=true) for logged-out viewers stays broken in phase 16 (D-40): the plan page redirects to /login. Fix in a later phase? | Later phase | |
| Q46 | Map budget on the trip plan (handover §4.6, "map interactive ≤ 2 s"): measured 11.3 s on the throttled phone profile (slow 4G 1.6 Mbps/150 ms + 4x CPU), 1.8 s unthrottled. The network is the cost: MapLibre JS (~279 KB gzip main chunk + 144 KB shared file the worker loads) plus OpenFreeMap style, sprites, glyphs and vector tiles. Downloading MapLibre alone takes about 2 s at 1.6 Mbps, so no small fix reaches 2 s. Options: change the budget or how it is measured (for example "board usable ≤ 2 s, map ≤ N s"), show a static map image first and swap in MapLibre later, cut bytes (one MapLibre shared file, preload the map chunk, fewer glyph fonts), or another tile setup. Which one? | Phase 16 || **"A + C (Recommended)"** (Asmeen, 6 Oct 2026). A: the 2 s limit applies to the board on the throttled phone; the map gets its own slow-4G limit. C: cut bytes with no product change, then re-measure 3 times and set the map limit to the worst run rounded up to the next 500 ms. **Done (plan 16-05):** MapLibre's main module now loads from `/maplibre/` so main thread and worker share one `maplibre-gl-shared.mjs` (−~130 KB gzip of map JS), the style and TileJSON are fetched in parallel with MapLibre, and labels use one font stack (1 glyph file instead of 3). Map on throttled phone: before 10,533 / 10,968 / 11,079 / 11,417 ms; after 9,236 / 9,234 / 9,364 ms → **limit 9,500 ms**. Board painted 1.27–1.37 s (≤ 2 s). An HTML modulepreload of MapLibre was tried and dropped (map −0.5 s, but day tabs responded ~0.9 s later). The rest is mostly two z14 vector tiles (~700 KB) and the 2x sprite (~117 KB); see Q50 for hydration. |
| Q47 | "Know before you go" card placement on the trip plan: end of the board (16.1 UI-SPEC default, keeps the plan bar and day rows above the fold on phone) or the top? | Phase 16.1 | |
| Q48 | Blank pass "describe your trip" AI reading: run it when typing pauses for 1.5 s (16.1 UI-SPEC default) or only on an explicit button? Each run is one edit-model call and counts toward the daily guard. | Phase 16.1 | |
| Q49 | Replan ("Plan my days" on a planned trip): go straight in with Undo (16.1 UI-SPEC default, from the discussion log "Keep your moves, refit rest") or show a preview with Apply first? | Phase 16.1 | |
| Q50 | Board hydration on the throttled phone: the plan's title and rows paint at ~1.3 s, but the day tabs only respond once React hydrates, at ~2.1–2.3 s (2.1–2.6 s before the Q46 cuts; the cuts did not change it). The budgets spec asserts the paint (≤ 2 s) and only logs hydration. Should "board usable ≤ 2 s" also cover tabs responding? If yes, one candidate (not yet measured) is the three font files next/font preloads (~69 KB), which share the slow-4G link with the route JS; changing that is a design trade-off. | Phase 16 | |
| Q51 | **Walk estimates on the board vs Q43.** Q43 ("Skip walking times", 6 Oct 2026) answered the FOSSGIS routing question. 16-CONTEXT D-25 ("walking time between stops always shown") and the approved UI-SPEC (§7, discretion 13) still ask for a WALK column, so plan 16-06 shipped it as a **straight-line × 1.3 at 80 m/min estimate**, no API, always shown with "~" (plus "~{km} KM" per day). Spike 004 found this estimate has a 14% median error but is wrong on hills (5 vs 14 min in Lisbon) and across water. Keep the "~" estimate, or remove the WALK column and km totals too (a small, reversible UI change)? | Phase 16 | **Keep the ~ estimates** (Asmeen, 7 Oct 2026). Straight-line estimate stays, always marked with "~"; no routing API. |
| Q52 | **Plan header photo waits for the map.** On the throttled phone the Lisbon header photo (83 KB) shared the slow-4G link with MapLibre and the tiles and pushed map-ready from 8.7–8.9 s to 9.2–10.4 s (limit 9,500 ms). Plan 16-08 holds the header photo (only its 10 px blur shows) until the map has loaded, or for at most 10 s; on wifi the gap is under a second. Budgets are met again (map 8,699–9,223 ms over 4 runs). Fine as is, or should the photo come first and the map limit be revisited? When the trip-open view transition lands, a photo already cached from the home pass could skip the wait. | Phase 16 | |
| Q53 | **Toast text for Move up / Move down.** The copy list has "Moved {Place} to day {n}" and "Moved {Place} to Maybe" only, so plan 16-09 uses "Moved {Place} to day {n}" for Move up / Move down too. For a screen-reader user that toast does not say where in the day the place went. Keep it, or use "Moved {Place} to day {n}, stop {m}" (or the announcement wording "{Place} moved to day {n}, position {m}.") for every move? | Phase 16 | |
| Q54 | **Timing budgets swing on a busy machine.** On 7 Oct 2026, with the Mac at load average ~27 from other processes, the throttled-phone budgets spec gave map 8.8–9.9 s and board painted 1.26–2.30 s on the same build. The 16-08 build (before 16-09) failed the 9,500 ms map limit in 2 of 3 runs too (8,883 / 10,425 / 9,656 ms), so it is the machine, not the code. The JS budget is byte-exact and unaffected. Should the spec take the median of 3 runs (limits unchanged), or should budgets only be judged on a quiet machine? | Phase 16 | **Median of 3 runs** (Asmeen, 7 Oct 2026): the budget spec runs 3 times and asserts the median; limits unchanged. 16-09 kept as pushed. |
| Q55 | **A new trip's plan shows no day tabs.** Start planning on a 3-day pass opens the empty plan with "Now boarding: {City}" and the empty-plan text, but no D1–D3 tabs until the first place is added (the plan hides the board when it has no places; the length shows in the header's WHEN cell). Plan 16-10's test expected D1–D3 on the empty plan. Keep the empty plan as it is, or show the day tabs (each with "No stops yet") from the start? | Phase 16 | |
| Q56 | **NOT ON MAP hides the typed address on the row.** Per the UI-SPEC the row's meta line shows the location, or the NOT ON MAP tag, or "Finding on map…". So a place whose address Nominatim could not find shows only the tag on the board; the address is still in its ticket (AREA) and in Edit place. Keep it, or show the address next to the tag so it is easier to spot a typo? | Phase 16 | |
| Q57 | **STATUS on upcoming passes.** The UI-SPEC lists a STATUS chip on each upcoming pass but not its words. Built: "Upcoming" for a dated trip and "Open" for a trip without dates (outline chip, muted, never accent). The cover already says UPCOMING, so the chip repeats it for dated trips. Keep it, or show something else there (e.g. how many places are planned)? | Phase 16 | |
| Q58 | **Use this with no city.** The UI-SPEC says Use this is enabled "once a city or a 'no city' reading exists"; the 16-13 plan says only once a city is read or a "Cities that fit" chip is chosen. Built the plan's version: with no city, Use this stays off and the box says "Name a city and we'll fill in the rest." Should Use this also work without a city (fill WHEN / WHO / INTO and open Where to?)? | Phase 16 | |
| Q59 | **Drag announcements while moving.** The UI-SPEC lists the pick-up, drop and cancel sentences. 16-14 also reads where the place would land while it is moved with the arrow keys or the pointer ("{Place}: day {n}, stop {m}.", debounced 0.5 s by dnd-kit), so keyboard users hear each step. Keep it, or announce only pick-up / drop / cancel? | Phase 16 | |
| Q60 | **Phone drag near the day tabs scrolls the board.** On phone the board auto-scrolls when a dragged row nears its top edge, which is where the sticky day tabs sit; at the very top of the board the tabs then slide down under the finger. Drops on tabs still work (tested), but it can feel jumpy. Keep auto-scroll (needed for long days), or stop it while the finger is over the tab strip? Worth judging on the Android check. | Phase 16 | |
| Q61 | **Sign-in sheet details (16-15).** (1) The phone sheet also has the "Back to the pass" text button (the UI-SPEC lists it for the laptop panel only), so screen-reader and keyboard users have a visible way out besides swipe / Escape. Keep it? (2) "Use email instead" goes to plain `/login` (the UI-SPEC says `/login?next=…`); email sign-in now always lands on `/`, which resumes the kept trip, so no `next` is needed and nothing goes in the URL. OK? | Phase 16 | |
| Q62 | **Photo review after 16-21.** Every photo was looked at to set its focal point and alt text, and these are worth a look on the phone and laptop: (1) the UAE beach photo (Dubai Marina) has a person in swimwear walking in the foreground, and no crop can remove her; (2) the Canada autumn credit reads exactly as Commons gives it, "Thank you for visiting my page from Canada" (no real name on the file page or API; the Flickr account is davebloggs007); (3) some "beach" variants show no beach: Italy (Positano houses), Morocco (Taghazout boat and town), Egypt (a lookout on a grey shore), Turkey (hills above Ölüdeniz), Thailand (Maya Bay at dusk, no sand); (4) people in frame: Seoul (palace visitors), Mexico (Chichén Itzá visitors), Mexico beach (crowded), India beach, Croatia beach (swimmers), Greece default (shop and tourists in Oia); (5) the South Africa default has a © signature in the corner, cropped out by the focal point; (6) dense photos hit high AVIF CRF to stay under 220 KB (Istanbul 44, Croatia and Peru 42, Portugal 42, Japan spring 40): check for blur; (7) Austria's default is a winter Hallstatt and shows all year; Norway summer (Geirangerfjord from above) is dark. Swap any of these for an approved alternate? | Phase 16 |  **UAE beach dropped** (Asmeen, 7 Oct 2026): person in frame; UAE beach trips use the UAE default photo. Other items still open. |
| Q63 | **Plan route JS budget is used up (16-16).** After 16-16 the plan route is at 204,762 B gzip of the 204,800 B limit (38 B left). The map chunk (react-map-gl, pins, route) counts, because it loads before the measurement. 16-17 onward add more plan code (undo moments, Places, You, motion). Options: (A) keep the limit and pay for each new feature with cuts elsewhere (for example a smaller day-tab or menu path); (B) count only the JS loaded before the map starts (map and drag chunks excluded, like MapLibre); (C) raise the limit with a number you choose. | Phase 16 (before 16-17) | **Raise the limit to 250 KB** (Asmeen, 7 Oct 2026): route JS gzip budget becomes 256,000 B; §4.6 updated to match. |
| Q64 | **Trip details and Delete trip choices (16-17).** (1) Changing WHEN to "Not sure yet" keeps the board's current number of days (nothing moves to Maybe); only dates or "Number of days" that are shorter move places to Maybe. (2) "+ DAY" sits at the end of the day-tab strip, after MAYBE, outside the tab list (a button inside a tab list breaks screen-reader rules); on laptop it is a dashed "+ DAY" row under the last day. With a "Number of days" trip, + DAY also bumps WHEN ("4 days" → "5 days"). (3) Undoing a trip-details edit announces "Undone. Trip details are back." (no copy in the UI-SPEC). (4) A trip being deleted also leaves the Upcoming / Past counts during the 10 s window. OK as is? | Phase 16 (non-blocking) | |
| Q65 | **Places tab choices (16-18).** (1) Trip order and colours follow "dated soonest first, then undated" as planned, so a past trip (Prague) is listed and coloured before today's and upcoming trips; should Places use the home order instead (Now/Next, Upcoming, then Past last)? (2) With no places at all the tab shows only the empty card ("No places yet"), no map. (3) The card's type line reads "Place" or "Stay" (the UI-SPEC says "{type}"; the seed's finer kinds like "Viewpoint" live in the note). (4) A failed Visited save reverts the switch and shows DELAYED · Couldn't save. Retry in the card. (5) On laptop the filter row wraps "All types" to a second line in the 400 px panel. OK as is? | Phase 16 (non-blocking) | |
| Q66 | **You tab choices (16-19).** (1) Sign out uses Supabase's default sign-out, which ends the session on every device (the old profile menu did the same); should it sign out this device only? (2) The register page now also has "Continue with Google" on top (UI-SPEC §12 asks for Google primary on both pages); it is the same Google sign-in as on /login. (3) Home city is free text (1–80 characters) with curated city suggestions, not limited to the list; clearing the field and saving removes it. (4) With no Google name the passenger name is the part of the email before the @. OK as is? | Phase 16 (non-blocking) | |
| Q67 | **Motion choices (16-20).** (1) LOADING MAP… stays until the map has actually loaded (chunk, style and first tiles), not only while its code downloads, so on a slow phone it shows for several seconds. (2) Any change of the selected day flips the board, including a pin tap, + DAY and adding a place to another day, not only tab and day-header taps. (3) The read-only stamp lines on the Now/Next pass no longer fade in on every home visit (only the blank pass prints its lines). (4) On the plan route the flips are CSS keyframes, not Motion, to stay inside the 250 KB route budget; the home pass still uses Motion for the stamp-line rise. (5) The plane's resting heading is up-right (−30°) before the first movement. OK as is? | Phase 16 (non-blocking) | |
| Q68 | **Motion choices (16-22).** (1) Opened from its pass, the plan shows its header photo at once instead of waiting for the map (the photo is already downloaded for the pass; on a laptop from the Now/Next pass it is a second, smaller file). Without this the morph ends on the blurred placeholder. Direct loads still wait for the map, so the budgets are unchanged. (2) The list enters with a CSS fade, not a React view-transition "enter": with Next 16.3 the enter class was never applied to the board, only the cover pair formed. (3) The pin drop and ring are CSS keyframes, not Motion `m.div` (the plan route carries no Motion runtime, Q63). (4) Under reduced motion the map still jumps (no easing) to show a new pin, since "no camera move" would leave it off screen. (5) The haptic buzz (12 ms) fires when you press Add place, not when the pin lands (the lookup can take seconds). (6) The route only draws when the new place is the last located stop of its day; otherwise the route updates at once. Open, not blocking. |
| Q69 | **Home page budgets (16-24).** The phase proof measured the home page for the first time (throttled phone, median of 3, `e2e/budgets.spec.ts`). (1) **Home JS:** 295,706 B gzip logged out and 286,539 B signed in, over the 256,000 B route limit the plan applied to home (§4.6 names the Map route only). 16-24 already cut ~90 KB: the pending-pass check loaded all of zod on every home visit; the schema now loads only when a pass is kept (was 385,711 / 376,544 B). What is left is mostly the home pass itself: Motion features for moment 1 (~18 KB), Base UI combobox and popup code (~30 KB), number field (~13 KB), the pass UI (~25 KB) and the city list. (2) **Signed-in home LCP:** 3,420 ms median (3,420 / 3,336 / 3,648 ms; limit 2,500). With a Now pass on top, the LCP element is the blank pass photo under it (larger than the Now photo), which loads lazily without high priority, because the UI-SPEC allows `fetchPriority="high"` on the first pass only. Making it high priority too brought the median to 2,840 ms (still over) and breaks that rule, so it was not kept. Logged-out home LCP passes (1,692 ms). Options: (A) home JS is outside §4.6 (only the Map route has a JS limit) and only logged; (B) cut the home pass JS (load Motion, the combobox and the number field on first use) and re-measure; (C) a separate home JS limit you choose. For LCP: (D) allow high priority on both row-1 passes and also shrink the competing below-the-fold covers; (E) accept the signed-in LCP as a lab number and judge it on a real phone. | Phase 16 (before closing) | **Answered (Asmeen, 7 Oct 2026):** home JS gets its own limit, 300 KB gzip (307,200 B), plan route stays 250 KB; signed-in home LCP is judged on a real Android phone over 4G during the device checks (logged, not asserted, in the budgets spec); logged-out home LCP still ≤ 2.5 s. |
| Q70 | **Places map limit (16-24).** §4.6's "map interactive" row was revised by Q46 for the trip plan. The Places tab uses the same MapLibre build and tiles, so the budgets spec holds it to the same slow-4G limit (9,500 ms, median of 3); it measured 8,379 ms (8,379 / 8,071 / 8,432). The original 2 s is not reachable on slow 4G for the same reason as Q46. Confirm the Places map uses the Q46 limit? | Phase 16 (before closing) | **Yes, 9.5 s** (Asmeen, 7 Oct 2026): the Places map uses the plan map limit. |
| Q71 | **Audit notes (16-24).** (1) Phone plan: the floating Add place button sits over the right end of the first visible rows, so it covers the first row's NEXT chip and the second row's status until you scroll (the UI-SPEC places it there and adds space under the last row). Keep, or lift the list above it? (2) axe can't check text contrast over photos (pass titles and stamp lines over covers, the plan header) and lists those as "needs review"; they need a look in sunlight on a real phone. (3) The Places filter chips scroll sideways on phone ("All types" is cut at the edge); fine as a scroll row, or wrap? | Phase 16 (device check) | |

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

> **Moved to phase 15 (D-25, decided 2026-10-05):** `bump_usage` needs `public.usage`, which only exists in phase 15's section 7 migration. It moves into that migration next to `public.usage`, together with the clean-up job. Phase 14's `20261005000100_events_costs.sql` holds only `events` and `cost_log`.

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
