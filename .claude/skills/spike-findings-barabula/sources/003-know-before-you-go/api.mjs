// Spike 003 server side: a "Know before you go" card for a trip (destination + dates + home city).
// Calls each candidate source side by side so coverage gaps are visible, then picks per field.

const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const NAGER = 'https://date.nager.at/api/v3';
const CALDAYS = 'https://caldays.com/api/holidays';
const FRANKFURTER = 'https://api.frankfurter.dev/v1/latest';
const CURRENCY_API = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies';
const WIKI = (host, title) => `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;

// Currency per country: the built-in Intl API has no country→currency table, so the real app ships a
// small static map (from Unicode CLDR supplemental data). The spike keeps a tiny hand-checked subset.
const CURRENCY_BY_COUNTRY = { PT: 'EUR', ES: 'EUR', FR: 'EUR', IT: 'EUR', DE: 'EUR', NL: 'EUR', GR: 'EUR', JP: 'JPY', IN: 'INR', MA: 'MAD', VN: 'VND', AE: 'AED', TH: 'THB', US: 'USD', GB: 'GBP', IS: 'ISK', TR: 'TRY', MX: 'MXN', ID: 'IDR', KR: 'KRW', CN: 'CNY', AU: 'AUD', NZ: 'NZD', EG: 'EGP', TW: 'TWD', ZA: 'ZAR', BR: 'BRL', CZ: 'CZK', HU: 'HUF', PL: 'PLN', CH: 'CHF', SG: 'SGD', MY: 'MYR', LK: 'LKR', NP: 'NPR' };

import Holidays from 'date-holidays';

const iso = (d) => d.toISOString().slice(0, 10);
const offsetMinutes = (tz, at = new Date()) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(at).map((x) => [x.type, x.value]));
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(at.getTime() / 6e4) * 6e4) / 6e4);
};

async function geocode(q, fetch) {
  const r = await fetch(`${GEO}?name=${encodeURIComponent(q)}&count=1&language=en&format=json`, { api: 'open-meteo-geocoding', ttlSec: 86400 });
  const x = r.ok ? r.json().results?.[0] : null;
  return x ? { name: x.name, country: x.country, cc: x.country_code, tz: x.timezone, lat: x.latitude, lon: x.longitude } : null;
}

export const handlers = {
  async card({ dest, home = 'London', start, end }, { fetch }) {
    const t0 = performance.now();
    const [d, h] = await Promise.all([geocode(dest, fetch), geocode(home, fetch)]);
    if (!d) return { error: `Couldn't find ${dest}` };
    const years = [...new Set([start.slice(0, 4), end.slice(0, 4)])];
    const timings = {};
    const timed = async (k, p) => { const s = performance.now(); try { return await p; } finally { timings[k] = Math.round(performance.now() - s); } };

    const homeCur = h ? CURRENCY_BY_COUNTRY[h.cc] : null;
    const destCur = CURRENCY_BY_COUNTRY[d.cc] || null;

    const [nager, caldays, fx1, fx2, wv, wp] = await Promise.all([
      // Holidays, source A: Nager.Date (has regional flags: global vs counties).
      timed('nager', Promise.all(years.map((y) => fetch(`${NAGER}/PublicHolidays/${y}/${d.cc}`, { api: 'nager-date', ttlSec: 86400 })))
        .then((rs) => (rs.every((r) => r.ok) ? rs.flatMap((r) => (r.text ? r.json() : [])) : { error: rs.map((r) => r.status).join(',') }))),
      // Holidays, source B: caldays (CC BY 4.0, 206 countries).
      timed('caldays', Promise.all(years.map((y) => fetch(`${CALDAYS}/${d.cc.toLowerCase()}/${y}`, { api: 'caldays', ttlSec: 86400 })))
        .then((rs) => (rs.every((r) => r.ok) ? rs.flatMap((r) => r.json().holidays || []) : { error: rs.map((r) => r.status).join(',') }))),
      // FX, source A: Frankfurter (ECB reference rates, ~30 currencies).
      timed('frankfurter', homeCur && destCur && homeCur !== destCur ? fetch(`${FRANKFURTER}?base=${homeCur}&symbols=${destCur}`, { api: 'frankfurter', ttlSec: 3600 }).then((r) => (r.ok ? r.json() : { error: `${r.status} ${r.text.slice(0, 80)}` })) : null),
      // FX, source B: fawazahmed0 currency-api on jsDelivr (static JSON, 300+ currencies).
      timed('currencyApi', homeCur && destCur && homeCur !== destCur ? fetch(`${CURRENCY_API}/${homeCur.toLowerCase()}.min.json`, { api: 'currency-api', ttlSec: 3600 }).then((r) => (r.ok ? r.json() : { error: r.status })) : null),
      // City intro: Wikivoyage first (travel-focused), Wikipedia as fallback.
      timed('wikivoyage', fetch(WIKI('en.wikivoyage.org', d.name), { api: 'wikivoyage', ttlSec: 86400 }).then((r) => (r.ok ? r.json() : { error: r.status }))),
      timed('wikipedia', fetch(WIKI('en.wikipedia.org', d.name), { api: 'wikipedia', ttlSec: 86400 }).then((r) => (r.ok ? r.json() : { error: r.status }))),
    ]);

    const inTrip = (date) => date >= start && date <= end;
    // Holidays, source C: date-holidays (offline, computed rules incl. lunar/Islamic dates; ISC code, CC BY-SA 3.0 data).
    const tH = performance.now();
    let offline;
    try {
      const hd = new Holidays(d.cc, { languages: ['en'], types: ['public'] });
      offline = years.flatMap((y) => hd.getHolidays(+y, 'en') || []).filter((x) => inTrip(x.date.slice(0, 10))).map((x) => ({ date: x.date.slice(0, 10), name: x.name, type: x.type }));
    } catch (e) { offline = { error: String(e.message || e) }; }
    timings.dateHolidays = Math.round(performance.now() - tH);
    const holidays = {
      offline,
      nager: Array.isArray(nager) ? nager.filter((x) => inTrip(x.date)).map((x) => ({ date: x.date, name: x.name, local: x.localName, national: x.global, regions: x.counties })) : nager,
      // caldays ignores the year in the URL and always returns the current year; keep only rows whose year matches.
      caldays: Array.isArray(caldays) ? [...new Map(caldays.filter((x) => inTrip(x.date)).map((x) => [x.date + x.name, { date: x.date, name: x.name }])).values()] : caldays,
    };

    const rate = {
      frankfurter: fx1 && !fx1.error ? { rate: fx1.rates?.[destCur] ?? null, date: fx1.date } : fx1,
      currencyApi: fx2 && !fx2.error ? { rate: fx2[homeCur.toLowerCase()]?.[destCur.toLowerCase()] ?? null, date: fx2.date } : fx2,
    };

    const pickWiki = (w, host) => (w && !w.error && w.type === 'standard' ? { title: w.title, extract: (w.extract || '').trim(), url: w.content_urls?.desktop?.page, host, license: 'CC BY-SA 4.0' } : null);
    const intro = pickWiki(wv, 'Wikivoyage') || pickWiki(wp, 'Wikipedia');

    // Offset at noon UTC on the first trip day, not today: DST changes the gap (London–Mumbai is 4.5 h in
    // summer, 5.5 h in winter).
    const at = new Date(start + 'T12:00:00Z');
    const timeDiffMin = h ? offsetMinutes(d.tz, at) - offsetMinutes(h.tz, at) : null;
    const timeDiffTodayMin = h ? offsetMinutes(d.tz) - offsetMinutes(h.tz) : null;
    const lang = new Intl.DisplayNames(['en'], { type: 'language' });

    return {
      dest: d, home: h, start, end,
      currency: { home: homeCur, dest: destCur, rate },
      holidays,
      intro,
      introDebug: { wikivoyage: wv?.error ?? wv?.type, wikipedia: wp?.error ?? wp?.type },
      time: { destTz: d.tz, homeTz: h?.tz, diffHours: timeDiffMin == null ? null : timeDiffMin / 60, diffHoursToday: timeDiffTodayMin == null ? null : timeDiffTodayMin / 60 },
      // Built-in Intl knows locale display names; languages per country still need a static table (CLDR).
      sampleDisplayName: lang.of('pt'),
      timings: { ...timings, total: Math.round(performance.now() - t0) },
    };
  },
};
