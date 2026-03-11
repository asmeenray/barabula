# Phase 9: Itinerary Page with Map Integration and Hotel Details - Research

**Researched:** 2026-03-11
**Domain:** Interactive map integration, travel UX design, geocoding, itinerary layout
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Visual Design (Locked)**
- Reference: mindtrip.ai layout — split view with map on one side, itinerary on the other (or sticky map with scrollable itinerary beside it)
- Brand palette strictly enforced: navy `#285185`, coral `#D67940`, umber `#6F4849`, sky `#CCD9E2`, sand `#F5EDE3` — **no blue-* Tailwind classes**
- Typography: `font-logo` (Abril Fatface), `font-serif` (DM Serif Display), `font-sans` (Inter)
- Hero header with cover image (already stored via Unsplash in Phase 8) — full-bleed or large card
- Day pills / tabs for navigation between days without full page scroll
- Activity cards redesigned: richer cards with icon, time badge, location chip, description
- Map pins clustered by day or color-coded per day
- Immersive, editorial feel — not a utility app aesthetic

**Hotel Details (Locked direction)**
- Hotel section displayed in the itinerary — either as a special card type per day, or a dedicated "Accommodation" section
- Hotel name, star rating, check-in/check-out, address shown
- Phase 8 AI already generates hotel data in the itinerary schema — confirm field names from schemas.ts and ensure they're persisted to activities table or a separate hotels table

