---
name: spike-findings-barabula
description: Implementation blueprint from spike experiments. Requirements, proven patterns, and verified knowledge for building barabula (weather, trip card, city search, external API choices, design tooling). Auto-loaded during implementation work.
---

<context>
## Project: barabula

**free-apis-and-open-design** — Went through `public-apis/public-apis` (2,048 entries) to find APIs that help a trip planner fed by your saves (weather, holidays, currency, city intros, places, routing), checked each candidate's terms against Barabula's rules and live behaviour, and reviewed `nexu-io/open-design` as a UI design tool. Asked by Asmeen on 6 Oct 2026.

Spike sessions wrapped: 2026-10-06
</context>

<requirements>
## Requirements

**free-apis-and-open-design**
- Every value shown comes from a real API call, stored real data or an official page; no made-up examples.
- Every API must fit project rules: no scraping, no stored Mapbox results, places stay FSQ OS Places, no new paid service without Asmeen's OK, terms that survive monetisation (phase 20).
- External data calls run in server routes with an identifying User-Agent and a cache; never from the browser.
- Prefer data Barabula can store and ship (offline libraries, CC0/CC BY dumps) for facts that rarely change: holidays, country facts, climate normals, city list.
- Asmeen's decisions (6 Oct 2026, handover Q39–Q43): weather provider after monetising decided at phase 20 (Open-Meteo until then); add a GeoNames city table for "Where to?" (`db push` needs her OK); build the "Know before you go" card in phase 16.1; remove live Foursquare ratings for now (revisit 16.2); no walking times between stops (keep "Open in Google Maps").
- Open Design: not adopted (reviewed read-only).
</requirements>

<findings_index>
## Feature Areas

| Area | Reference | Key Finding |
|------|-----------|-------------|
| Weather | references/weather.md | Open-Meteo forecast + per-year ERA5 calls (≤3 concurrent, UTC horizon); Meteostat for city climate tags; MET Norway is the free commercial switch path |
| Trip card | references/trip-card.md | Holidays offline (date-holidays), Frankfurter + CDN FX fallback, Intl time gap at trip dates, Wikivoyage intro; < 0.5 s, no keys |
| Places, search, routing | references/places-search-routing.md | GeoNames table for city search (Nominatim bans autocomplete); Foursquare v3 deprecated, 500 free calls; no walking times |
| API vetting & design tools | references/api-selection-and-tooling.md | The list is stale; verify terms on provider pages; skip Open Design |

## Source Files

Original spike source files are preserved in `sources/` for complete reference (including `sources/REPORT.html` and the lab server).
</findings_index>

<metadata>
## Processed Spikes

- 001-public-apis-triage
- 002-trip-weather
- 003-know-before-you-go
- 004-walking-times
- 005-open-design-fit
</metadata>
