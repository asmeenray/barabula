---
spike: 002
idea: free-apis-and-open-design
name: trip-weather
type: comparison
validates: "Given a trip city and dates, when called server-side with no key, then each trip day gets a forecast (or a 'typical' value when it is too far out), and the source's terms still allow a paid Barabula later"
verdict: VALIDATED
related: [003]
tags: [weather, open-meteo, met-norway, meteostat, climate, rate-limits]
---

# Spike 002: Trip weather (Open-Meteo vs MET Norway, plus climate sources)

## What This Validates
Given a trip city and dates,
when the server asks for weather with no API key,
then every trip day shows a forecast when it is inside the forecast window and a 10-year "typical" value when it isn't,
and the source's terms survive Barabula's planned monetisation (phase 20).

Uses in the roadmap: weather on the trip plan (16.1), the climate tags for the ~40 curated cities that phase 16 needs (16-CONTEXT D-16: "Tags must come from real climate data"), the Today view (19), and "It's raining, swap this afternoon" in Ask (20).

## Research

Terms checked on the providers' own pages, 6 Oct 2026. I re-checked the deciding lines myself.

| Approach | Source | Pros | Cons | Status |
|---|---|---|---|---|
| Forecast A | **Open-Meteo** forecast | Keyless; 16 days; daily aggregates in local time; p50 35–44 ms; rain probability; one call | Free tier is **non-commercial only**. Verified: "You may only use the free API services for non-commercial purposes", and "websites or apps that have subscriptions or display advertisements" count as commercial | **Use now**; plan the switch before phase 20 |
| Forecast B | **MET Norway** Locationforecast 2.0 `complete` | Free **including commercial use** (NLOD 2.0 + CC BY 4.0, credit «Data from MET Norway»); p50 43–51 ms; global (ECMWF ~9 km outside the Nordics) | ~9.5 days only; hourly for ~2.6 days then 6-hourly; UTC steps you roll up into local days yourself; **no rain probability** outside the Nordics; must send an identifying User-Agent, honour `Expires` / `If-Modified-Since`, max 4 decimals in coordinates | **Use when monetising** |
| Typical A | **Open-Meteo ERA5 archive** | Keyless; daily history 1940 to ~5 days ago; data CC BY 4.0, so results may be stored | Non-commercial on free. Commercially, the historical and climate APIs "require the Professional API Plan or higher" (verified). Calls are **weighted** (see trail) | Use now; cache hard |
| Typical B | **Meteostat** bulk monthly CSV | Keyless bulk files; CC BY 4.0 "even commercially" (verified); station data back to 1901 for Lisbon | Station-based (needs a station lookup; Lisbon 08535 has 8–10 of the last 10 years per month); JSON API needs a RapidAPI key (500/month) | **Use for the curated-city climate tags** |
| Typical C | NASA POWER climatology | One keyless call returns monthly means directly | Coarse grid runs cool on coasts (the subagent saw Lisbon July 19.9 °C vs the station's 22.6 °C); commercial terms not stated | Skip |
| Others | WeatherAPI.com, Visual Crossing, OpenWeatherMap One Call 4.0 | Commercial use allowed on free tiers | Keys; WeatherAPI forecasts may be cached 24 h at most and only 3 days ahead on free; Visual Crossing forbids storing for external sharing; One Call 3.0 is now "[deprecated]" | Backup only |
| Traps in the list | Pirate Weather, Tomorrow.io, Weatherbit, Weatherstack, 7Timer! | — | All forbid commercial use on free. **APIXU is dead** (redirects to Weatherstack). **Meltema** timed out 3 times. **Pirate Weather now needs a key** (the list says "No"). Terrace Weather is a wrapper around Open-Meteo | Skip |

**Open-Meteo paid plans** (pricing page, verified): Standard 1M calls/month, Professional 5M calls/month, both commercial. The subagent read €29 and €99 a month, but the prices are not in the page text I could fetch, so they are **UNVERIFIED**.

**Chosen approach:** Open-Meteo for everything while Barabula is free. Before phase 20, move the forecast to MET Norway (or pay Open-Meteo), and make "typical" come from data stored in our own DB: Meteostat station normals, or ERA5 fetched while still non-commercial (CC BY 4.0 lets us keep it).

## How to Run
```bash
node .planning/spikes/lab/server.mjs
```
Open http://localhost:4317/002-trip-weather/ and try the presets (Next week, Spans the forecast edge, In 3 months, Whole month). CLI, 7 cities × 3 scenarios plus edge cases:
```bash
node .planning/spikes/002-trip-weather/test-scenarios.mjs
```
Saved output: `test-scenarios.out.txt`. Lisbon station vs ERA5 normals: `lisbon-normals-meteostat-vs-era5.csv`.

## What to Expect
A board of day cards. Days inside the window show Open-Meteo (OM) and MET Norway side by side, with a "Highs differ by X°" note when they disagree by 2 °C or more. Days further out show a grey "Typical" tag with the 10-year average and "Rain on N% of days".

## Observability
The lab server logs every outbound call (API, status, ms, bytes, cache hit) with an export at `GET /log`. The page shows the last 30 calls under "Call log".

## Investigation Trail
1. **Shapes.** Open-Meteo returns daily aggregates in the city's time zone; MET Norway returns 90 UTC steps (62 hourly, then 6-hourly) to about +9.5 days. MET's `compact` endpoint has no 6-hour max/min, so daily highs from it undersample the afternoon. **Switched to `complete`**, which has `air_temperature_max/min` per 6 hours.
2. **MET rules in practice:** it answered 200 with no User-Agent and with 5-decimal coordinates. Its terms still require both (a fake or missing UA risks a ban), so the code sends an identifying UA and rounds to 4 decimals.
3. **Open-Meteo window:** `forecast_days` allows 0–16. The error for 17 says "Given 16", which is off by one. `start_date/end_date` beyond today + 15 gives HTTP 400.
4. **Surprise 1: quota weighting.** The first "typical" design fetched 10 full years in one call (3,653 days, 100 KB, 0.4–0.6 s). After a few cities: `429 Minutely API request limit exceeded`. Verified rule: requests over 2 weeks or over 10 variables count as several calls. One 10-year call ≈ 261 calls, so the 600/minute limit allows 2 trips a minute and the 10,000/day limit about 38 trips a day.
5. **Fix: narrow per-year calls.** One small call per year for the trip window ± 3 days: 10 calls ≈ 10 quota units, about 26× cheaper, 160–290 ms. The ±3-day window gives up to 70 samples per day (7 days × 10 years).
6. **Surprise 2: a concurrency limit.** Ten parallel yearly calls gave `429 Too many concurrent requests`. Fix: at most 3 at a time, with one retry after 1.5 s.
7. **Surprise 3: the date line.** Tokyo, Sydney and Auckland got `400 end_date out of allowed range`. Their local date was already tomorrow, but Open-Meteo counts the window from the UTC date. Fix: compute the horizon from the UTC date.
8. **Edge cases after the fixes, all passing:** 7 cities × 3 scenarios (next week, spanning the forecast edge, 3 months out); a trip in the past; a 32-day trip (rejected); end before start (rejected); a trip across New Year (the window spans two years); 29 Feb in a leap year (n=63 samples, because 29 Feb exists in only some past years). Final run: **220 calls, 0 errors**. p50: forecast 35 ms, MET 43 ms, archive 41 ms.
9. **The two forecasts disagree most in Lisbon.** Average gap in daily highs over 4 days: Lisbon 2.9 °C (worst 3.7), Marrakesh 1.3, Mumbai 1.1, Tokyo 1.0, Auckland 0.8, Reykjavik 0.7, Sydney 0.7. Lisbon is coastal and hilly, and the model grids differ. Showing one source per day (not both) is the calmer product choice; the gap is a reminder that forecasts beyond a few days are rough.
10. **Long-range forecasts vs typical:** for Lisbon, days 12–15 out showed 11–18 °C with drizzle while the 10-year typical for the following days was 15–21 °C. Days 8–16 of any forecast have low skill. A product idea: show "typical" next to the forecast for days more than a week out.
11. **Climate sources for the curated cities (D-16).** Meteostat's Lisbon station (08535) vs ERA5, monthly means 2016–2025: highs within 0.4–1.4 °C (ERA5 slightly cooler every month), lows within 0.4–0.9 °C, rainfall similar (e.g. Nov 88 vs 90 mm). Either can produce "warm in March" tags; **Meteostat is the one that stays free after monetisation**.

## Results
**Verdict: VALIDATED.** Every trip day can get weather server-side with no key, under 300 ms, across hemispheres, time zones, year ends and leap days.

- **Winner now:** Open-Meteo for both forecast and typical (one provider, one attribution line: "Weather data by Open-Meteo.com", CC BY 4.0).
- **Winner after monetisation:** MET Norway for the forecast (free and commercial) and **stored normals** for "typical": Meteostat station data or ERA5 fetched while non-commercial. Otherwise Open-Meteo Professional is required, because the Standard plan excludes historical and climate data.
- **Build rules that fell out of the spike:** server route only; per-year narrow archive calls, at most 3 at a time; cache the forecast for 1 h and typical values for 30 days, keyed by city and month; horizon from the UTC date; MET via `complete` with an identifying UA and 4-decimal coordinates; label "Forecast" vs "Typical" on every day.
- **For the curated-city climate tags (phase 16, D-16):** a one-off script over ~40 cities. Using Meteostat monthly bulk CSVs, it is about 40 small downloads. Using Open-Meteo ERA5, one 10-year call per city costs ~261 quota units, so 40 cities ≈ 10,440 units, more than one day's 10,000. Spread it over 2 days, or run it at ≤ 19 cities an hour.
