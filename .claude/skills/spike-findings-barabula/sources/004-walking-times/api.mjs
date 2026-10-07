// Spike 004 server side: walking time between consecutive places in a trip day.
// Compares a no-API estimate with public OSM routing servers (OSRM demo, FOSSGIS OSRM foot, FOSSGIS Valhalla).

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const WALK_KMH = 4.8;     // typical adult walking speed
const DETOUR = 1.3;       // street network vs straight line, a common rule of thumb; the spike measures it

const toRad = (d) => (d * Math.PI) / 180;
export function haversineKm(a, b) {
  const R = 6371, dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const ENGINES = {
  // OSRM's own demo server. Its policy allows light use only; the agent checks whether "foot" is really walking.
  osrmDemo: (a, b) => `https://router.project-osrm.org/route/v1/foot/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`,
  // FOSSGIS-run OSRM with a real foot profile (used by openstreetmap.org's own directions).
  fossgisOsrmFoot: (a, b) => `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`,
  // FOSSGIS-run Valhalla, pedestrian costing.
  fossgisValhalla: (a, b) => `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify({ locations: [{ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon }], costing: 'pedestrian', units: 'kilometers' }))}`,
};

function parse(engine, j) {
  if (engine === 'fossgisValhalla') return j?.trip ? { km: j.trip.summary.length, min: j.trip.summary.time / 60 } : null;
  const r = j?.routes?.[0];
  return r ? { km: r.distance / 1000, min: r.duration / 60 } : null;
}

export const handlers = {
  // Geocode place names with Nominatim (the project already uses it server-side at < 1 req/s).
  async places({ names, city = '' }, { fetch }) {
    const list = String(names).split('|').map((s) => s.trim()).filter(Boolean).slice(0, 8);
    const out = [];
    for (const name of list) {
      const r = await fetch(`${NOMINATIM}?q=${encodeURIComponent(`${name}, ${city}`)}&format=jsonv2&limit=1`, { api: 'nominatim', ttlSec: 86400 });
      const x = r.ok ? r.json()[0] : null;
      out.push(x ? { name, lat: +x.lat, lon: +x.lon, osm: `${x.osm_type}/${x.osm_id}`, label: x.display_name.split(',').slice(0, 2).join(',') } : { name, error: r.status || 'not found' });
      if (r.cache !== 'hit') await new Promise((s) => setTimeout(s, 1100)); // Nominatim policy: max 1 request/second
    }
    return { places: out };
  },

  async legs({ pts }, { fetch }) {
    const p = JSON.parse(pts); // [{name,lat,lon}, …] in visiting order
    const legs = [];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      const crowKm = haversineKm(a, b);
      const leg = { from: a.name, to: b.name, crowKm: +crowKm.toFixed(2), estimate: { km: +(crowKm * DETOUR).toFixed(2), min: Math.round(((crowKm * DETOUR) / WALK_KMH) * 60) } };
      // Engines run in parallel per leg, legs run one after another (polite to shared servers).
      await Promise.all(Object.entries(ENGINES).map(async ([k, url]) => {
        const r = await fetch(url(a, b), { api: k, ttlSec: 86400 });
        let v = null;
        try { v = r.ok ? parse(k, r.json()) : null; } catch { /* non-JSON error page */ }
        leg[k] = v ? { km: +v.km.toFixed(2), min: Math.round(v.min), ms: r.ms } : { error: r.status || r.error, ms: r.ms };
      }));
      legs.push(leg);
    }
    return { walkKmh: WALK_KMH, detour: DETOUR, legs };
  },
};
