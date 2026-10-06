// Curated city photos for pass covers (D-06, D-42; UI-SPEC §3 Photos).
//
// Every value here is real and checked against its source before it ships:
// photographer, licence and source page come from the Wikimedia Commons API
// (imageinfo extmetadata), IATA codes only when the city has one, and climate
// tags only from verified data (none yet). No placeholder credits, ever; the
// integrity test (src/__tests__/photos/manifest.test.ts) enforces it.
//
// Files are made with scripts/photos/encode.mjs and served as-is from
// public/images/cities/. Read this module from server code only (pages and
// data functions), so the manifest stays out of client JavaScript.

export type CityPhoto = {
  slug: string
  /** Display name, used on the credits page. */
  city: string
  /** Lowercase, accent-free names a trip destination can match (see normalizeCity). */
  names: string[]
  /** Real IATA city or airport code, only when one exists. */
  iata?: string
  /** Focal point used for the crops, 0..1 of the source frame. */
  focal: { x: number; y: number }
  /** What the photo shows. */
  alt: string
  photographer: string
  licence: string
  licenceUrl: string
  /** The photo's source page (Wikimedia Commons file page). */
  sourceUrl: string
  files: {
    lAvif: string
    mAvif: string
    pAvif: string
    lWebp: string
    mWebp: string
    pWebp: string
  }
  /** ≤10 px wide data URI, shown as the wrapper background while the photo loads. */
  blur: string
  tags?: { months?: number[]; climate?: string[]; beach?: boolean; source: string }
}

function filesFor(slug: string): CityPhoto['files'] {
  const base = `/images/cities/${slug}`
  return {
    lAvif: `${base}-l.avif`,
    mAvif: `${base}-m.avif`,
    pAvif: `${base}-p.avif`,
    lWebp: `${base}-l.webp`,
    mWebp: `${base}-m.webp`,
    pWebp: `${base}-p.webp`,
  }
}

export const CITY_PHOTOS: readonly CityPhoto[] = [
  {
    // Verified 7 Oct 2026 via the Commons API: Artist "Dale Cruse", LicenseShortName
    // "CC BY 4.0". The l and p AVIFs are the measured 16-directions sketch files; the
    // m AVIF, WebPs and blur were encoded from this file's 3840 px Commons rendition.
    slug: 'lisbon',
    city: 'Lisbon',
    names: ['lisbon', 'lisboa'],
    iata: 'LIS',
    focal: { x: 0.6, y: 0.55 },
    alt: 'Terracotta rooftops of Alfama running down to the Tagus River in Lisbon, with the National Pantheon dome on the left and the bell tower of the Church of Santo Estêvão',
    photographer: 'Dale Cruse',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Alfama_Rooftops_and_Tagus_River_View,_Lisbon_(54733698959).jpg',
    files: filesFor('lisbon'),
    blur: 'data:image/webp;base64,UklGRkIAAABXRUJQVlA4IDYAAADwAQCdASoIAAUAAsBMJQBOjXAAWYIllcAA/NdAfu1QH3oXIxdTjhFmkBqh73N6Nli2n1QQAAA=',
  },
]
