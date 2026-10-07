// Spike 002 server side: weather for each day of a trip.
// Days inside the forecast horizon get a forecast (Open-Meteo and MET Norway side by side);
// days beyond it get a "typical" value from the last 10 years of Open-Meteo's ERA5 archive.

const OM_FORECAST = 'https://api.open-meteo.com/v1/forecast';
const OM_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
const OM_GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';
// 'complete' (not 'compact'): only it has 6-hour air_temperature_max/min, needed for honest daily highs.
const MET = 'https://api.met.no/weatherapi/locationforecast/2.0/complete';
const OM_HORIZON_DAYS = 16; // today + 15
const CLIMATE_YEARS = 10;

// WMO weather codes (Open-Meteo) → short label.
const WMO = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 85: 'Snow showers', 86: 'Snow showers', 95: 'Thunder', 96: 'Thunder + hail', 99: 'Thunder + hail' };

// MET Norway symbol_code → same label set.
function metLabel(code = '') {
  const c = code.replace(/_(day|night|polartwilight)$/, '');
  if (c.includes('thunder')) return 'Thunder';
  if (c.includes('snow')) return c.includes('showers') ? 'Snow showers' : 'Snow';
  if (c.includes('sleet')) return 'Sleet';
  if (c.includes('rainshowers')) return 'Showers';
  if (c.includes('heavyrain')) return 'Heavy rain';
  if (c.includes('lightrain')) return 'Light rain';
  if (c.includes('rain')) return 'Rain';
  if (c === 'fog') return 'Fog';
  if (c === 'clearsky') return 'Clear';
  if (c === 'fair') return 'Mostly clear';
  if (c === 'partlycloudy') return 'Partly cloudy';
  if (c === 'cloudy') return 'Cloudy';
  return c || '—';
}

const round4 = (n) => Math.round(Number(n) * 1e4) / 1e4; // MET asks for at most 4 decimals
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5);
const localDate = (utcIso, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(utcIso));
const todayIn = (tz) => localDate(new Date().toISOString(), tz);
// 29 Feb only exists in leap years; shift to 28 Feb when a past year has none.
const fixLeap = (d) => (d.endsWith('-02-29') && new Date(d + 'T00:00:00Z').getUTCDate() !== 29 ? d.slice(0, 8) + '28' : d);

