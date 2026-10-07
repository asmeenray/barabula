#!/usr/bin/env node
// Builds the server-only city → country lookup for country cover photos
// (16-21 addendum: GeoNames, Asmeen's size-gate answer "952 KB trimmed version").
//
//   curl -A "Barabula/phase16 (+https://github.com/asmeenray/barabula)" \
//     -o "$TMPDIR/cities15000.zip" https://download.geonames.org/export/dump/cities15000.zip
//   unzip -d "$TMPDIR" "$TMPDIR/cities15000.zip"
//   node scripts/photos/geonames.mjs --src "$TMPDIR/cities15000.txt"
//   rm "$TMPDIR/cities15000.zip" "$TMPDIR/cities15000.txt"   # never commit the download
//
// Source: GeoNames cities15000 (all places over 15,000 people or capitals),
// https://www.geonames.org, CC BY 4.0 (credited on /you/credits).
// Kept per place: name and ASCII name; Latin-script alternate names only for
// places of 100,000 people or more. Names are normalised exactly like
// normalizeCity (src/lib/photos/normalize.ts). A name shared by several places
// belongs to the most populous one (a capital wins a tie).
//
// Output: { "<ISO alpha-2>": "name|name|…" } in src/lib/photos/geonames.json.
// Import it from server code only (src/lib/photos/country.ts); it must never
// reach client JavaScript.

import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

const ALTERNATES_MIN_POPULATION = 100_000
const LATIN = /^[\p{Script=Latin} '’.\-()]+$/u

/** Same steps as normalizeCity in src/lib/photos/normalize.ts. */
function normalize(value) {
  return value
    .split(',')[0]
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function fail(message) {
  console.error(`geonames: ${message}`)
  process.exit(1)
}

const { values } = parseArgs({
  options: {
    src: { type: 'string' },
    out: { type: 'string', default: 'src/lib/photos/geonames.json' },
  },
})
if (!values.src) fail('--src must point to cities15000.txt')

/** name → { cc, pop, capital } */
const best = new Map()
let places = 0
for (const line of readFileSync(values.src, 'utf8').split('\n')) {
  if (!line) continue
  const col = line.split('\t')
  // 0 geonameid, 1 name, 2 asciiname, 3 alternatenames, 7 feature code, 8 country code, 14 population
  const cc = col[8]
  if (!/^[A-Z]{2}$/.test(cc)) continue
  places++
  const pop = Number(col[14]) || 0
  const capital = col[7] === 'PPLC'
  const raw = [col[1], col[2]]
  if (pop >= ALTERNATES_MIN_POPULATION) {
    for (const alt of col[3].split(',')) if (LATIN.test(alt)) raw.push(alt)
  }
  for (const name of new Set(raw.map(normalize))) {
    if (name.length < 2 || name.includes('|') || !/\p{L}/u.test(name)) continue
    const cur = best.get(name)
    if (!cur || pop > cur.pop || (pop === cur.pop && capital && !cur.capital)) best.set(name, { cc, pop, capital })
  }
}

const byCountry = {}
for (const [name, { cc }] of [...best].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
  ;(byCountry[cc] ??= []).push(name)
}
const out = Object.fromEntries(
  Object.keys(byCountry)
    .sort()
    .map((cc) => [cc, byCountry[cc].join('|')])
)
const json = JSON.stringify(out)
writeFileSync(values.out, json + '\n')
console.log(JSON.stringify({ places, names: best.size, countries: Object.keys(out).length, bytes: Buffer.byteLength(json) + 1 }))
