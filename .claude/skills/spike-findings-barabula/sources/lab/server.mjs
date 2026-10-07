// Spike lab server: serves each spike's index.html and runs its api.mjs server-side,
// the same shape as a Next.js route handler (keys and User-Agent stay on the server).
// No dependencies. Run: node .planning/spikes/lab/server.mjs  →  http://localhost:4317
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PORT = Number(process.env.PORT || 4317);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'barabula-spike/0.1 (+https://github.com/asmeenray/barabula)';

// Forensic log: every outbound call, with timing, status, size and cache result.
const events = [];
const startedAt = new Date().toISOString();
const cache = new Map(); // url -> { at, ttl, status, body, ms }

function logEvent(e) {
  events.push({ ts: new Date().toISOString(), ...e });
  if (events.length > 2000) events.shift();
}

async function fetchLogged(url, { spike, api, ttlSec = 600, headers = {} } = {}) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < hit.ttl * 1000) {
    logEvent({ cat: 'call', spike, api, url, status: hit.status, ms: 0, bytes: hit.body.length, cache: 'hit' });
    return { status: hit.status, ok: hit.status < 400, text: hit.body, json: () => JSON.parse(hit.body), ms: 0, cache: 'hit' };
  }
  const t0 = performance.now();
  let status = 0, body = '', error;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(20000) });
    status = res.status;
    body = await res.text();
  } catch (err) {
    error = String(err?.cause?.code || err?.name || err);
  }
  const ms = Math.round(performance.now() - t0);
  logEvent({ cat: error ? 'error' : 'call', spike, api, url, status, ms, bytes: body.length, cache: 'miss', error });
  if (!error && status < 400) cache.set(url, { at: Date.now(), ttl: ttlSec, status, body, ms });
  return { status, ok: !error && status < 400, text: body, json: () => JSON.parse(body), ms, cache: 'miss', error };
}

function summary() {
  const byApi = {};
  for (const e of events) {
    const k = e.api || 'other';
    const s = (byApi[k] ||= { calls: 0, errors: 0, cacheHits: 0, totalMs: 0, maxMs: 0, bytes: 0 });
    s.calls++;
    if (e.cat === 'error' || e.status >= 400) s.errors++;
    if (e.cache === 'hit') s.cacheHits++;
    s.totalMs += e.ms || 0;
    s.maxMs = Math.max(s.maxMs, e.ms || 0);
    s.bytes += e.bytes || 0;
  }
  for (const s of Object.values(byApi)) s.avgMs = Math.round(s.totalMs / Math.max(1, s.calls - s.cacheHits));
  return { startedAt, exportedAt: new Date().toISOString(), totalEvents: events.length, byApi };
}

const spikeDirs = () => fs.readdirSync(ROOT).filter((d) => /^\d{3}[a-z]?-/.test(d) && fs.existsSync(path.join(ROOT, d, 'index.html')));

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 1));
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' };

http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (u.pathname === '/log') return send(res, 200, { summary: summary(), events });
    if (u.pathname === '/') {
      const links = spikeDirs().map((d) => `<li><a href="/${d}/">${d}</a></li>`).join('');
      return send(res, 200, `<!doctype html><meta charset="utf-8"><title>Spike lab</title><body style="font:16px system-ui;padding:24px"><h1>Barabula spike lab</h1><ul>${links}</ul><p><a href="/log">Call log (JSON)</a></p>`, TYPES['.html']);
    }
    const api = u.pathname.match(/^\/api\/(\d{3}[a-z]?)\/([\w-]+)$/);
    if (api) {
      const dir = fs.readdirSync(ROOT).find((d) => d.startsWith(api[1] + '-'));
      if (!dir) return send(res, 404, { error: 'no spike ' + api[1] });
      const mod = await import(pathToFileURL(path.join(ROOT, dir, 'api.mjs')).href + '?v=' + fs.statSync(path.join(ROOT, dir, 'api.mjs')).mtimeMs);
      const fn = mod.handlers?.[api[2]];
      if (!fn) return send(res, 404, { error: 'no handler ' + api[2] });
      const params = Object.fromEntries(u.searchParams);
      const t0 = performance.now();
      const out = await fn(params, { fetch: (url, o = {}) => fetchLogged(url, { spike: api[1], ...o }) });
      logEvent({ cat: 'route', spike: api[1], api: 'route:' + api[2], ms: Math.round(performance.now() - t0) });
      return send(res, 200, out);
    }
    // Static files inside spike folders only.
    const file = path.normalize(path.join(ROOT, decodeURIComponent(u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname)));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, { error: 'not found' });
    return send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'application/octet-stream');
  } catch (err) {
    logEvent({ cat: 'error', api: 'server', error: String(err?.stack || err) });
    return send(res, 500, { error: String(err?.message || err) });
  }
}).listen(PORT, () => console.log(`Spike lab on http://localhost:${PORT}`));
