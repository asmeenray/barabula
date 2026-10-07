# Places, city search and routing

## Requirements
- Places come from FSQ OS Places; never store Mapbox results; no scraping.
- **Add a GeoNames city table** for "Where to?" search (Q40, Asmeen 6 Oct 2026). Schema change approved in principle; `db push` needs Asmeen's OK.
- **Remove live Foursquare ratings for now** (Q42); revisit in phase 16.2.
- **No walking times between stops** (Q43). Keep the "Open in Google Maps" link.
- Server routes only, identifying User-Agent, cached.

## How to Build It
1. **City picker ("Where to?"):** load GeoNames `cities15000` (`https://download.geonames.org/export/dump/cities15000.zip`, ~3.4 MB zip, ~25K cities, CC BY 4.0) into a Postgres table (name, ascii name, alternate names, country code, lat/lon, IANA timezone, population). Search with `pg_trgm` prefix/trigram, rank by population. RLS on the table (read-only for all). Credit "City list: GeoNames (CC BY 4.0)".
2. **Place search (16.2):** search our own FSQ OS rows (`pg_trgm` on name + PostGIS filter to the trip city). Every result is an FSQ row by construction.
3. **Geocoding pins:** keep the existing server-side Nominatim lookup (one name at a time, ≤ 1 req/s, cached). 18/18 real places found in tests.
4. **Foursquare:** remove the rating call in `src/lib/places.ts` (it hits deprecated `api.foursquare.com/v3/places/search`). If revived: new Places API, Pro endpoints free 0–500 calls/month then $15/1,000; premium fields (tips, photos, hours/ratings) from $18.75/1,000, no free tier; "Powered by Foursquare" attribution.
5. **Directions:** "Open in Google Maps" URL links only (no API).

## What to Avoid
- Nominatim for type-ahead: "Auto-complete search … strictly forbidden and will get you banned."
- Photon public API for type-ahead (4.8–12.2 s responses).
- Storing OSM opening hours (Overpass) on FSQ places → ODbL share-alike risk. Fetch on demand if ever needed.
- OSRM demo server: its `foot` profile returns car routes; non-commercial only.
- Mapbox Directions/Search (no caching/storing), Google Routes (not near a non-Google map), Yelp (trial then $229/mo), Tripadvisor (Content API deprecated; successor bans caching).
- openrouteservice old host `api.openrouteservice.org` (shuts 2–6 Nov 2026).

## Constraints
- If walking times are ever revisited: FOSSGIS OSRM foot (`routing.openstreetmap.de/routed-foot/route/v1/driving/{lon},{lat};{lon},{lat}`) allows commercial use only when not "a substantial part" of the app and traffic is low; 1 req/s; OSM credit + "fix the map" link. Straight-line × 1.3 ÷ 4.8 km/h estimate: median error 14%, but 5 vs 14 min on Lisbon's hills and wrong across water (ferry). Upgrade path: Geoapify (keyed, commercial + storage OK) or self-hosted.
- Storing Nominatim coordinates per place next to FSQ rows is fine (OSMF Geocoding guideline); app-level OSM attribution still needed.

## Origin
Synthesized from spikes: 004, 001
Source files available in: sources/004-walking-times/, sources/001-public-apis-triage/
