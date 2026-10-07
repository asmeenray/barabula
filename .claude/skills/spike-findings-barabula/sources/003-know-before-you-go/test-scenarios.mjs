// Runs the spike 003 card for trips that stress coverage. Run: node .planning/spikes/003-know-before-you-go/test-scenarios.mjs
import { handlers } from './api.mjs';
const UA = 'barabula-spike/0.1 (+https://github.com/asmeenray/barabula)';
const calls = [];
const ctx = { fetch: async (url, { api } = {}) => { const t0 = performance.now(); let res, text = '', status = 0; try { res = await fetch(url, { headers: { 'User-Agent': UA } }); status = res.status; text = await res.text(); } catch (e) { text = String(e); } const ms = Math.round(performance.now() - t0); calls.push({ api, status, ms }); return { ok: status >= 200 && status < 400, status, text, json: () => JSON.parse(text), ms }; } };

const trips = [
  ['Lisbon', 'London', '2026-12-20', '2027-01-03'],
  ['Mumbai', 'London', '2027-01-20', '2027-01-28'],
  ['Marrakesh', 'London', '2027-03-18', '2027-03-23'],
  ['Hanoi', 'London', '2027-04-28', '2027-05-03'],
  ['Dubai', 'Mumbai', '2026-12-01', '2026-12-05'],
  ['Tokyo', 'London', '2027-04-29', '2027-05-06'],
  ['Granada', 'London', '2027-02-10', '2027-02-14'],
  ['Reykjavik', 'London', '2026-12-30', '2027-01-02'],
];
const rows = [];
for (const [dest, home, start, end] of trips) {
  const c = await handlers.card({ dest, home, start, end }, ctx);
  if (c.error) { rows.push({ trip: dest, error: c.error }); continue; }
  const h = (x) => (Array.isArray(x) ? `${x.length}: ${x.map((y) => `${y.date.slice(5)} ${y.name}${y.national === false ? ' (regional)' : ''}`).join('; ')}` : `ERR ${x?.error}`);
  rows.push({
    trip: `${c.dest.name}, ${c.dest.cc} ${start}→${end}`,
    offline: h(c.holidays.offline).slice(0, 110),
    nager: h(c.holidays.nager).slice(0, 90),
    caldays: h(c.holidays.caldays).slice(0, 90),
    fx: `${c.currency.home}→${c.currency.dest}: frank=${c.currency.rate.frankfurter?.rate ?? c.currency.rate.frankfurter?.error ?? '—'} cdn=${c.currency.rate.currencyApi?.rate?.toFixed?.(4) ?? '—'}`,
    intro: c.intro ? `${c.intro.host}: ${c.intro.extract.slice(0, 60)}…` : `none ${JSON.stringify(c.introDebug)}`,
    tdiff: `${c.time.diffHours} h at trip start (${c.time.diffHoursToday} h today)`,
    ms: c.timings.total,
  });
}
for (const r of rows) console.log(JSON.stringify(r, null, 1));
const by = {}; for (const e of calls) { const s = (by[e.api] ||= { calls: 0, errors: 0, ms: [] }); s.calls++; if (e.status >= 400 || !e.status) s.errors++; s.ms.push(e.ms); }
console.table(Object.fromEntries(Object.entries(by).map(([k, s]) => { const m = s.ms.sort((a, b) => a - b); return [k, { calls: s.calls, errors: s.errors, p50: m[Math.floor(m.length / 2)], max: m.at(-1) }]; })));