**Interaction (Locked direction)**
- Pin-to-card and card-to-pin bidirectional highlight/focus
- Day filter on map (show only day N's pins)
- Smooth transitions using existing motion library

### Claude's Discretion
- Exact map vendor (must research licensing, Next.js compatibility, SSR safety)
- Geocoding strategy (on-the-fly vs. store lat/lng)
- Whether hotel data needs a schema migration or can be derived from existing activity records
- Specific animation timing and easing values
- Responsive breakpoints

### Deferred Ideas (OUT OF SCOPE)
- Collaboration features on itinerary page (Phase 4 scope)
- Real-time concurrent editing
- Pre-defined global itinerary cards on landing (deferred per memory — needs real data first)
- ContextPanel itinerary click navigation (deferred per memory)
- Booking integration / actual hotel reservation flow
</user_constraints>

---

## Summary

Phase 9 redesigns the itinerary detail page from a plain list into a premium split-layout experience. The right side shows a sticky interactive map with color-coded pins per day; the left side shows a scrollable editorial-quality itinerary. On mobile, these toggle via tabs. The existing `Activity` type has only a `location` string (no lat/lng), so geocoding is required.

The critical finding is that **the current AI schema does not generate hotel data as a separate field** — the `AIResponseSchema` in `schemas.ts` only generates activities with `name`, `time`, `description`, `location`. Hotel information is not surfaced as a distinct entity. This means Phase 9 must either: (a) add hotel data to the AI schema and re-persist, or (b) treat hotel accommodation as a special `activity_type` already in the `activities` table. The `activity_type` field exists in the DB schema and is `null` for all current activities — this is the right hook to use.

**Primary recommendation:** Use `react-map-gl` with `maplibre-gl` (the open-source Mapbox alternative, no API key billing) for the map. Use Mapbox Geocoding API for geocoding (100k free requests/month), storing results in `activities.extra_data` JSONB after first geocode to avoid redundant calls. Model hotels as `activity_type: 'hotel'` records inserted per day into the existing `activities` table — no schema migration needed.

---

## Critical Discovery: Hotel Data Shape

### What the AI Schema Actually Generates

Reading `src/lib/ai/schemas.ts` and `src/lib/types.ts`:

```typescript
// The AIResponseSchema generates this for each day:
activities: z.array(z.object({
  name: z.string(),
  time: z.string(),
  description: z.string(),
  location: z.string(),
  // NO hotel field, NO activity_type field
}))
```

The `Activity` DB type has `activity_type TEXT` (nullable) and `extra_data JSONB DEFAULT '{}'`. Hotel data is **not currently generated** by the AI or persisted anywhere.

### Decision Required: Hotel Data Strategy

**Option A (Recommended): Extend AI schema + activity_type hook**
- Add `activity_type: z.enum(['activity', 'hotel']).optional()` to the AI schema activity object
- Add hotel-specific fields to the activity object: `hotel_name`, `star_rating`, `check_in`, `check_out` stored in `extra_data`
- The AI generates one `activity_type: 'hotel'` entry per day — persisted like any activity
- No migration needed — `extra_data JSONB` already in `activities` table

**Option B: Separate hotel table**
- New `hotels` table with FK to `itinerary_id` and `day_number`
- Requires schema migration + new API routes
- More normalized but more work — not justified for v1

**Recommendation: Option A** — extend the AI prompt to generate hotel info as a special activity type, store hotel-specific metadata in `extra_data`. The `activities` table already has all needed columns.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-map-gl | 8.1.0 | React wrapper for vector map rendering | Official vis.gl project, supports both Mapbox and MapLibre |
| maplibre-gl | 4.x | Open-source WebGL map renderer | Free, no billing for map loads unlike Mapbox proprietary v2+ |
| motion | 12.35.2 (already installed) | Pin highlight animations, panel transitions | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Mapbox Geocoding API | REST | Convert `location` string to lat/lng | 100k free/month; cache results in `extra_data` to avoid re-geocoding |
| next/image | built-in | Cover image hero with fill layout | Handles Unsplash domain optimization |

### Why MapLibre over Mapbox proprietary

Mapbox GL JS v2+ is proprietary (changed license December 2020). Every map initialization incurs billing charges even on free tier. MapLibre GL JS is the fully open-source BSD-licensed fork, maintained by an active community with growing adoption since mid-2024. `react-map-gl` v8 provides a dedicated `react-map-gl/maplibre` endpoint specifically for MapLibre, making it a first-class option.

For tile data, use **OpenFreeMap** tiles (completely free, no API key, OpenStreetMap data) or **MapTiler Cloud free tier** (for styled vector tiles with an aesthetic matching the brand).

### Why not react-leaflet

Leaflet is raster-tile based and has a dated visual aesthetic. It requires `dynamic(() => import(), { ssr: false })` in Next.js anyway. MapLibre/react-map-gl provides WebGL vector tiles with cleaner visual styling and identical SSR patterns.

### Why not @vis.gl/react-google-maps

Google Geocoding API free tier is only 1,000 requests/month vs. Mapbox's 100,000. Google Maps map loads also have billing implications. Only use Google if Google-quality geocoding precision is critical — for travel destination strings it is not.

### Installation
```bash
npm install react-map-gl maplibre-gl
```

Note: `react-map-gl` imports from `react-map-gl/maplibre` to use the MapLibre endpoint.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── itinerary/
│   │   ├── ItineraryHero.tsx        # Cover image hero with title overlay
│   │   ├── DayPillNav.tsx           # Day N pills for filtering
│   │   ├── DaySection.tsx           # REDESIGNED — brand palette, hotel card variant
│   │   ├── ActivityCard.tsx         # New richer card (replaces ActivityRow)
│   │   ├── HotelCard.tsx            # Special hotel accommodation card
│   │   ├── ActivityForm.tsx         # Keep, restyle blue -> coral
│   │   └── ItineraryMap.tsx         # Map component (client-only)
│   └── ui/
│       └── (existing shared components)
├── lib/
│   └── geocoding.ts                 # Geocoding helper + cache strategy
└── app/
    └── (authenticated)/
        └── itinerary/
            └── [id]/
                └── page.tsx         # FULL REDESIGN — split layout
```

### Pattern 1: SSR-Safe Map Component

Next.js App Router renders server-first. WebGL-dependent `maplibre-gl` requires `window` and `document`. Solution: wrap map in a client component with `'use client'` directive and lazy-import within the component or use `next/dynamic` with `ssr: false` from the parent.

```typescript
// src/components/itinerary/ItineraryMap.tsx
'use client'
import Map, { Marker, Popup } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

// CSS import MUST be inside the 'use client' component file
// or via a client-side import chain. Cannot be in server components.
```

From the parent page (also `'use client'` due to useState/useSWR):
```typescript
// Dynamically import ItineraryMap to ensure maplibre CSS loads client-side
// and the map component never attempts SSR
import dynamic from 'next/dynamic'
const ItineraryMap = dynamic(() => import('@/components/itinerary/ItineraryMap'), { ssr: false })
```

### Pattern 2: Split Layout (Desktop) / Tab Toggle (Mobile)

```typescript
// Tailwind sticky map pattern — the key constraint:
// Parent must NOT have overflow: hidden/auto/scroll for sticky to work
// The scroll must happen on the BODY or a specific scroll container

// Desktop: two-column, map sticky
<div className="flex h-[calc(100vh-4rem)]">
  {/* Scrollable itinerary list */}
  <div className="w-[55%] overflow-y-auto">
    {/* day sections */}
  </div>
  {/* Sticky map */}
  <div className="w-[45%] sticky top-16 h-[calc(100vh-4rem)]">
    <ItineraryMap pins={pins} />
  </div>
</div>

// Mobile: tab toggle
<div className="md:hidden">
  <div className="flex border-b border-sky">
    <button onClick={() => setTab('list')}>Itinerary</button>
    <button onClick={() => setTab('map')}>Map</button>
  </div>
  {tab === 'list' ? <ItineraryList /> : <ItineraryMap />}
</div>
```

### Pattern 3: Pin-to-Card and Card-to-Pin Bidirectional Linking

```typescript
// State: which activity is "active" (highlighted on map + scrolled to in list)
const [activeActivityId, setActiveActivityId] = useState<string | null>(null)

// Card hover/click → update activeActivityId → map flies to pin
// Map pin click → update activeActivityId → list scrolls to card

// In ItineraryMap, watch activeActivityId and call map.flyTo()
// In ActivityCard, use motion to highlight when id matches activeActivityId
```

### Pattern 4: Geocoding with Extra_data Cache

```typescript
// lib/geocoding.ts
// On itinerary detail load:
// 1. For each activity, check if activity.extra_data?.lat and extra_data?.lng exist
// 2. If not, call Mapbox Geocoding API with activity.location string
// 3. PATCH activity with extra_data: { lat, lng } to cache for future loads
// 4. Rate: geocode in parallel batches of 5 (Mapbox allows 600 req/min)

async function geocodeActivity(activity: Activity): Promise<[number, number] | null> {
  if (activity.extra_data?.lat && activity.extra_data?.lng) {
    return [activity.extra_data.lng, activity.extra_data.lat]
  }
  if (!activity.location) return null
  const res = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(activity.location)}&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
  )
  const data = await res.json()
  const [lng, lat] = data.features?.[0]?.geometry?.coordinates ?? []
  if (lat && lng) {
    // Cache to DB via PATCH (fire-and-forget, non-blocking)
    fetch(`/api/activities/${activity.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extra_data: { ...activity.extra_data, lat, lng } }),
    })
    return [lng, lat]
  }
  return null
}
```

### Pattern 5: Hero Cover Image

```typescript
// ItineraryHero.tsx
// next/image with fill layout + gradient overlay
// Unsplash domain must be configured in next.config.ts

<div className="relative h-64 md:h-80 w-full overflow-hidden">
  <Image
    src={itinerary.cover_image_url}
    alt={itinerary.title}
    fill
    className="object-cover"
    priority
  />
  {/* Gradient overlay for text legibility */}
  <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/20 to-transparent" />
  <div className="absolute bottom-6 left-6 right-6">
    <h1 className="font-serif text-3xl text-white">{itinerary.title}</h1>
    <p className="text-sky text-sm mt-1">{itinerary.destination} · {dateRange}</p>
  </div>
</div>
```

Unsplash domain allowlist in `next.config.ts`:
```typescript
images: {
  remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }]
}
```

### Pattern 6: Day Pill Navigation

```typescript
// DayPillNav.tsx — horizontal scrollable pill row
// Active day = activeDay state in parent
// Clicking pill: setActiveDay(n), scroll list to that day section, filter map pins

<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
  {sortedDays.map(day => (
    <button
      key={day}
      onClick={() => setActiveDay(day)}
      className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
        activeDay === day
          ? 'bg-navy text-white'
          : 'bg-sand text-umber hover:bg-sky'
      }`}
    >
      Day {day}
    </button>
  ))}
