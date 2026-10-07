---
spike: 001
idea: free-apis-and-open-design
name: public-apis-triage
type: standard
validates: "Given the full public-apis list, when each entry is filtered against Barabula's rules (free, HTTPS, commercial use OK, storage allowed, no scraping), then a ranked shortlist maps to roadmap phases, with a reason for every reject"
verdict: VALIDATED
related: [002, 003, 004]
tags: [public-apis, triage, terms, licensing, weather, holidays, currency, routing, geocoding]
---

# Spike 001: Public APIs triage

## What This Validates
Given every entry in `github.com/public-apis/public-apis` (last commit 5 Oct 2026),
when each is screened against Barabula's needs and rules (no scraping, no stored Mapbox results, places from FSQ OS Places, no new paid service without Asmeen's OK, terms that survive monetisation in phase 20),
then we get a short ranked list mapped to roadmap phases, and a stated reason for every reject.

## Research
- **The list itself:** an MIT-licensed README of links. Each row has only API, description, auth (none / key / OAuth), HTTPS and CORS. It records **nothing about commercial use, storage rights, rate limits or whether the service still works**. Those columns decide everything for Barabula, so every candidate had to be checked on its own site.
- **Method:**
  1. Parse all rows (`apis.json`).
  2. Read every row in the 10 travel-relevant categories, and keyword-search the other 42 categories.
  3. Check each survivor's terms on its own pages: 3 parallel research subagents, then I re-checked every deciding line myself.
  4. Call the strongest candidates live in spikes 002–004.
  5. Note better options that aren't in the list.

| Approach | Tool | Pros | Cons | Status |
|---|---|---|---|---|
| Trust the list's columns | README table | Fast | No terms, limits or liveness; several rows are wrong today (see trail) | Rejected |
| Screen, then verify terms, then test live | Parser + subagents + spikes 002–004 | Every verdict has evidence | Slower (about 2 hours) | **Chosen** |

## How to Run
```bash
node .planning/spikes/lab/server.mjs
```
Open http://localhost:4317/001-public-apis-triage/ for the filterable shortlist (Use / Later / Have / Skip, text filter). Re-run the doc-link check:
```bash
node .planning/spikes/001-public-apis-triage/check-links.mjs
```

## What to Expect
Headline counts at the top, then 42 shortlisted rows with verdict, phase, reason, terms and the evidence (spike number or research). Rows marked "not in the list" are alternatives found on the way.

## Investigation Trail
1. **Parsed 2,048 rows in 52 categories.** 980 need no auth, 906 need a key, 153 OAuth. Two thirds of the categories (crypto, anime, games, finance and the like) are irrelevant to a trip planner.
2. **Screened 453 rows by hand** in Weather (43), Geocoding (107), Transportation (90), Calendar (19), Currency Exchange (27), Environment (25), Events (4), Open Data (71), Photography (34) and Food & Drink (33). Keyword search over the rest added Wikipedia/Wikidata, Sunrise-Sunset, timezone, translation, city bikes and QR entries.
3. **Doc-link health** (one GET each, 12 at a time): 359 of 453 load on the same host (79%), 34 load after moving host (8%), 14 block bots (3%), 46 fail (10%: DNS gone, 404, 5xx, timeouts). Transportation is the stalest category (12 of 90 broken).
4. **A live link does not mean a usable API.** Errors found that the list doesn't show:
   - **REST Countries v3.1** is deprecated, and v5 needs a key.
   - **caldays** silently returns the wrong year.
   - **Pirate Weather** now needs a key (the list says none).
   - **APIXU** is dead.
   - **Exchangerate.host** and **LibreTranslate** now need keys.
   - **Eventbrite** public search was shut in 2019.
   - **Teleport** and **WorldTimeAPI** are gone.
5. **Free does not mean free for Barabula.** The largest group of rejects ban commercial use on the free tier: Open-Meteo (for now), Nager.Date (sponsorship), Pirate Weather, Tomorrow.io, Weatherbit, 7Timer!, GraphHopper, Stadia, the OSRM demo and REST Countries. Barabula plans subscriptions, so each needed a path that survives phase 20.
6. **Storage rules matter as much as price.** Mapbox (Navigation results), Google (near a non-Google map), Stadia, Tripadvisor's successor and REST Countries (3-day cap) forbid the server-side caching Barabula is built on.
7. **The best answers were often not in the list:** `date-holidays` (offline holidays), Meteostat bulk data (climate normals), the FOSSGIS OSM routers (walking), GeoNames city dumps (city search) and the GOV.UK travel-advice API. They are included and marked.
8. **Findings for the existing app and handover:**
   - `src/lib/places.ts` calls Foursquare **v3**, which was deprecated on 15 May 2026.
   - The Foursquare free tier is now 500 calls a month, which answers V5.
   - Nominatim forbids autocomplete, which matters for the "Where to?" picker.

## Results
**Verdict: VALIDATED.** The list is a good discovery index and a poor source of truth. Out of 2,048 rows, a handful are worth building on, and each had to be checked on its own site.

**Use (9):**
- Weather: Open-Meteo now, MET Norway when monetising, Meteostat for the curated-city climate tags.
- Holidays: `date-holidays`.
- Currency: Frankfurter, with the CDN currency-api as fallback.
- City intros: Wikivoyage/Wikipedia.
- Walking times: FOSSGIS OSRM/Valhalla.
- City picker: GeoNames `cities15000`.

**Later (10):** UK FCDO travel advice, Nager.Date (fallback), Geoapify (upgrade path), openrouteservice, Overpass (opening hours on demand), ExchangeRate-API, OurAirports (IATA codes on passes), Open Topo Data (steep walks), India Public Holidays, Wikidata (static country facts).

**Have (4):** Nominatim, Foursquare, Unsplash/Pexels, OpenRouter.

**Skip (19 rows, some grouping several APIs):** each with a reason in `triage.json`.
