---
spike: 003
idea: free-apis-and-open-design
name: know-before-you-go
type: standard
validates: "Given a trip's destination, home city and dates, when holidays, exchange rate, time difference and a city intro are fetched, then a calm 'Know before you go' card fills in under 1 s with no API keys, and every source's terms survive future monetisation"
verdict: VALIDATED
related: [002]
tags: [holidays, currency, timezone, wikivoyage, wikipedia, country-data]
---

# Spike 003: Know before you go

## What This Validates
Given a trip (destination city, home city, dates),
when the server asks for public holidays during the trip, a rough exchange rate, the time difference and a short city intro,
then one calm card fills in under 1 s, with no API keys, and the sources' terms still work once Barabula charges money.

## Research

Terms read on each provider's own pages, 6 Oct 2026. I re-checked the deciding lines myself (Nager.Date, REST Countries, Frankfurter).

| Field | Approach | Source | Pros | Cons | Status |
|---|---|---|---|---|---|
| Holidays | Offline library | **date-holidays** 3.37.0 (npm) | No network; any year; lunar and Islamic dates computed; 200+ countries incl. IN, AE, TH | Data CC BY-SA 3.0 (credit line needed); ~11 MB, server-only; **India has fixed national dates only: no Diwali, Holi or Eid** (verified: 6 public holidays for IN in 2027) | **Use** |
| Holidays | Keyless API | Nager.Date (now nagerholidays.com, v4 API) | Regional flags (e.g. Portugal's 26 Dec); 7-day cache headers | **"For commercial purposes we require active sponsorship"** (verified); no India, Thailand or UAE | Fallback while free |
| Holidays | Keyless API | caldays | 206 countries incl. India; CC BY 4.0 | **Ignores the year** (always 2026); local-language names only; its API page and terms page disagree on licence | Skip |
| Holidays | Keyless API | India Public Holidays | MIT; India-specific | 12.7 s cold start (free hosting); single maintainer | Later (India launch, mirrored into the DB) |
| FX | Keyless API | **Frankfurter** v1 (ECB) | "Is the API free for commercial use? Yes." (verified); no quotas; cite the ECB | Only ~30 currencies (no MAD, VND, AED, TWD, EGP) | **Use** |
| FX | Static JSON on a CDN | **fawazahmed0 currency-api** (jsDelivr, pages.dev mirror) | CC0; 340 currencies; p50 26 ms | Upstream sources undocumented | **Use** as fallback for non-ECB currencies |
| FX | Keyless API | ExchangeRate-API open endpoint | 166 currencies; commercial OK | **Attribution link required**; daily updates; 429 for 20 min if abused | Later |
| FX | — | Exchangerate.host | — | Now needs a key (APILayer), 100 requests/month | Skip |
| Country facts | API | REST Countries | — | **v3.1 deprecated**; v5 needs a key; "The Free plan is intended for prototyping, evaluation, and non-commercial use"; cache max 3 days (verified) | Skip |
| Country facts | Static data | `countries-list` (MIT) + a small Wikidata-derived table (CC0) checked by hand | Currency, languages, calling code, driving side, plugs, emergency number; no runtime calls | Needs a build step and a manual check | **Use** |
| Time | Built-in | `Intl` + IANA zone from geocoding | No API; DST-correct when computed at the trip date | — | **Use** |
| Intro | Keyless API | **Wikivoyage** REST summary, Wikipedia fallback | Travel-focused text; CC BY-SA 4.0, commercial OK; may be cached with attribution | Must send an identifying User-Agent (**10 req/min without one**, 200 with one, per Wikimedia's 2026 limits); RESTBase is being retired (no date found), so wrap it in one function | **Use** |
| Safety | Keyless API | UK FCDO travel advice (GOV.UK Content API) | OGL v3 (commercial OK); `alert_status` per country; has a "getting help" section with emergency numbers | Must stay fresh (cache hours, not days); UK perspective | Later |
| Events | Keyed APIs | Ticketmaster, PredictHQ, Eventbrite, SeatGeek | — | Ticketmaster bars deriving revenue; PredictHQ is trial then paid; **Eventbrite public search shut in Dec 2019** | Skip |
| Dead in the list | — | Teleport (DNS gone), WorldTimeAPI (unreachable), Warnely (404), Graph Countries (503) | — | — | Skip |

**Chosen approach:** holidays offline, FX from Frankfurter with the CDN currency-api as fallback, time from `Intl`, country facts from a static table, intro from Wikivoyage. One server route, no keys, nothing that bans commercial use.

## How to Run
```bash
node .planning/spikes/lab/server.mjs
```
Open http://localhost:4317/003-know-before-you-go/ and try the presets (Lisbon over New Year, Mumbai in January, Marrakesh at Eid, Hanoi in early May, Dubai from Mumbai, Tokyo Golden Week). CLI version:
```bash
node .planning/spikes/003-know-before-you-go/test-scenarios.mjs
```
Saved output: `test-scenarios.out.txt`. Spike-only dependency: `date-holidays@3.37.0` in `.planning/spikes/node_modules` (installed with `--ignore-scripts`; not part of the app).

## What to Expect
A card with Closures (public holidays in the trip), Money (1 home currency ≈ X local), Time (hours ahead or behind home *at the trip dates*), About (two sentences from Wikivoyage with a CC BY-SA credit). Below it, a table of what each source returned and how long it took.

## Observability
Lab server call log at `GET /log` (API, status, ms, bytes, cache hit).

## Investigation Trail
1. **Holidays, three sources on 8 trips:**
   - **Nager.Date** (keyless API): right where covered (Portugal incl. a regional holiday flag, Vietnam, Japan, Iceland), but **no India, Thailand or UAE**. Its country list has no `IN`, `TH` or `AE`.
   - **caldays** (keyless, CC BY 4.0, 206 countries): **ignores the year in the URL and always returns 2026** (asked 2027 and 2028 for Portugal: both came back `"year": 2026`). Fetching two years gave duplicate rows. Names are in the local language only (Arabic for the UAE). Not safe for future trips.
   - **date-holidays** (npm library, offline; not in the public-apis list): found every expected holiday, future years included. India's Republic Day on 26 Jan 2027, Morocco's Eid al-Fitr on 9 Mar 2027 (a computed lunar date), Thailand's Songkran on 13–15 Apr 2027, Japan's Golden Week. 100 lookups for India 2027 took 30 ms, with no network. Licence: ISC code, data CC BY-SA 3.0 (attribution needed). About 11 MB unpacked: server-only, never in the client bundle.
2. **Exchange rates:**
   - **Frankfurter** (ECB reference rates): only 30 currencies; **404 for MAD, VND and AED** (Morocco, Vietnam, UAE).
   - **fawazahmed0 currency-api** on jsDelivr (static JSON): 340 currencies, all found. It agrees with Frankfurter within 0.5% where both exist (GBP→INR 127.41 vs 128.02; GBP→EUR 1.1783 vs 1.1781). p50 26 ms (CDN).
   - **open.er-api.com** (ExchangeRate-API open access): 166 currencies, also complete; its terms need checking (see Research).
3. **Country facts:** **REST Countries v3.1 is deprecated.** It 301-redirects to an error saying "migrate to … v5", and v5 needs an account and an API key. The public-apis entry is out of date. Country facts (currency, languages, driving side) barely change, so a small static table shipped with the app beats any API.
4. **City intro:** Wikivoyage's REST summary found all 8 cities (p50 30 ms). One extract started with a newline (Hanoi), so it is trimmed. Wikipedia works as a fallback. Both are CC BY-SA 4.0: show the source and licence under the text.
5. **Time difference:** first version used *today's* offsets and was wrong by an hour for winter trips (London → Mumbai showed 4.5 h; at the January trip date it's 5.5 h). Fixed: compute the offset at the trip start date. Reykjavik over New Year: 0 h at the trip vs −1 h today.
6. **Speed:** the whole card (2 geocodes + 6 parallel source calls) took 91–474 ms per trip; p50 per source 26–45 ms, except caldays and Frankfurter (≈100 ms).

## Results
**Verdict: VALIDATED.** The card fills in 91–474 ms with no API keys, and every source chosen allows commercial use.

Build rules:
- Holidays come from `date-holidays` on the server, with the line "Holiday data: date-holidays (CC BY-SA 3.0)" on the Credits page. For India, add a small curated yearly list of the big moving holidays (Diwali, Holi, Eid) before an India launch (Q6).
- FX: Frankfurter first, then the CDN currency-api for currencies the ECB doesn't publish. Cache 24 h. Label it "A guide, not a quote" with the rate date, and cite the ECB.
- Time difference is computed at the trip dates, never "now".
- Wikivoyage text: store the extract, page URL, revision and licence; show "From Wikivoyage · CC BY-SA 4.0 · shortened" with a link. Send an identifying User-Agent.
- Country facts ship as static data (MIT/CC0 sources), not an API.

Evidence:
- The card is feasible with **no keys**: holidays offline (`date-holidays`), FX from the CDN currency-api, the time difference from built-in `Intl`, country facts from a static table, and the intro from Wikivoyage.
- Two list entries are traps: **caldays** returns the wrong year silently, and **REST Countries v3.1** is gone.
- Two list entries have coverage gaps that matter for Barabula's markets: **Nager.Date** has no India; **Frankfurter** has no MAD, VND or AED.
