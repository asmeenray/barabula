# Weather (trip days, typical weather, city climate tags)

## Requirements
- All external calls run in a server route with an identifying User-Agent and a cache; never from the browser.
- Every value shown comes from a real call or stored real data; label each day "Forecast" or "Typical".
- Terms must survive monetisation (phase 20). Provider after monetising is **decided at phase 20** (handover Q39); Open-Meteo until then.
- Prefer stored data (climate normals) over live calls for facts that rarely change.

## How to Build It
1. **Forecast (≤ 16 days):** Open-Meteo, keyless.
   `https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=<IANA>&start_date=..&end_date=..`
   - Compute the horizon from the **UTC date**: `horizonEnd = utcToday + 15`. A local-date horizon gives HTTP 400 east of UTC (Tokyo, Sydney, Auckland).
2. **Typical weather (days beyond the horizon):** Open-Meteo ERA5 archive, **one small call per past year** for the trip window ±3 days (10 years → 10 calls ≈ 10 quota units). Run **at most 3 at a time**, retry a 429 once after 1.5 s. Aggregate per calendar day over a ±3-day window (up to 70 samples): mean max, mean min, % of days with ≥ 1 mm rain.
   - Window across New Year: shift start/end years separately. 29 Feb in a non-leap year → use 28 Feb.
3. **Cache:** forecast 1 h; typical values 30 days keyed by (city, month).
4. **Curated-city climate tags (phase 16, D-16):** one-off script → stored JSON. Prefer **Meteostat bulk monthly CSV** (`https://bulk.meteostat.net/v2/monthly/<station>.csv.gz`, CC BY 4.0, commercial OK; columns `year,month,tavg,tmin,tmax,prcp,...`; station list `bulk.meteostat.net/v2/stations/lite.json.gz`). ERA5 as a cross-check (Lisbon: within 0.4–1.4 °C a month).
5. **Switch path (phase 20):** MET Norway Locationforecast 2.0 **`complete`** endpoint (not `compact`: only `complete` has 6-hour `air_temperature_max/min`). Send an identifying UA, round coords to 4 decimals, honour `Expires`/`If-Modified-Since`. Roll UTC steps into local days: use `next_1_hours` rain while steps are hourly, `next_6_hours` after; ignore partial days with < 3 steps.
6. **Attribution (Credits page):** "Weather data by Open-Meteo.com" (CC BY 4.0); later «Data from MET Norway»; "Meteostat and its data providers".

Working code: `sources/002-trip-weather/api.mjs`.

## What to Avoid
- One 10-year archive call per trip: weighted at ~261 calls → per-minute 429 after 2–3 cities, ~38 trips/day.
- 10 parallel archive calls → `429 Too many concurrent requests`.
- MET `compact` for daily highs (undersamples afternoons).
- Showing Open-Meteo and MET side by side to users: they differ by 2.9 °C on Lisbon highs; pick one per day.
- Trusting days 8–16 of a forecast; consider showing "typical" alongside.
- Pirate Weather, Tomorrow.io, Weatherbit, Weatherstack, 7Timer! (non-commercial free tiers); APIXU (dead); Meltema (down); NASA POWER (cool on coasts).

## Constraints
- Open-Meteo free: non-commercial only ("subscriptions or display advertisements" = commercial); 600/min, 5,000/h, 10,000/day; requests > 2 weeks or > 10 variables count as multiple calls; historical/climate need the Professional plan commercially (price not shown on page).
- Open-Meteo `forecast_days` 0–16; past data in forecast API ~3 months.
- MET Norway: ~9.5 days; hourly for ~2.6 days then 6-hourly; no rain probability outside the Nordics; 20 req/s per app.
- Latency (p50): forecast 35 ms, MET 43 ms, archive 41 ms.

## Origin
Synthesized from spikes: 002 (and 001 for the terms triage)
Source files available in: sources/002-trip-weather/