export const handlers = {
  async geocode({ q }, { fetch }) {
    const r = await fetch(`${OM_GEOCODE}?name=${encodeURIComponent(q)}&count=5&language=en&format=json`, { api: 'open-meteo-geocoding', ttlSec: 86400 });
    if (!r.ok) return { error: `geocoding ${r.status}`, ms: r.ms };
    const j = r.json();
    return { ms: r.ms, results: (j.results || []).map((x) => ({ name: x.name, country: x.country, countryCode: x.country_code, admin1: x.admin1, lat: x.latitude, lon: x.longitude, tz: x.timezone, population: x.population })) };
  },

  async weather({ lat, lon, tz, start, end, strategy = 'narrow' }, { fetch }) {
    lat = round4(lat); lon = round4(lon);
    const today = todayIn(tz);
    // Open-Meteo's forecast window is counted from the UTC date. East of UTC (Tokyo, Sydney, Auckland) the
    // local date can already be tomorrow, so a local-date horizon asks for one day too many (HTTP 400).
    const horizonEnd = addDays(iso(new Date()), OM_HORIZON_DAYS - 1);
    const n = daysBetween(start, end) + 1;
    if (!(n >= 1 && n <= 31)) return { error: 'Trip must be 1–31 days' };
    const tripDays = Array.from({ length: n }, (_, i) => addDays(start, i));
    const inForecast = tripDays.filter((d) => d >= today && d <= horizonEnd);
    const needClimate = tripDays.filter((d) => d > horizonEnd || d < today);
    const timings = {};
    const jobs = [];

    // 1) Open-Meteo forecast (only if some trip days are inside its 16-day window).
    let om = {};
    if (inForecast.length) jobs.push((async () => {
      const url = `${OM_FORECAST}?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=${encodeURIComponent(tz)}&start_date=${inForecast[0]}&end_date=${inForecast.at(-1)}`;
      const r = await fetch(url, { api: 'open-meteo-forecast', ttlSec: 3600 });
      timings.openMeteo = r.ms;
      if (!r.ok) { om.error = `${r.status} ${r.text.slice(0, 120)}`; return; }
      const d = r.json().daily;
      d.time.forEach((t, i) => { om[t] = { max: d.temperature_2m_max[i], min: d.temperature_2m_min[i], rainMm: d.precipitation_sum[i], rainChance: d.precipitation_probability_max[i], label: WMO[d.weather_code[i]] ?? String(d.weather_code[i]) }; });
    })());

    // 2) MET Norway Locationforecast (horizon ≈ 9–10 days). Timestamps are UTC; group by local day.
    let met = {};
    if (inForecast.length) jobs.push((async () => {
      const r = await fetch(`${MET}?lat=${lat}&lon=${lon}`, { api: 'met-norway', ttlSec: 1800 });
      timings.met = r.ms;
      if (!r.ok) { met.error = `${r.status}`; return; }
      const ts = r.json().properties.timeseries;
      met.lastStep = ts.at(-1)?.time;
      for (let i = 0; i < ts.length; i++) {
        const step = ts[i];
        const day = localDate(step.time, tz);
        const m = (met[day] ||= { max: -99, min: 99, rainMm: 0, symbols: {}, steps: 0 });
        const t = step.data.instant.details.air_temperature;
        const n6 = step.data.next_6_hours?.details || {};
        m.max = Math.max(m.max, t, n6.air_temperature_max ?? -99);
        m.min = Math.min(m.min, t, n6.air_temperature_min ?? 99);
        m.steps++;
        // Sum rain once: next_1_hours while the series is hourly (~first 2.5 days), next_6_hours after.
        const hourly = i < ts.length - 1 && new Date(ts[i + 1].time) - new Date(step.time) === 36e5;
        m.rainMm += hourly ? (step.data.next_1_hours?.details?.precipitation_amount ?? 0) : (n6.precipitation_amount ?? 0);
        const sym = step.data.next_6_hours?.summary?.symbol_code || step.data.next_1_hours?.summary?.symbol_code;
        const hourLocal = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(new Date(step.time)));
        if (sym && hourLocal >= 6 && hourLocal <= 18) m.symbols[sym] = (m.symbols[sym] || 0) + 1; // daytime symbol
      }
      for (const [day, m] of Object.entries(met)) {
        if (typeof m !== 'object' || !m.symbols) continue;
        const top = Object.entries(m.symbols).sort((a, b) => b[1] - a[1])[0]?.[0];
        m.label = metLabel(top); m.rainMm = Math.round(m.rainMm * 10) / 10; delete m.symbols;
      }
    })());

    // 3) Typical weather for days beyond the forecast: the same calendar days over the last 10 full years.
    //    strategy=narrow (default): one small archive call per year for the trip window ±3 days.
    //    strategy=wide: one call for 10 full years (simple, but Open-Meteo weights calls by days of data,
    //    so it costs hundreds of quota units and trips the per-minute limit; see README).
    let climate = {};
    if (needClimate.length) jobs.push((async () => {
      const lastYear = Number(today.slice(0, 4)) - 1;
      const firstYear = lastYear - CLIMATE_YEARS + 1;
      const vars = 'daily=temperature_2m_max,temperature_2m_min,precipitation_sum';
      const winStart = addDays(needClimate[0], -3), winEnd = addDays(needClimate.at(-1), 3);
      const spanYears = Number(winEnd.slice(0, 4)) - Number(winStart.slice(0, 4));
      const urls = strategy === 'wide'
        ? [`${OM_ARCHIVE}?latitude=${lat}&longitude=${lon}&start_date=${firstYear}-01-01&end_date=${lastYear}-12-31&${vars}&timezone=${encodeURIComponent(tz)}`]
        : Array.from({ length: CLIMATE_YEARS }, (_, k) => {
            const y = firstYear + k;
            const s0 = `${y}${winStart.slice(4)}`, e0 = `${y + spanYears}${winEnd.slice(4)}`;
            return `${OM_ARCHIVE}?latitude=${lat}&longitude=${lon}&start_date=${fixLeap(s0)}&end_date=${fixLeap(e0)}&${vars}&timezone=${encodeURIComponent(tz)}`;
          });
      const t0 = performance.now();
      // Open-Meteo also limits concurrent requests per IP (429 "Too many concurrent requests"), so run at most
      // 3 at a time and retry a 429 once after a short pause.
      const one = async (u) => {
        let r = await fetch(u, { api: 'open-meteo-archive', ttlSec: 30 * 86400 });
        if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 1500)); r = await fetch(u, { api: 'open-meteo-archive', ttlSec: 30 * 86400 }); }
        return r;
      };
      const results = [];
      for (let k = 0; k < urls.length; k += 3) results.push(...(await Promise.all(urls.slice(k, k + 3).map(one))));
      timings.archive = Math.round(performance.now() - t0);
      timings.archiveCalls = urls.length;
      timings.archiveDaysOfData = 0;
      const bad = results.find((r) => !r.ok);
      if (bad) { climate.error = `${bad.status} ${bad.text.slice(0, 120)}`; return; }
      const byMd = {};
      for (const r of results) {
        const d = r.json().daily;
        timings.archiveDaysOfData += d.time.length;
        d.time.forEach((t, i) => { (byMd[t.slice(5)] ||= []).push({ max: d.temperature_2m_max[i], min: d.temperature_2m_min[i], rain: d.precipitation_sum[i] }); });
      }
      for (const day of needClimate) {
        // ±3-day window smooths single odd days: 7 days × 10 years = up to 70 samples.
        const samples = [];
        for (let k = -3; k <= 3; k++) samples.push(...(byMd[addDays(day, k).slice(5)] || []));
        const ok = samples.filter((s) => s.max != null);
        if (!ok.length) continue;
        const avg = (f) => Math.round((ok.reduce((a, s) => a + f(s), 0) / ok.length) * 10) / 10;
        climate[day] = { max: avg((s) => s.max), min: avg((s) => s.min), rainChance: Math.round((100 * ok.filter((s) => s.rain >= 1).length) / ok.length), rainMm: avg((s) => s.rain), samples: ok.length, years: `${firstYear}–${lastYear}` };
      }
    })());

    const t0 = performance.now();
    await Promise.all(jobs);
    timings.total = Math.round(performance.now() - t0);

    const days = tripDays.map((day) => ({
      day,
      kind: day < today ? 'past' : day <= horizonEnd ? 'forecast' : 'typical',
      openMeteo: om[day] || null,
      met: met[day] && met[day].steps >= 3 ? met[day] : null, // partial last day (1–2 steps) → treat as missing
      typical: climate[day] || null,
    }));
    return { today, horizonEnd, metLastStep: met.lastStep || null, coords: { lat, lon }, tz, timings, errors: { openMeteo: om.error, met: met.error, archive: climate.error }, days };
  },
};