</div>
```

### Anti-Patterns to Avoid

- **Overflow on map parent:** `overflow: hidden` on any ancestor of the sticky map panel breaks sticky positioning — the scroll container must be the flex child, not a parent wrapper
- **SSR map import:** Never import `maplibre-gl` or `react-map-gl` without `'use client'` — WebGL APIs do not exist on the server and will throw at build time
- **Blocking geocode on render:** Never await all geocoding before showing the UI — geocode progressively and show pins as they resolve; missing pins are acceptable
- **Re-geocoding on every load:** Always check `extra_data.lat/lng` first — without caching, a 7-day itinerary with 5 activities/day = 35 geocode calls on every page view

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interactive vector map | Custom canvas/SVG map | react-map-gl + maplibre-gl | WebGL rendering, pan/zoom, custom layers — 10,000 lines of complexity |
| Geocoding | Parse location strings with regex | Mapbox Geocoding API v6 | Global address resolution, ambiguous city names, international support |
| Map fit-bounds | Manual lat/lng min-max math | maplibre's `fitBounds()` or `flyTo()` | Handles projection, padding, animation natively |
| Custom pin SVGs | Complex SVG generator | Maplibre `Marker` with HTML element | CSS-styleable HTML markers are simpler than SVG data URIs |
| Next.js image optimization | `<img>` with Unsplash URL directly | `next/image` with remotePatterns | Automatic WebP conversion, lazy loading, CLS prevention |

---

## Common Pitfalls

### Pitfall 1: MapLibre CSS Not Loading

**What goes wrong:** Map renders as a blank gray rectangle or tiles don't appear.
**Why it happens:** `maplibre-gl/dist/maplibre-gl.css` must be imported in a client component. If imported in a server component or layout, Next.js may not bundle it correctly for client use.
**How to avoid:** Import the CSS inside the `'use client'` map component file itself — `import 'maplibre-gl/dist/maplibre-gl.css'`.
**Warning signs:** Map container has height but is gray/blank with no tiles or controls.

### Pitfall 2: Sticky Map Panel Not Sticking

**What goes wrong:** The map scrolls with the page instead of staying fixed.
**Why it happens:** CSS `sticky` requires that no ancestor element has `overflow: hidden`, `overflow: auto`, or `overflow: scroll`. The page layout uses `overflow-y-auto` on the wrong element.
**How to avoid:** The scroll container must be the sibling list panel `div`, not a wrapping div. The parent of both columns must have no overflow set. Use `h-[calc(100vh-4rem)]` on the page wrapper with `overflow: hidden`, then `overflow-y-auto` on the list column only.
**Warning signs:** Map moves with scroll; inspect computed styles of all ancestors.

### Pitfall 3: Mapbox Geocoding API Token Exposure

**What goes wrong:** `NEXT_PUBLIC_MAPBOX_TOKEN` in client code is visible to anyone — it can be scraped and used on other domains.
**Why it happens:** Environment variables prefixed with `NEXT_PUBLIC_` are inlined into client bundles.
**How to avoid:** Restrict the Mapbox token to specific allowed URLs in the Mapbox dashboard. Alternatively, proxy geocoding calls through a Next.js API route using a server-only `MAPBOX_TOKEN` env var, and cache results in the DB so the proxied call happens at most once per activity.
**Warning signs:** Token usage spikes in Mapbox dashboard from unexpected domains.

### Pitfall 4: Geocoding Fails Silently for Vague Locations

**What goes wrong:** Activity `location` fields like "Local Market" or "City Center" return wrong coordinates or null.
**Why it happens:** The AI generates human-readable location strings, not geocodable addresses. Vague names geocode to wrong cities.
**How to avoid:** Include the trip `destination` as a `proximity` or `country` bias in geocoding queries: `?q=Local+Market&proximity=139.6917,35.6895` (Tokyo's coordinates). Show map pins only for activities with valid geocoded coordinates — gracefully omit unpinnable activities.
**Warning signs:** Pins appearing on wrong continents, or in wrong cities.

### Pitfall 5: Blue Tailwind Class Violations

**What goes wrong:** Build passes but brand audit fails — blue-* classes remain.
**Why it happens:** Multiple files have `blue-*` classes that predate the brand enforcement in Phase 7.

**Confirmed blue violations requiring replacement:**

`src/app/(authenticated)/itinerary/[id]/page.tsx`:
- `border-blue-500` → `border-coral`
- `hover:text-blue-700` → `hover:text-coral`
- `text-blue-600` (destination) → `text-coral`
- `focus:ring-blue-500` → `focus:ring-coral`

`src/app/(authenticated)/itinerary/new/page.tsx`:
- `focus:ring-blue-500` (×4 inputs) → `focus:ring-coral`
- `bg-blue-600` + `hover:bg-blue-700` (submit button) → `bg-navy` + `hover:bg-umber`

`src/components/itinerary/ActivityForm.tsx`:
- `focus:ring-blue-500` (×4 inputs) → `focus:ring-coral`
- `bg-blue-600` + `hover:bg-blue-700` (save button) → `bg-navy` + `hover:bg-umber`

`src/components/itinerary/ActivityRow.tsx`:
- `text-blue-600` (time display) → `text-coral`

---

## Code Examples

### Map Component with Day Filtering and Bidirectional Linking

```typescript
// src/components/itinerary/ItineraryMap.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { MapRef } from 'react-map-gl/maplibre'

