// One GET per documentation link in the categories that matter to Barabula, to measure how stale the list is.
// Run: node .planning/spikes/001-public-apis-triage/check-links.mjs
import fs from 'node:fs';
const here = new URL('.', import.meta.url).pathname;
const r = JSON.parse(fs.readFileSync(here + 'apis.json', 'utf8'));
const cats = ['Weather', 'Geocoding', 'Transportation', 'Calendar', 'Currency Exchange', 'Environment', 'Events', 'Open Data', 'Photography', 'Food & Drink'];
const rows = r.filter((x) => cats.includes(x.cat) && /^https?:/.test(x.url));
const UA = 'Mozilla/5.0 (compatible; barabula-spike/0.1; +https://github.com/asmeenray/barabula)';
const out = [];
let i = 0;
async function worker() {
  while (i < rows.length) {
    const x = rows[i++];
    const t0 = performance.now();
    let status = 0, finalUrl = '', err = '';
    try {
      const res = await fetch(x.url, { redirect: 'follow', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000) });
      status = res.status; finalUrl = res.url; await res.body?.cancel();
    } catch (e) { err = String(e?.cause?.code || e?.name || e).slice(0, 40); }
    out.push({ cat: x.cat, name: x.name, url: x.url, status, err, sameHost: finalUrl ? new URL(finalUrl).host === new URL(x.url).host : null, ms: Math.round(performance.now() - t0) });
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
fs.writeFileSync(here + 'link-check.json', JSON.stringify(out, null, 1));
const bucket = (o) => (o.err ? `error:${o.err}` : o.status >= 200 && o.status < 300 ? (o.sameHost ? 'ok' : 'ok-moved-host') : o.status === 403 || o.status === 401 || o.status === 429 ? 'blocked-bot(' + o.status + ')' : 'http-' + o.status);
const sum = {}; for (const o of out) { const b = bucket(o); sum[b] = (sum[b] || 0) + 1; }
console.log('checked', out.length, sum);
const byCat = {}; for (const o of out) { const c = (byCat[o.cat] ||= { n: 0, ok: 0, dead: 0 }); c.n++; const b = bucket(o); if (b.startsWith('ok')) c.ok++; else if (b.startsWith('error') || b === 'http-404' || b === 'http-410' || b.startsWith('http-5')) c.dead++; }
console.table(byCat);
