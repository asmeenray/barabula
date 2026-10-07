# "Know before you go" trip card (phase 16.1, approved Q41)

## Requirements
- Build in phase 16.1 (Asmeen, 6 Oct 2026, Q41).
- Server route only, identifying User-Agent, cached; no API keys needed.
- Prefer shipped data (offline library, static tables) for facts that rarely change.
- Every source must allow commercial use.

## How to Build It
One server route, all sources in parallel (card ready in 91–474 ms in tests):
1. **Closures (public holidays in the trip):** `date-holidays` (npm, server-only, ~11 MB):
   ```js
   import Holidays from 'date-holidays';
   const hd = new Holidays(countryCode, { languages: ['en'], types: ['public'] });
   const hits = years.flatMap((y) => hd.getHolidays(+y, 'en') || [])
     .filter((h) => h.date.slice(0, 10) >= start && h.date.slice(0, 10) <= end);
   ```
   Copy: "Public holiday: shops and museums may close or change hours."
2. **Money:** Frankfurter v1 (`https://api.frankfurter.dev/v1/latest?base=GBP&symbols=EUR`, ECB, cite the ECB). Fallback for currencies the ECB lacks: `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/gbp.min.json` (CC0, 340 currencies). Cache 24 h. Show "1 GBP ≈ X" + rate date + "A guide, not a quote."
3. **Time difference:** `Intl.DateTimeFormat` with IANA zones, computed **at the trip start date** (London–Mumbai: 5.5 h in January vs 4.5 h in October). Zone from the city row (GeoNames) or geocoder.
4. **About:** Wikivoyage REST summary `https://en.wikivoyage.org/api/rest_v1/page/summary/<Title>`, Wikipedia fallback. `trim()` the extract; show 2 sentences + "From Wikivoyage · CC BY-SA 4.0 · shortened" + link. May be stored in DB with URL, revision, licence.
5. **Country facts (currency, languages, driving side, plugs, emergency number):** static JSON shipped with the app from `countries-list` (MIT) + a Wikidata (CC0) extract checked by hand. No API.
6. **Later:** UK FCDO travel advice via GOV.UK Content API (`/api/content/foreign-travel-advice/<country>`, OGL v3; cache hours).

Working code: `sources/003-know-before-you-go/api.mjs`, page `index.html`.

## What to Avoid
- **caldays**: returns 2026 for any year requested, no error.
- **Nager.Date** as primary: no India/Thailand/UAE; commercial use needs sponsorship.
- **REST Countries**: v3.1 deprecated; v5 needs a key; free plan non-commercial; 3-day cache cap.
- Frankfurter alone: 404 for MAD, VND, AED, TWD, EGP.
- Time gap from today's offsets (DST bug).
- Exchangerate.host (now keyed), Teleport/WorldTimeAPI (dead), event APIs (Ticketmaster bans revenue; Eventbrite search shut 2019).
- Bundling `date-holidays` into a client component.

## Constraints
- `date-holidays` India: national fixed dates only (no Diwali, Holi, Eid) → curated yearly list needed before an India launch (Q6).
- `date-holidays` data CC BY-SA 3.0 → Credits line "Holiday data: date-holidays (CC BY-SA 3.0)".
- Wikimedia: 200 req/min with a compliant UA, **10 req/min without**; ≤ 3 concurrent; RESTBase being retired → wrap in one function.
- ExchangeRate-API open endpoint requires a visible attribution link.

## Origin
Synthesized from spikes: 003 (and 001)
Source files available in: sources/003-know-before-you-go/