// Day color palette using brand colors
const DAY_COLORS = ['#285185', '#D67940', '#6F4849', '#CCD9E2', '#285185']

interface MapPin {
  id: string
  name: string
  day: number
  lng: number
  lat: number
  type: 'activity' | 'hotel'
}

interface ItineraryMapProps {
  pins: MapPin[]
  activeDay: number | null  // null = show all days
  activeActivityId: string | null
  onPinClick: (id: string) => void
}

export default function ItineraryMap({ pins, activeDay, activeActivityId, onPinClick }: ItineraryMapProps) {
  const mapRef = useRef<MapRef>(null)
  const visiblePins = activeDay ? pins.filter(p => p.day === activeDay) : pins

  useEffect(() => {
    if (!activeActivityId || !mapRef.current) return
    const pin = pins.find(p => p.id === activeActivityId)
    if (pin) {
      mapRef.current.flyTo({ center: [pin.lng, pin.lat], zoom: 14, duration: 800 })
    }
  }, [activeActivityId, pins])

  return (
    <Map
      ref={mapRef}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"  // Free, no API key
      initialViewState={{ longitude: 0, latitude: 20, zoom: 2 }}
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" />
      {visiblePins.map(pin => (
        <Marker key={pin.id} longitude={pin.lng} latitude={pin.lat} anchor="bottom">
          <button
            onClick={() => onPinClick(pin.id)}
            className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold transition-transform ${
              activeActivityId === pin.id ? 'scale-125' : 'hover:scale-110'
            }`}
            style={{ backgroundColor: DAY_COLORS[(pin.day - 1) % DAY_COLORS.length] }}
          >
            {pin.type === 'hotel' ? '★' : pin.day}
          </button>
        </Marker>
      ))}
    </Map>
  )
}
```

### Geocoding Helper

```typescript
// src/lib/geocoding.ts
import type { Activity } from '@/lib/types'

export async function resolveActivityCoordinates(
  activity: Activity,
  contextDestination: string | null
): Promise<{ lat: number; lng: number } | null> {
  // Use cached value if available
  const cached = activity.extra_data as Record<string, unknown> | null
  if (cached?.lat && cached?.lng) {
    return { lat: cached.lat as number, lng: cached.lng as number }
  }

  if (!activity.location) return null

  const query = contextDestination
    ? `${activity.location}, ${contextDestination}`
    : activity.location

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&limit=1&access_token=${token}`

  try {
    const res = await fetch(url)
    const data = await res.json()
    const coords = data.features?.[0]?.geometry?.coordinates
    if (!coords) return null
    return { lng: coords[0], lat: coords[1] }
  } catch {
    return null
  }
}
```

### Activity Card (Redesigned)

```typescript
// Brand-palette compliant ActivityCard replacing ActivityRow
// Key differences: time badge in coral, location chip in sky, motion highlight

<motion.div
  layout
  className={`rounded-2xl p-4 border transition-all ${
    isActive
      ? 'border-coral bg-white shadow-md ring-1 ring-coral/20'
      : 'border-sky/40 bg-white hover:border-sky hover:shadow-sm'
  }`}
  onClick={onCardClick}
>
  <div className="flex items-start gap-3">
    <div className="shrink-0 w-10 h-10 rounded-xl bg-sand flex items-center justify-center">
      {/* Activity icon placeholder */}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-medium text-navy text-sm">{activity.name}</p>
        {activity.time && (
          <span className="text-xs text-coral font-medium bg-coral/10 px-2 py-0.5 rounded-full">
            {activity.time}
          </span>
        )}
      </div>
      {activity.location && (
        <p className="text-xs text-umber mt-1 flex items-center gap-1">
          <span>📍</span> {activity.location}
        </p>
      )}
      {activity.description && (
        <p className="text-xs text-umber/80 mt-2 leading-relaxed">{activity.description}</p>
      )}
    </div>
  </div>
</motion.div>
```

---

## Hotel Data: Implementation Detail

The AI schema (`schemas.ts`) does NOT currently generate hotel data. The `activity_type` column in the `activities` table is always `null`.

**Implementation plan for Phase 9:**

1. Update the AI system prompt in `src/lib/ai/prompts/trip-planner.ts` to include one hotel activity per day when generating the itinerary.

2. Update `AIResponseSchema` in `schemas.ts` to include optional hotel fields in the activity object:

```typescript
activities: z.array(z.object({
  name: z.string(),
  time: z.string(),
  description: z.string(),
  location: z.string(),
  activity_type: z.enum(['activity', 'hotel']).nullable(),
  hotel_name: z.string().nullable(),
  star_rating: z.number().nullable(),
  check_in: z.string().nullable(),
  check_out: z.string().nullable(),
}))
```

3. Update the itinerary insertion API route (`src/app/api/chat/message/route.ts`) to persist hotel-specific fields into `extra_data` JSONB on the activity row.

4. In the itinerary page, filter `activity_type === 'hotel'` records out of regular activity display and render them as `HotelCard` components instead.

**Backward compatibility:** Existing itinerary activities all have `activity_type: null` — the hotel card rendering path is only triggered on `activity_type === 'hotel'`, so existing data is unaffected.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mapbox proprietary SDK | MapLibre GL JS (OSS fork) | Dec 2020 | No per-map-load billing, BSD license |
| Leaflet raster tiles | MapLibre vector tiles | 2021+ | WebGL performance, custom styling, crisp on HiDPI |
| react-map-gl `mapbox-gl` import | `react-map-gl/maplibre` endpoint | v8.0, Jan 2025 | Separate bundle, smaller size, precise types |
| Geocoding on every render | Geocode once, cache to DB | Best practice | Avoids rate limits and API costs |
| `position: fixed` map sidebar | CSS sticky within flex container | Modern CSS | Simpler, no JS scroll syncing |

**Deprecated/outdated:**
- `react-map-gl` v7 and below: monolithic import with `mapbox-gl` dependency — use v8 with `/maplibre` endpoint
- Leaflet default markers: broken under Next.js build output — image path resolution fails

---

## Open Questions

1. **OpenFreeMap tile stability**
   - What we know: OpenFreeMap provides free vector tiles with OpenStreetMap data; no API key required
   - What's unclear: SLA/uptime guarantees for a free service in a production app
   - Recommendation: Use OpenFreeMap tiles during development/MVP; if stability issues arise, switch to MapTiler free tier (50k map views/month) which has better SLA

2. **Mapbox Geocoding API token security**
   - What we know: `NEXT_PUBLIC_` tokens are exposed in client bundle
   - What's unclear: Whether to proxy geocoding through an API route or accept token exposure
   - Recommendation: For v1/MVP, restrict the public Mapbox token to production domain in Mapbox dashboard and expose as `NEXT_PUBLIC_MAPBOX_TOKEN`. Proxy route adds latency and complexity; domain restriction is sufficient security for a small-group app.

3. **AI schema migration for hotel data**
   - What we know: The AI schema currently has no hotel fields; existing activities have `activity_type: null`
   - What's unclear: Whether existing AI-generated itineraries should be backfilled or left without hotel data
   - Recommendation: New itineraries (generated after schema update) include hotel cards. Old itineraries silently omit the hotel section — acceptable for v1.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run src/__tests__/itinerary-detail.test.tsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ITIN-01 | Itinerary detail page renders day-by-day view | unit | `npx vitest run src/__tests__/itinerary-detail.test.tsx` | ✅ (needs update for new layout) |
| ITIN-02 | Each day shows activities with name, time, description, location | unit | `npx vitest run src/__tests__/itinerary-detail.test.tsx` | ✅ (needs update) |
| MAP-01 | ItineraryMap component renders map container | unit | `npx vitest run src/__tests__/itinerary-map.test.tsx` | ❌ Wave 0 |
| MAP-02 | Day pill nav filters visible days | unit | `npx vitest run src/__tests__/day-pill-nav.test.tsx` | ❌ Wave 0 |
| HOTEL-01 | Hotel card renders when activity_type === 'hotel' | unit | `npx vitest run src/__tests__/hotel-card.test.tsx` | ❌ Wave 0 |
| HERO-01 | Cover image hero renders with title overlay | unit | `npx vitest run src/__tests__/itinerary-hero.test.tsx` | ❌ Wave 0 |
| BLUE-01 | No blue-* Tailwind classes in itinerary files | lint/manual | `grep -rn "blue-" src/app/\(authenticated\)/itinerary/ src/components/itinerary/` | manual check |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/itinerary-detail.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + manual blue-class grep passes before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/itinerary-map.test.tsx` — covers MAP-01: renders map container (mock maplibre-gl)
- [ ] `src/__tests__/day-pill-nav.test.tsx` — covers MAP-02: day pill filtering
- [ ] `src/__tests__/hotel-card.test.tsx` — covers HOTEL-01: hotel card display
- [ ] `src/__tests__/itinerary-hero.test.tsx` — covers HERO-01: hero image and title

Note: `maplibre-gl` and `react-map-gl` must be mocked in tests (WebGL unavailable in jsdom). Pattern: `vi.mock('react-map-gl/maplibre', () => ({ default: ({ children }) => <div data-testid="map">{children}</div>, Marker: ({ children }) => children, NavigationControl: () => null }))`.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `src/lib/ai/schemas.ts`, `src/lib/types.ts`, `supabase/schema.sql` — confirms hotel data gap, `extra_data JSONB` availability, `activity_type` field
- [react-map-gl What's New](https://visgl.github.io/react-map-gl/docs/whats-new) — v8.1 current, v8.0 introduced `/maplibre` endpoint (January 2025)
- [react-map-gl Introduction](https://visgl.github.io/react-map-gl/docs) — MapLibre support confirmed, three supported endpoints

### Secondary (MEDIUM confidence)
- [Mapbox Geocoding pricing comparison — mapscaping.com](https://mapscaping.com/guide-to-geocoding-api-pricing/) — Mapbox 100k free/month vs Google 1k free/month (March 2026)
- [Mapbox GL JS proprietary license — Geoapify](https://www.geoapify.com/mapbox-gl-new-license-and-6-free-alternatives/) — confirms license change in December 2020
- [react-leaflet on Next.js 15 — XXL Steve](https://xxlsteve.net/blog/react-leaflet-on-next-15/) — SSR: false pattern confirmed for Leaflet

### Tertiary (LOW confidence)
- OpenFreeMap tiles URL `https://tiles.openfreemap.org/styles/liberty` — from community documentation; verify tile URL before production use
- Mindtrip.ai UX patterns — described from search results and resident.com article; actual UI screenshots not directly verified

---

## Metadata

**Confidence breakdown:**
- Standard stack (MapLibre + react-map-gl): HIGH — verified from official react-map-gl docs, v8.1 current version confirmed
- Hotel data gap finding: HIGH — verified by direct source code read of schemas.ts
- Blue class violations list: HIGH — verified by direct grep of source files
- Architecture patterns (sticky layout, geocode caching): HIGH — standard CSS and caching patterns
- OpenFreeMap tile source: MEDIUM — community-documented, not from official Mapbox/MapLibre docs
- Mindtrip.ai exact UX details: LOW — based on search result descriptions, not direct UI analysis

**Research date:** 2026-03-11
**Valid until:** 2026-04-10 (react-map-gl API stable; geocoding pricing stable; re-check if Mapbox changes free tier)
