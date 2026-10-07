// Walk-time comparison on real trip days. Run: node .planning/spikes/004-walking-times/test-days.mjs
import { handlers } from './api.mjs';
const UA = 'barabula-spike/0.1 (+https://github.com/asmeenray/barabula)';
const calls = [];
const ctx = { fetch: async (url, { api } = {}) => { const t0 = performance.now(); let status = 0, text = ''; try { const r = await fetch(url, { headers: { 'User-Agent': UA } }); status = r.status; text = await r.text(); } catch (e) { text = String(e); } const ms = Math.round(performance.now() - t0); calls.push({ api, status, ms }); return { ok: status >= 200 && status < 300, status, text, json: () => JSON.parse(text), ms }; } };

const days = [
  ['Lisbon (hilly)', 'Lisbon', 'Castelo de São Jorge|Miradouro da Graça|Time Out Market|LX Factory|Pastéis de Belém|Torre de Belém'],
  ['Amsterdam (flat, canals)', 'Amsterdam', 'Rijksmuseum|Anne Frank House|Dam Square|Vondelpark'],
  ['Venice (canals)', 'Venice', "Gallerie dell'Accademia|Ponte di Rialto|Piazza San Marco|Arsenale di Venezia"],
  ['Istanbul (water crossing)', 'Istanbul', 'Hagia Sophia|Grand Bazaar|Galata Tower|Kadıköy Pier'],
];
const all = [];
for (const [label, city, names] of days) {
  const { places } = await handlers.places({ names, city }, ctx);
  const bad = places.filter((p) => p.error);
  if (bad.length) console.log(label, 'geocode misses:', bad.map((b) => b.name).join(', '));
  const ok = places.filter((p) => !p.error);
  const { legs } = await handlers.legs({ pts: JSON.stringify(ok) }, ctx);
  console.log(`\n${label}`);
  console.table(legs.map((l) => ({ leg: `${l.from} → ${l.to}`.slice(0, 48), crowKm: l.crowKm, est: `${l.estimate.min}m/${l.estimate.km}km`, osrmDemo: l.osrmDemo.error ?? `${l.osrmDemo.min}m/${l.osrmDemo.km}km`, fossgisOsrm: l.fossgisOsrmFoot.error ?? `${l.fossgisOsrmFoot.min}m/${l.fossgisOsrmFoot.km}km`, valhalla: l.fossgisValhalla.error ?? `${l.fossgisValhalla.min}m/${l.fossgisValhalla.km}km` })));
  all.push(...legs.map((l) => ({ ...l, label })));
}
// How far is the straight-line estimate from the routed walking time?
const ref = all.filter((l) => l.fossgisValhalla.min != null);
const err = ref.map((l) => ({ leg: `${l.from}→${l.to}`, est: l.estimate.min, routed: l.fossgisValhalla.min, pct: Math.round((100 * (l.estimate.min - l.fossgisValhalla.min)) / l.fossgisValhalla.min), detour: +(l.fossgisValhalla.km / l.crowKm).toFixed(2) }));
console.log('\nEstimate vs Valhalla pedestrian (reference):');
console.table(err);
const abs = err.map((e) => Math.abs(e.pct)).sort((a, b) => a - b);
console.log('median |error| %', abs[Math.floor(abs.length / 2)], '| worst', abs.at(-1), '| detour factor range', Math.min(...err.map((e) => e.detour)), '–', Math.max(...err.map((e) => e.detour)));
const by = {}; for (const e of calls) { const s = (by[e.api] ||= { calls: 0, errors: 0, ms: [] }); s.calls++; if (e.status >= 400 || !e.status) s.errors++; s.ms.push(e.ms); }
console.table(Object.fromEntries(Object.entries(by).map(([k, s]) => { const m = s.ms.sort((a, b) => a - b); return [k, { calls: s.calls, errors: s.errors, p50: m[Math.floor(m.length / 2)], max: m.at(-1) }]; })));
