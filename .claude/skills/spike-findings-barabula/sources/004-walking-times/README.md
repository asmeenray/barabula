---
spike: 004
idea: free-apis-and-open-design
name: walking-times
type: standard
validates: "Given a trip day's places with coordinates, when a routing API is asked for walking times between consecutive stops, then we get believable times within the provider's usage policy; otherwise the Google Maps link stays"
verdict: PARTIAL
related: [002, 003]
tags: [routing, walking, osm, osrm, valhalla, heuristic]
---

# Spike 004: Walking times between stops

## What This Validates
Given a trip day's places in visiting order (with coordinates),
when we ask for the walking time of each leg ("12 min walk"),
then the times are believable and the source's usage policy allows it; otherwise keep today's plan (an "Open in Google Maps" link, handover §11).

## Research

Policies read on the providers' own pages, 6 Oct 2026. I re-checked the deciding lines myself (OSRM demo, FOSSGIS, Nominatim, Foursquare).

| Approach | Source | Pros | Cons | Status |
|---|---|---|---|---|
| Public OSM router | **FOSSGIS OSRM foot** (`routing.openstreetmap.de/routed-foot`) | Real walking profile; keyless; p50 52 ms; agrees with Valhalla on most legs | 1 req/s, no heavy use, real User-Agent; credit OSM plus a "fix the map" link. "Commercial use is only permitted if the use of the services does not constitute a substantial part of an online offering. Example of a non-substantial part: Directions sketches on websites. Websites with high traffic volumes are generally not permitted" (verified). Single server; access can be revoked | **Use now**, low volume, cached |
| Public OSM router | FOSSGIS Valhalla pedestrian | Second engine; handles ferries; p50 133 ms | Same policy as above | Second opinion / later |
| Public OSM router | OSRM demo (`router.project-osrm.org`) | — | **"restricted to reasonable, non-commercial use-cases"** (verified), and its `foot` profile returns **car** routes | Skip |
| Keyed, commercial | Geoapify Routing + Matrix | Commercial use allowed; storing allowed with attribution; 3,000 credits/day free | Key; free-plan "limitations" in production not spelled out | Upgrade path |
| Keyed | openrouteservice (HeiGIT) | 2,000 directions/day, 500 matrix/day | Key; commercial wording UNVERIFIED; **old host api.openrouteservice.org shuts down 2–6 Nov 2026** (use api.heigit.org) | Later |
| Keyed, restrictive | Mapbox Directions, Google Routes, GraphHopper, Stadia, TomTom | — | Mapbox: no caching of Navigation results; Google: no use near a non-Google map; GraphHopper and Stadia free tiers non-commercial (Stadia also bans caching) | Skip |
| No API | Straight line × 1.3 ÷ 4.8 km/h | Free, instant, offline | Wrong on hills and across water (see trail) | Fallback, marked "~" |
| Transit | TfL, transport.rest, Navitia, Transitland | — | All regional or tiny quotas; transport.rest's DB endpoint returned 503 | Skip (keep the Google Maps link) |

The routing subagent ran its own heuristic test (45 pairs in Paris, Kyoto, Lisbon, New York, using approximate landmark coordinates): median error 7%, 90th percentile 18%, worst 41% too short in Lisbon. It broadly matches mine.

**Chosen approach:** FOSSGIS OSRM foot from a server route, one call per leg, at most 1 a second through a global queue, cached forever per (from, to) pair; the estimate as a labelled fallback ("~15 min") when the server is slow or refuses; no walking time for legs over ~2.5 km straight line (show the Google Maps link for transit instead).

## How to Run
```bash
node .planning/spikes/lab/server.mjs
```
Open http://localhost:4317/004-walking-times/ and pick a city day. CLI version (prints all four tables):
```bash
node .planning/spikes/004-walking-times/test-days.mjs
```
Saved output: `test-days.out.txt`.

## What to Expect
Each leg shows four bars: the no-API estimate (yellow), the OSRM demo (red when it moves at car speed), FOSSGIS OSRM foot and FOSSGIS Valhalla pedestrian. A note says how far the estimate is from the routed time.

