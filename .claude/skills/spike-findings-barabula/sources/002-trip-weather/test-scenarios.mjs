// Runs the spike 002 handler for several cities and date scenarios and prints what came back.
// Run: node .planning/spikes/002-trip-weather/test-scenarios.mjs
import { handlers } from './api.mjs';

const UA = 'barabula-spike/0.1 (+https://github.com/asmeenray/barabula)';
const log = [];
const ctx = {
  fetch: async (url, { api } = {}) => {
    const t0 = performance.now();
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const text = await res.text();
    const ms = Math.round(performance.now() - t0);
    log.push({ api, status: res.status, ms, bytes: text.length });
    return { ok: res.ok, status: res.status, text, json: () => JSON.parse(text), ms };
  },
};

const iso = (d) => d.toISOString().slice(0, 10);
const plus = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

const cities = ['Lisbon', 'Tokyo', 'Reykjavik', 'Marrakesh', 'Mumbai', 'Sydney', 'Auckland'];
const scenarios = [
  { name: 'next week (4 days)', start: plus(3), end: plus(6) },
  { name: 'spans the horizon', start: plus(12), end: plus(19) },
  { name: 'three months out', start: plus(90), end: plus(93) },
];

const rows = [];
for (const q of cities) {
  const g = await handlers.geocode({ q }, ctx);
  const c = g.results?.[0];
  if (!c) { console.log('no geocode for', q); continue; }
  for (const s of scenarios) {
    const w = await handlers.weather({ lat: c.lat, lon: c.lon, tz: c.tz, start: s.start, end: s.end }, ctx);
    if (w.error) { console.log(q, s.name, 'ERROR', w.error); continue; }
    const kinds = w.days.reduce((a, d) => ((a[d.kind] = (a[d.kind] || 0) + 1), a), {});
    const both = w.days.filter((d) => d.openMeteo && d.met);
    const dMax = both.map((d) => Math.abs(d.openMeteo.max - d.met.max));
    const metMissing = w.days.filter((d) => d.kind === 'forecast' && !d.met).length;
    rows.push({
      city: `${c.name}, ${c.countryCode}`, scenario: s.name, days: w.days.length,
      kinds: JSON.stringify(kinds), metMissing,
      maxDiffAvg: dMax.length ? +(dMax.reduce((a, b) => a + b, 0) / dMax.length).toFixed(1) : '-',
      maxDiffWorst: dMax.length ? +Math.max(...dMax).toFixed(1) : '-',
      sample: (() => { const d = w.days[0]; const v = d.openMeteo || d.typical; return v ? `${d.day} ${v.min}–${v.max}°C rain ${v.rainChance ?? '?'}% ${v.label || '(typical)'}` : '-'; })(),
      ms: JSON.stringify(w.timings),
      errors: Object.values(w.errors).filter(Boolean).join('; ') || '',
    });
  }
}
console.table(rows);

// Edge cases.
const lis = (await handlers.geocode({ q: 'Lisbon' }, ctx)).results[0];
const edge = [
  ['trip in the past', { start: plus(-20), end: plus(-17) }],
  ['32-day trip (rejected)', { start: plus(1), end: plus(32) }],
  ['end before start', { start: plus(5), end: plus(2) }],
  ['crosses year end (typical)', { start: '2026-12-29', end: '2027-01-02' }],
  ['29 Feb in a leap year (typical)', { start: '2028-02-28', end: '2028-03-01' }],
];
for (const [name, p] of edge) {
  const w = await handlers.weather({ lat: lis.lat, lon: lis.lon, tz: lis.tz, ...p }, ctx);
  console.log(`\n${name}:`, w.error || w.days.map((d) => `${d.day} ${d.kind} ${d.typical ? `${d.typical.min}–${d.typical.max}°C rain ${d.typical.rainChance}% n=${d.typical.samples}` : d.openMeteo ? `${d.openMeteo.min}–${d.openMeteo.max}°C` : '∅'}`).join(' | '), w.errors ? JSON.stringify(w.errors) : '');
}

// Latency summary by API.
const by = {};
for (const e of log) { const s = (by[e.api] ||= { calls: 0, errors: 0, ms: [] }); s.calls++; if (e.status >= 400) s.errors++; s.ms.push(e.ms); }
console.log('\nLatency by API (ms):');
console.table(Object.fromEntries(Object.entries(by).map(([k, s]) => { const m = s.ms.sort((a, b) => a - b); return [k, { calls: s.calls, errors: s.errors, p50: m[Math.floor(m.length / 2)], p90: m[Math.floor(m.length * 0.9)], max: m.at(-1) }]; })));
