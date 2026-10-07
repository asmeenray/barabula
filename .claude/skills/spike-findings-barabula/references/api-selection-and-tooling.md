# Choosing external APIs and design tools

## Requirements
- Every API must fit project rules: no scraping, no stored Mapbox results, places from FSQ OS, no new paid service without Asmeen's OK, terms that survive monetisation (phase 20).
- Verify terms on the provider's own page and quote the deciding line; never trust list metadata.
- Open Design was reviewed read-only; nothing installed.

## How to Build It (how to vet a new API)
1. Check on the provider's own pages: commercial use on the free tier, storage/caching rights, attribution text, rate limits (incl. weighting and concurrency), and whether the endpoint still answers.
2. Call it live from a server-side test (`sources/lab/server.mjs` pattern: forensic call log, identifying UA) across several cities, hemispheres, future years and edge dates.
3. Prefer offline libraries or CC0/CC BY dumps for slow-changing facts.
4. Add the attribution line to the Credits page in the same change.

**Shortlist (6 Oct 2026):** Use — Open-Meteo (until phase 20), MET Norway (switch path), Meteostat, date-holidays, Frankfurter, fawazahmed0 currency-api, Wikivoyage/Wikipedia, GeoNames cities15000. Later — UK FCDO advice, Nager.Date (fallback), Geoapify, Overpass (on demand), ExchangeRate-API, OurAirports (IATA codes for passes), Open Topo Data, India Public Holidays, Wikidata. Full table: `sources/001-public-apis-triage/triage.json`.

## What to Avoid
- Treating `public-apis/public-apis` as current: of 453 relevant doc links, 10% are dead; and a live link ≠ a usable API (REST Countries v3.1, caldays wrong year, Pirate Weather now keyed, APIXU/Teleport/WorldTimeAPI gone, Exchangerate.host/LibreTranslate now keyed).
- Link-preview/scraping APIs (Microlink, LinkPreview, Scrappa, Serply): break the no-scraping rule.
- Free tiers that ban commercial use (most weather APIs, GraphHopper, Stadia, OSRM demo, REST Countries, Nager.Date without sponsorship).
- **Open Design (nexu-io/open-design):** skip. HTML mockups + a "rebuild in Next.js" prompt (no gain over GSD sketches + UI-SPEC + Impeccable + Claude Code); telemetry on by default with an always-on channel; open bug #8560 re-enables telemetry; runs Claude Code with `bypassPermissions`; open bug #4594 (projects not isolated); its `impeccable-design-polish` skill would collide with the installed Impeccable skill; Tailwind mapping v4 only. If a canvas tool is wanted, try Claude Design first.

## Constraints
- Unverified: Open-Meteo euro prices; whether Anthropic's terms allow third-party apps to drive Claude Code headless; Geoapify's unstated production limits.

## Origin
Synthesized from spikes: 001, 005
Source files available in: sources/001-public-apis-triage/, sources/005-open-design-fit/, sources/REPORT.html