## Observability
The lab server logs every outbound call (API, status, ms, bytes, cache hit). `GET /log` exports it as JSON.

## Investigation Trail
1. **Places.** 18 real places in 4 cities, found by name with Nominatim (the project's existing geocoder) at 1 request a second: 18 of 18 found. p50 146 ms, worst 832 ms.
2. **Engines compared** on 14 legs: the OSRM demo (`router.project-osrm.org/route/v1/foot`), FOSSGIS OSRM foot (`routing.openstreetmap.de/routed-foot`), FOSSGIS Valhalla pedestrian (`valhalla1.openstreetmap.de`), and the estimate (straight line × 1.3 ÷ 4.8 km/h). All engines answered every call (0 errors). p50 latency: OSRM demo 51 ms, FOSSGIS OSRM 52 ms, Valhalla 133 ms.
3. **Surprise 1: the OSRM demo has no walking profile.** "foot" returns car routes: 2–9 min for 0.8–3 km legs, 0 km between Rialto and San Marco (cars can't reach), and 15 km for Galata → Kadıköy. It is unusable for walking.
4. **The two FOSSGIS engines mostly agree** (within 1–4 min on most legs). They differ on Lisbon's hills (Castle → Graça: 10 vs 14 min) and Venice (San Marco → Arsenale: 16 vs 25 min).
5. **The estimate against Valhalla:** median error 14% over 14 legs; the detour factor ranged from 1.10 to 3.31 (assumed 1.3). It is fine on flat grid legs (Amsterdam 0–17%, Istanbul old town 0%), but:
   - **Hills and stairs:** Castle → Miradouro da Graça in Lisbon: estimate 5 min, routed 14 min (−64%; detour 3.3×).
   - **Water:** Galata Tower → Kadıköy Pier: estimate 89 min walking; Valhalla returns 33 min because pedestrian costing **includes the ferry**. FOSSGIS OSRM says 90 min over 6.7 km. Neither "walk" is right: this leg is a ferry or transit trip.
6. **Edge rule that falls out of this:** past roughly 2.5 km straight line, don't show a walking time. Show "Open in Google Maps" (transit) instead.

## Results
**Verdict: PARTIAL.** Believable walking times are easy to get, and two free engines agree on most legs. But the only free, keyless source with a real walking profile (FOSSGIS) allows commercial use only when routing is a minor part of the app and traffic is low. That fits "12 min walk" hints at hobby scale. It must be re-checked before subscriptions or real traffic, with Geoapify (keyed, commercial OK, storage OK) or a self-hosted OSRM/Valhalla as the upgrade path.

Also settled along the way (from the same research, verified):
- **Nominatim forbids autocomplete:** "Auto-complete search … you must not implement such a service on the client side using the API." So the "Where to?" city picker must not call Nominatim as you type. Use a GeoNames `cities15000` table in Postgres (CC BY 4.0, ~25K cities with time zones), searched with `pg_trgm`.
- **Foursquare Places API (handover V5):** since 1 June 2026, Pro endpoints are free for **0–500 calls** a month, then $15 per 1,000 (verified on Foursquare's "Upcoming changes" page; the pricing page still says 10,000, which is out of date). The v3 endpoints were deprecated on 15 May 2026. Hours, ratings and photos are Premium (no free calls). So live details must be on demand only and tightly cached, or come from elsewhere.
- **ODbL:** storing Nominatim coordinates next to FSQ rows one place at a time is fine (OSMF Geocoding guideline). Storing OSM opening hours on FSQ places is not covered and can trigger share-alike once substantial. Fetch hours on demand instead, or keep them in a separate table ready to publish under ODbL.

Evidence:
- Routed walking times are cheap and fast to get from OSM-based engines, and two independent engines agree on most legs.
- The no-API estimate is honest enough for short, flat legs and badly wrong on hills and across water. Lisbon, the handover's example city, is exactly where it fails.
- Any routing call must be server-side and cached per leg (legs don't change), so a 6-stop day costs 5 calls once.
