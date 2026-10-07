// Curated city photos for pass covers (D-06, D-42; UI-SPEC §3 Photos).
//
// Every value here is real and checked against its source before it ships:
// photographer, licence and source page come from the Wikimedia Commons API
// (imageinfo extmetadata), IATA codes only when a cited source gives the city
// or its airport one, and climate tags only from the cited climate table
// (Asmeen's rules: warm = mean daily high 24–32 °C, tropical = every month's
// mean ≥ 18 °C, sunny = ≥ 2,500 sun hours a year). No placeholder credits,
// ever; the integrity test (src/__tests__/photos/manifest.test.ts) enforces it.
// The approved list, sources and values are in the 16-21 candidate file.
//
// Files are made with scripts/photos/encode.mjs and served as-is from
// public/images/cities/. Read this module from server code only (pages and
// data functions), so the manifest stays out of client JavaScript.

/** Everything a pass cover shows: a curated city photo or a country photo (16-21). */
export type CoverPhoto = {
  slug: string
  /** Real IATA city or airport code; only curated city photos have one. */
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
  /**
   * Laptop and phone landscape AVIF plus the phone WebP fallback (Asmeen's
   * size-gate answer, 16-21 option E: no portrait crop, no laptop WebP).
   */
  files: {
    lAvif: string
    mAvif: string
    mWebp: string
  }
  /** ≤10 px wide data URI, shown as the wrapper background while the photo loads. */
  blur: string
}

export type CityPhoto = CoverPhoto & {
  /** Display name, used on the credits page. */
  city: string
  /** Lowercase, accent-free names a trip destination can match (see normalizeCity). */
  names: string[]
  tags?: { months?: number[]; climate?: string[]; beach?: boolean; source: string }
}

/** The three files for a slug; country photos live in /images/countries. */
export function filesFor(slug: string, dir: 'cities' | 'countries' = 'cities'): CoverPhoto['files'] {
  const base = `/images/${dir}/${slug}`
  return {
    lAvif: `${base}-l.avif`,
    mAvif: `${base}-m.avif`,
    mWebp: `${base}-m.webp`,
  }
}

export const CITY_PHOTOS: readonly CityPhoto[] = [
  {
    // Verified 7 Oct 2026 via the Commons API: Artist "Dale Cruse", LicenseShortName
    // "CC BY 4.0". The l AVIF is the measured 16-directions sketch file; the m AVIF,
    // m WebP and blur were encoded from this file's 3840 px Commons rendition.
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
    tags: { months: [6, 7, 8, 9], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Climate_of_Lisbon&oldid=1368501635' },
  },
  // The approved 16-21 set (Asmeen, 7 Oct 2026). Photographer, licence and
  // source page are the Commons API values for each file (Artist,
  // LicenseShortName, LicenseUrl; public-domain files link the licence to the
  // file page, which carries the PD statement). Focal points and alt text were
  // set by looking at each photo. Porto, Madrid and Barcelona keep the crops
  // encoded before the size gate (their blur comes from the phone WebP).
  {
    // Commons API 7 Oct 2026. IATA: OPO (Porto Airport, https://www.wikidata.org/wiki/Q943743 P238; serves Porto per P931)
    slug: 'porto',
    city: 'Porto',
    names: ['porto', 'oporto'],
    iata: 'OPO',
    focal: { x: 0.45, y: 0.5 },
    alt: "Porto's old town rising from the Douro River to the cathedral hill, with a tourist boat on the water",
    photographer: 'Jakub Hałun',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:View_of_Porto_old_town_from_Cais_de_Gaia_with_Porto_Cathedral,_20250605_1623_9881.jpg',
    files: filesFor('porto'),
    blur: 'data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACwAQCdASoIAAUAAsBMJQBOgCHM/jvAAPy0+3v97jF2EIBojgJnpu47uUDH/VPCNrLwAA==',
    tags: { months: [7, 8, 9], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Climate_of_Porto&oldid=1292512756' },
  },
  {
    // Commons API 7 Oct 2026. IATA: MAD (Madrid–Barajas Airport, https://www.wikidata.org/wiki/Q166276 P238; serves Madrid per P931)
    slug: 'madrid',
    city: 'Madrid',
    names: ['madrid'],
    iata: 'MAD',
    focal: { x: 0.45, y: 0.55 },
    alt: 'Gran Vía in Madrid seen from above, with the Carrión building and its Schweppes sign on the left and traffic running down the avenue',
    photographer: 'Felipe Gabaldón',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Gran_V%C3%ADa_(Madrid)_1.jpg',
    files: filesFor('madrid'),
    blur: 'data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAADQAQCdASoIAAUAAsBMJZQCdAEfbh/a0AD0cyOw/OBm5tnrmqn/StL6UH+upkoNJAAAAA==',
    tags: { months: [6, 8, 9], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Climate_of_Madrid&oldid=1363998757' },
  },
  {
    // Commons API 7 Oct 2026. IATA: BCN (Josep Tarradellas Barcelona–El Prat Airport, https://www.wikidata.org/wiki/Q56973 P238; serves Barcelona per P931)
    slug: 'barcelona',
    city: 'Barcelona',
    names: ['barcelona'],
    iata: 'BCN',
    focal: { x: 0.3, y: 0.7 },
    alt: 'Barcelona from Park Güell: rooftops running to the Mediterranean, with the Sagrada Família spires on the left and two tall towers on the waterfront',
    photographer: 'Chris Koerner from St. Louis, USA',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Barcelona_Skyline_as_seen_from_Parc_G%C3%BCell.jpg',
    files: filesFor('barcelona'),
    blur: 'data:image/webp;base64,UklGRjgAAABXRUJQVlA4ICwAAACwAQCdASoIAAUAAsBMJZQCdAEOuwSAAP7np6Ub3utyWL4KyNXGno0XjlrEAA==',
    tags: { months: [6, 7, 8, 9], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Climate_of_Barcelona&oldid=1366870817' },
  },
  {
    // Commons API 7 Oct 2026. IATA: SVQ (Seville Airport, https://www.wikidata.org/wiki/Q1344758 P238; serves Seville per P931)
    slug: 'seville',
    city: 'Seville',
    names: ['seville', 'sevilla'],
    iata: 'SVQ',
    focal: { x: 0.5, y: 0.55 },
    alt: 'Rooftops and trees of Seville looking out to the Guadalquivir River and its bridges under a clear sky',
    photographer: 'Jebulon',
    licence: 'CC0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Toits_Guadalquivir_ponts_S%C3%A9ville_Espagne.jpg',
    files: filesFor('seville'),
    blur: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAsBMJQBOj+ADA0t/EAAA+p9Wya+oJXgnyqMA/m7FiRawujeaJmMHAAAA',
    tags: { months: [4, 5, 9, 10], climate: ['warm', 'sunny'], source: 'https://en.wikipedia.org/w/index.php?title=Seville&oldid=1378283628' },
  },
  {
    // Commons API 7 Oct 2026. IATA: PAR (city code, https://www.wikidata.org/wiki/Q90 P238); main airport CDG (https://www.wikidata.org/wiki/Q46280)
    slug: 'paris',
    city: 'Paris',
    names: ['paris'],
    iata: 'PAR',
    focal: { x: 0.5, y: 0.5 },
    alt: "Tour boats on the Seine in Paris, looking upriver from Pont d'Iéna towards an arched footbridge on a sunny day",
    photographer: 'DimiTalen',
    licence: 'CC0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:View_up_the_Seine_from_Pont_d%27I%C3%A9na,_Paris,_2016.jpg',
    files: filesFor('paris'),
    blur: 'data:image/webp;base64,UklGRkQAAABXRUJQVlA4IDgAAADwAQCdASoIAAUAAsBMJQBOiP/wPOx2cgAA4gY+IwOr0utDnxryWRyuTOOwzxJSb4O008p3NogAAA==',
    tags: { months: [6, 7, 8], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Climate_of_Paris&oldid=1361041061' },
  },
  {
    // Commons API 7 Oct 2026. IATA: LON (city code, https://www.wikidata.org/wiki/Q84 P238); main airport LHR (https://www.wikidata.org/wiki/Q8691)
    slug: 'london',
    city: 'London',
    names: ['london'],
    iata: 'LON',
    focal: { x: 0.5, y: 0.55 },
    alt: 'The Palace of Westminster and Elizabeth Tower (Big Ben) across the Thames, framed by autumn leaves, with Westminster Bridge on the right',
    photographer: 'Julian Herzog (Website)',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Palace_of_Westminster_London_2023_01.jpg',
    files: filesFor('london'),
    blur: 'data:image/webp;base64,UklGRjgAAABXRUJQVlA4ICwAAACwAQCdASoIAAUAAsBMJYwCdAEOJKFgAPshS5MveAb4gmtw5/wCKLO9aDLEAA==',
    tags: { months: [], climate: [], source: 'https://en.wikipedia.org/w/index.php?title=Climate_of_London&oldid=1361744441' },
  },
  {
    // Commons API 7 Oct 2026. IATA: EDI (Edinburgh Airport, https://www.wikidata.org/wiki/Q8716 P238; serves Edinburgh per P931)
    slug: 'edinburgh',
    city: 'Edinburgh',
    names: ['edinburgh'],
    iata: 'EDI',
    focal: { x: 0.5, y: 0.5 },
    alt: 'Calton Hill in Edinburgh with the Nelson Monument, the City Observatory dome and the columns of the National Monument, looking out over the Firth of Forth',
    photographer: 'Saffron Blaze',
    licence: 'CC BY 3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Edinburgh_Calton_Hill.jpg',
    files: filesFor('edinburgh'),
    blur: 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAADQAQCdASoIAAUAAsBMJQBOgCHh5Qe/AAD6n/SXIUwW+9ju5iABDRCSJI2XiHAA',
    tags: { months: [], climate: [], source: 'https://en.wikipedia.org/w/index.php?title=Edinburgh&oldid=1378834492' },
  },
  {
    // Commons API 7 Oct 2026. IATA: DUB (Dublin Airport, https://www.wikidata.org/wiki/Q178021 P238; serves Dublin per P931)
    slug: 'dublin',
    city: 'Dublin',
    names: ['dublin'],
    iata: 'DUB',
    focal: { x: 0.5, y: 0.5 },
    alt: "Aerial view of St Stephen's Green in Dublin: a square park of trees, lawns, paths and a pond, ringed by city streets",
    photographer: 'Dronepicr (edited by King of Hearts)',
    licence: 'CC BY 3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Dublin_Stephen%27s_Green-44_edit.jpg',
    files: filesFor('dublin'),
    blur: 'data:image/webp;base64,UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoIAAUAAsBMJagCdAD0QV+PkADMRxj6bfP0QGOE/3+tb53Z9klmOqqQAAA=',
    tags: { months: [], climate: [], source: 'https://en.wikipedia.org/w/index.php?title=Dublin&oldid=1378806550' },
  },
  {
    // Commons API 7 Oct 2026. IATA: AMS (Amsterdam Airport Schiphol, https://www.wikidata.org/wiki/Q9694 P238; serves Amsterdam per P931)
    slug: 'amsterdam',
    city: 'Amsterdam',
    names: ['amsterdam'],
    iata: 'AMS',
    focal: { x: 0.5, y: 0.5 },
    alt: 'A tree-lined canal in Amsterdam with houseboats and moored boats along both banks and a small motorboat heading up the water',
    photographer: 'Diliff',
    licence: 'CC BY 2.5',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.5',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Amsterdam_Canals_-_July_2006.jpg',
    files: filesFor('amsterdam'),
    blur: 'data:image/webp;base64,UklGRkQAAABXRUJQVlA4IDgAAACwAQCdASoIAAUAAsBMJQBOgB6Ss0HUAP6tOhtpDjqh8uV5+8wRZD1BEnnciZgm/f2mVWWc4HAAAA==',
    tags: { months: [], climate: [], source: 'https://en.wikipedia.org/w/index.php?title=Amsterdam&oldid=1376334485' },
  },
  {
    // Commons API 7 Oct 2026. IATA: BER (Berlin Brandenburg Airport, https://www.wikidata.org/wiki/Q160556 P238; serves Berlin per P931)
    slug: 'berlin',
    city: 'Berlin',
    names: ['berlin'],
    iata: 'BER',
    focal: { x: 0.5, y: 0.5 },
    alt: "Berlin's old centre with the twin green spires of St Nicholas' Church and a domed tower in front of modern blocks",
    photographer: 'Tony Webster',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Skyline_of_Berlin_Germany_(54181381862).jpg',
    files: filesFor('berlin'),
    blur: 'data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACwAQCdASoIAAUAAsBMJZACdAEOJKFgAOIHxzmlns17SBJjdYWCI6WLbEiZ9bORbNgAAA==',
    tags: { months: [7, 8], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Berlin&oldid=1378638726' },
  },
  {
    // Commons API 7 Oct 2026. IATA: VIE (Vienna International Airport, https://www.wikidata.org/wiki/Q32999 P238; serves Vienna per P931)
    slug: 'vienna',
    city: 'Vienna',
    names: ['vienna', 'wien'],
    iata: 'VIE',
    focal: { x: 0.5, y: 0.45 },
    alt: "Vienna's rooftops seen from St Stephen's Cathedral, with a Gothic spire of the cathedral on the left and hills on the horizon",
    photographer: 'Of the individual pictures, Gryffindor, of the panorama, Roland Geider (Ogre)',
    licence: 'CC BY 3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Stephansdom_Vienna_July_2008_(27)-Stephansdom_Vienna_July_2008_(31).jpg',
    files: filesFor('vienna'),
    blur: 'data:image/webp;base64,UklGRjwAAABXRUJQVlA4IDAAAAAQAgCdASoIAAUAAsBMJZQCdH8AGJwrDbEAAPzZf093vCunpUEEiEWUn1AgIP7pgAA=',
    tags: { months: [6, 7, 8], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Vienna&oldid=1378198193' },
  },
  {
    // Commons API 7 Oct 2026. IATA: PRG (Václav Havel Airport Prague, https://www.wikidata.org/wiki/Q99172 P238; serves Prague per P931)
    slug: 'prague',
    city: 'Prague',
    names: ['prague', 'praha'],
    iata: 'PRG',
    focal: { x: 0.5, y: 0.65 },
    alt: 'Red rooftops of Prague from the Petřín lookout tower, with Prague Castle and St Vitus Cathedral on the left and the Vltava beyond',
    photographer: 'Jorge Láscar from Australia',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lascar_View_of_Prague%27s_skyline_from_the_Pet%C5%99%C3%ADnsk%C3%A1_rozhledna_(4501601667).jpg',
    files: filesFor('prague'),
    blur: 'data:image/webp;base64,UklGRjwAAABXRUJQVlA4IDAAAACwAQCdASoIAAUAAsBMJZQCdAEOuwSAAP39PatBEh2hlRVfdkudW3GvBQjRL6AtgAA=',
    tags: { months: [6, 7, 8], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Prague&oldid=1377102412' },
  },
  {
    // Commons API 7 Oct 2026. IATA: BUD (Budapest Ferenc Liszt International Airport, https://www.wikidata.org/wiki/Q500945 P238; serves Budapest per P931)
    slug: 'budapest',
    city: 'Budapest',
    names: ['budapest'],
    iata: 'BUD',
    focal: { x: 0.5, y: 0.62 },
    alt: "The Danube in Budapest with the Chain Bridge, the Parliament on the far bank to the left and the dome of St Stephen's Basilica on the right",
    photographer: 'Marc Ryckaert (MJJR)',
    licence: 'CC BY 3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Budapest_Panorama_R01.jpg',
    files: filesFor('budapest'),
    blur: 'data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAADQAQCdASoIAAUAAsBMJZACdAEU7bIVkAD+ZtrDgF6WoT3YiKSfbYTT0TteFA1SGUAAAA==',
    tags: { months: [6, 7, 8], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Climate_of_Budapest&oldid=1376169648' },
  },
  {
    // Commons API 7 Oct 2026. IATA: FCO (Rome Fiumicino Airport, https://www.wikidata.org/wiki/Q19101 P238; serves Rome per P931)
    slug: 'rome',
    city: 'Rome',
    names: ['rome', 'roma'],
    iata: 'FCO',
    focal: { x: 0.5, y: 0.5 },
    alt: "Ponte Sant'Angelo over the Tiber at dusk in Rome, with the lit dome of St Peter's Basilica behind it",
    photographer: 'Jebulon',
    licence: 'CC0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sant%27Angelo_bridge,_dusk,_Rome,_Italy.jpg',
    files: filesFor('rome'),
    blur: 'data:image/webp;base64,UklGRkIAAABXRUJQVlA4IDYAAADQAQCdASoIAAUAAsBMJYwCdAEfaUICwAD+rGsZVTFMEbSy6FnjSQlly64XukoND0Rm7ujkEAA=',
    tags: { months: [6, 7, 8, 9], climate: ['warm', 'sunny'], source: 'https://en.wikipedia.org/w/index.php?title=Climate_of_Rome&oldid=1371281629' },
  },
  {
    // Commons API 7 Oct 2026. IATA: FLR (Florence Airport, https://www.wikidata.org/wiki/Q707731 P238; serves Florence per P931)
    slug: 'florence',
    city: 'Florence',
    names: ['florence', 'firenze'],
    iata: 'FLR',
    focal: { x: 0.5, y: 0.45 },
    alt: 'The Ponte Vecchio over the Arno in Florence, its shops lining the bridge, with a green riverbank in front',
    photographer: 'Jebulon',
    licence: 'CC0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ponte_Vecchio_Arno_Florence.jpg',
    files: filesFor('florence'),
    blur: 'data:image/webp;base64,UklGRkIAAABXRUJQVlA4IDYAAADQAQCdASoIAAUAAsBMJbACdAEU5PeiwAD2Q/J0anE5iHVC7bx8KA4Adc0WF8wJFZ5VNoEfHAA=',
    tags: { months: [5, 6, 9], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Template:Florence_weatherbox&oldid=1372914527' },
  },
  {
    // Commons API 7 Oct 2026. IATA: VCE (Venice Marco Polo Airport, https://www.wikidata.org/wiki/Q849347 P238; serves Venice per P931)
    slug: 'venice',
    city: 'Venice',
    names: ['venice', 'venezia'],
    iata: 'VCE',
    focal: { x: 0.5, y: 0.5 },
    alt: "Piazzetta San Marco in Venice at blue hour, between the lit arcades of the Doge's Palace and the Marciana Library, with the two columns and the lagoon beyond",
    photographer: 'Benh LIEU SONG',
    licence: 'Public domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/File:Piazzetta_San_Marco_Venice_BLS.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Piazzetta_San_Marco_Venice_BLS.jpg',
    files: filesFor('venice'),
    blur: 'data:image/webp;base64,UklGRkwAAABXRUJQVlA4IEAAAAAQAgCdASoIAAUAAsBMJbACdGuAAvps4YgAAM4YWm2/jgwQBwx+Y/zRwDIf0TwtIyN8hgi8YLrFfEtesYPbgAAA',
    tags: { months: [6, 7, 8], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Venice&oldid=1378010096' },
  },
  {
    // Commons API 7 Oct 2026. IATA: CPH (Copenhagen Airport, https://www.wikidata.org/wiki/Q206277 P238; serves Copenhagen per P931)
    slug: 'copenhagen',
    city: 'Copenhagen',
    names: ['copenhagen', 'københavn'],
    iata: 'CPH',
    focal: { x: 0.5, y: 0.45 },
    alt: "The green copper spire of the Nikolaj tower rising above Copenhagen's rooftops on an overcast day",
    photographer: 'Jorge Láscar from Melbourne, Australia',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Copenhagen_skyline_as_seen_from_Rundet%C3%A5rn_(37897078631).jpg',
    files: filesFor('copenhagen'),
    blur: 'data:image/webp;base64,UklGRjgAAABXRUJQVlA4ICwAAACwAQCdASoIAAUAAsBMJZQCdADzesjgAP6UzIaMqmo1QIz5jRiqdytkeuAAAA==',
    tags: { months: [], climate: [], source: 'https://en.wikipedia.org/w/index.php?title=Copenhagen&oldid=1378007503' },
  },
  {
    // Commons API 7 Oct 2026. IATA: ARN (Stockholm Arlanda Airport, https://www.wikidata.org/wiki/Q223499 P238; serves Stockholm per P931)
    slug: 'stockholm',
    city: 'Stockholm',
    names: ['stockholm'],
    iata: 'ARN',
    focal: { x: 0.5, y: 0.5 },
    alt: "Gamla Stan's colourful waterfront in Stockholm seen across the water on a winter evening, with a white boat moored and snow on the near quay",
    photographer: 'Julian Herzog (Website)',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Skeppsbrokajen_Gamla_Stan_from_Skeppsholmen_Stockholm_2016_01.jpg',
    files: filesFor('stockholm'),
    blur: 'data:image/webp;base64,UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoIAAUAAsBMJZQC7AEO+MU/AAD+561yBQowX3gBzdQ0R6XBszkiw9fcAAA=',
    tags: { months: [], climate: [], source: 'https://en.wikipedia.org/w/index.php?title=Stockholm&oldid=1378481556' },
  },
  {
    // Commons API 7 Oct 2026. IATA: ATH (Athens International Airport, https://www.wikidata.org/wiki/Q211734 P238; serves Athens per P931)
    slug: 'athens',
    city: 'Athens',
    names: ['athens', 'athina'],
    iata: 'ATH',
    focal: { x: 0.5, y: 0.5 },
    alt: 'The Acropolis and the Parthenon rising above the spread of Athens, seen from Lycabettus Hill, with the sea on the horizon',
    photographer: 'Jakub Hałun',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:View_of_the_Acropolis_of_Athens_from_Lycabettus,_20240531_1922_9902.jpg',
    files: filesFor('athens'),
    blur: 'data:image/webp;base64,UklGRjYAAABXRUJQVlA4ICoAAACwAQCdASoIAAUAAsBMJZwAAvdokVMAAP3wfvwW011357nPLMcVGlmAAAA=',
    tags: { months: [5, 6, 9, 10], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Athens&oldid=1378849455' },
  },
  {
    // Commons API 7 Oct 2026. IATA: IST (Istanbul Airport, https://www.wikidata.org/wiki/Q3661908 P238; serves Istanbul per P931)
    slug: 'istanbul',
    city: 'Istanbul',
    names: ['istanbul'],
    iata: 'IST',
    focal: { x: 0.5, y: 0.4 },
    alt: 'The Golden Horn in Istanbul seen over green treetops, with ferries, bridges and the city along the far shore',
    photographer: 'Ninara',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Golden_Horn,_Istanbul_(52112039576).jpg',
    files: filesFor('istanbul'),
    blur: 'data:image/webp;base64,UklGRjwAAABXRUJQVlA4IDAAAACQAQCdASoIAAUAAsBMJbAAAudP4iAA9qcNTVzHrt9T/MfpjE/2G7DUy4XiO8tDBAA=',
    tags: { months: [6, 7, 8, 9], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Climate_of_Istanbul&oldid=1372009163' },
  },
  {
    // Commons API 7 Oct 2026. IATA: DBV (Dubrovnik Airport, https://www.wikidata.org/wiki/Q1147000 P238; serves Dubrovnik per P931)
    slug: 'dubrovnik',
    city: 'Dubrovnik',
    names: ['dubrovnik'],
    iata: 'DBV',
    focal: { x: 0.5, y: 0.6 },
    alt: "Terracotta rooftops of Dubrovnik's Old Town with a church dome, and the Adriatic Sea beyond",
    photographer: 'Jules Verne Times Two',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Old_Town_roofs,_with_the_Franciscan_Church_and_Monastery_tower_visible,_Dubrovnik,_Croatia_(PPL3-Altered)_julesvernex2.jpg',
    files: filesFor('dubrovnik'),
    blur: 'data:image/webp;base64,UklGRkQAAABXRUJQVlA4IDgAAACwAQCdASoIAAUAAsBMJbACdAEOZ/HeAMyjb5J7xwcV5KGwMMYPh1/gXxrGtiUa1Ucrv4xzugAAAA==',
    tags: { months: [6, 7, 8, 9], climate: ['warm', 'sunny'], source: 'https://en.wikipedia.org/w/index.php?title=Dubrovnik&oldid=1377240990' },
  },
  {
    // Commons API 7 Oct 2026. IATA: KRK (Kraków John Paul II International Airport, https://www.wikidata.org/wiki/Q581545 P238; serves Kraków per P931)
    slug: 'krakow',
    city: 'Kraków',
    names: ['krakow', 'cracow'],
    iata: 'KRK',
    focal: { x: 0.5, y: 0.45 },
    alt: 'Wawel Royal Castle in Kraków on its hill above red-brick walls, seen from Stradomska Street',
    photographer: 'Igor123121',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Wawel_Royal_Castle,_view_from_Stradomska_Street,_Old_Town,_Krak%C3%B3w,_Poland.jpg',
    files: filesFor('krakow'),
    blur: 'data:image/webp;base64,UklGRkYAAABXRUJQVlA4IDoAAAAQAgCdASoIAAUAAsBMJQBOj+ADE4Z7vLcAAPhj/BGiTx6+eqjfMCKM4dI45e+4LRKqj0+nc/3GwAAA',
    tags: { months: [7, 8], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Kraków&oldid=1377010561' },
  },
  {
    // Commons API 7 Oct 2026. IATA: RAK (Marrakesh Menara Airport, https://www.wikidata.org/wiki/Q429304 P238; serves Marrakesh per P931)
    slug: 'marrakech',
    city: 'Marrakech',
    names: ['marrakech', 'marrakesh'],
    iata: 'RAK',
    focal: { x: 0.45, y: 0.4 },
    alt: 'The Koutoubia Mosque minaret in Marrakech above palm trees and a wide square, with a horse-drawn carriage and cyclists on the road in front',
    photographer: 'Jerzy Strzelecki',
    licence: 'CC BY 3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Koutoubia_Mosque2(js).jpg',
    files: filesFor('marrakech'),
    blur: 'data:image/webp;base64,UklGRjwAAABXRUJQVlA4IDAAAACwAQCdASoIAAUAAsBMJQBYdiHM/k4AAMtLRPfhUwAeLC472o9Ldy4R0Y78RukwAAA=',
    tags: { months: [4, 5, 10], climate: ['warm', 'sunny'], source: 'https://en.wikipedia.org/w/index.php?title=Marrakesh&oldid=1377045540' },
  },
  {
    // Commons API 7 Oct 2026. IATA: CPT (Cape Town International Airport, https://www.wikidata.org/wiki/Q854130 P238; serves Cape Town per P931)
    slug: 'cape-town',
    city: 'Cape Town',
    names: ['cape town'],
    iata: 'CPT',
    focal: { x: 0.5, y: 0.45 },
    alt: "Cape Town's city centre towers in front of Table Mountain, with palm trees and a moored ship at the waterfront",
    photographer: 'lumoplank',
    licence: 'CC0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Cape_Town,_assorted_-_CapeTown4035.jpg',
    files: filesFor('cape-town'),
    blur: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAAAQAgCdASoIAAUAAsBMJYwCdH8AGZMGCfygAM4NGKbkljzJJDora9HeULgICLe4j8ytYAAA',
    tags: { months: [1, 2, 3, 12], climate: ['warm', 'sunny'], source: 'https://en.wikipedia.org/w/index.php?title=Cape_Town&oldid=1378987000' },
  },
  {
    // Commons API 7 Oct 2026. IATA: DXB (Dubai International Airport, https://www.wikidata.org/wiki/Q193439 P238; serves Dubai per P931)
    slug: 'dubai',
    city: 'Dubai',
    names: ['dubai'],
    iata: 'DXB',
    focal: { x: 0.5, y: 0.5 },
    alt: "Dubai's skyline with the Burj Khalifa rising above the towers along Sheikh Zayed Road, seen from the air over low-rise neighbourhoods",
    photographer: 'Tim Reckmann from Hamm, Deutschland',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Dubai_Skyline_mit_Burj_Khalifa_(18241030269).jpg',
    files: filesFor('dubai'),
    blur: 'data:image/webp;base64,UklGRjwAAABXRUJQVlA4IDAAAADwAQCdASoIAAUAAsBMJYwCdH8AGBLvHSAA/mbaYDkg/tCP55WAHSPYd1Ug+PwAAAA=',
    tags: { months: [1, 2, 3, 11, 12], climate: ['warm', 'sunny'], source: 'https://en.wikipedia.org/w/index.php?title=Climate_of_Dubai&oldid=1378034087' },
  },
  {
    // Commons API 7 Oct 2026. IATA: TYO (city code, https://www.wikidata.org/wiki/Q1490 P238); main airport HND (https://www.wikidata.org/wiki/Q204853)
    slug: 'tokyo',
    city: 'Tokyo',
    names: ['tokyo'],
    iata: 'TYO',
    focal: { x: 0.5, y: 0.5 },
    alt: "Tokyo's Minato City skyline in golden evening light, with the red and white Tokyo Tower among the office towers",
    photographer: 'David Kernan',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Minato_City,_Tokyo,_Japan.jpg',
    files: filesFor('tokyo'),
    blur: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoIAAUAAsBMJZQCdIExGJrAJZAA/pG/RKn13BasGGPYnRoFYJXb7kE8XqDlaSAA',
    tags: { months: [6, 7, 8, 9], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Tokyo&oldid=1378613572' },
  },
  {
    // Commons API 7 Oct 2026. IATA: none (Wikidata city item https://www.wikidata.org/wiki/Q34600 has no IATA code; no airport looked up, per the plan's Kyoto rule)
    slug: 'kyoto',
    city: 'Kyoto',
    names: ['kyoto'],
    focal: { x: 0.5, y: 0.6 },
    alt: 'Kyoto spread across the valley with Kyoto Tower in the centre, green mountains behind and trees in front',
    photographer: 'Reginald Pentinlo',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kyoto_Skyline_-_Pentinlo.jpg',
    files: filesFor('kyoto'),
    blur: 'data:image/webp;base64,UklGRkYAAABXRUJQVlA4IDoAAAAQAgCdASoIAAUAAsBMJagCdH8AGJu4JWYAAP38+F3mVS2E1wMceY47SwAPBLtnCNVEUgknsPFbK6AA',
    tags: { months: [5, 6, 7, 9], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Kyoto&oldid=1378143304' },
  },
  {
    // Commons API 7 Oct 2026. IATA: ICN (Incheon International Airport, https://www.wikidata.org/wiki/Q20932 P238; serves Seoul per P931)
    slug: 'seoul',
    city: 'Seoul',
    names: ['seoul'],
    iata: 'ICN',
    focal: { x: 0.5, y: 0.55 },
    alt: 'Geunjeongjeon, the throne hall of Gyeongbokgung Palace in Seoul, under a blue sky with visitors on the stone terrace',
    photographer: 'Brady Bellini',
    licence: 'CC0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Gyeongbokgung(palace)_Geunjeongjeon(hall).jpg',
    files: filesFor('seoul'),
    blur: 'data:image/webp;base64,UklGRkoAAABXRUJQVlA4ID4AAADwAQCdASoIAAUAAsBMJZgCdGuAAoS+XHAA/n6RiVDuKsTuIx1r/lHrRwMSeOmzsQjaEq5B2H/5qE95n/HgAA==',
    tags: { months: [6, 7, 8, 9], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Template:Seoul_weatherbox&oldid=1364613159' },
  },
  {
    // Commons API 7 Oct 2026. IATA: SIN (Changi Airport, https://www.wikidata.org/wiki/Q32159 P238; serves Singapore per P931)
    slug: 'singapore',
    city: 'Singapore',
    names: ['singapore'],
    iata: 'SIN',
    focal: { x: 0.5, y: 0.5 },
    alt: "Singapore's Central Business District towers across Marina Bay on a sunny day, with a boat on the water",
    photographer: 'DvTor8303',
    licence: 'CC0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Skyline_of_Singapore_Central_Business_District_20250903.jpg',
    files: filesFor('singapore'),
    blur: 'data:image/webp;base64,UklGRjwAAABXRUJQVlA4IDAAAACwAQCdASoIAAUAAsBMJQBOgCKTPXBwAPR3M9XMAGn4L1Bm4jOAzAB1es7REYW+AAA=',
    tags: { months: [1, 2, 6, 7, 8, 9, 10, 11, 12], climate: ['warm', 'tropical'], source: 'https://en.wikipedia.org/w/index.php?title=Template:Singapore_weatherbox&oldid=1373274746' },
  },
  {
    // Commons API 7 Oct 2026. IATA: BKK (Suvarnabhumi Airport, https://www.wikidata.org/wiki/Q194316 P238; serves Bangkok per P931)
    slug: 'bangkok',
    city: 'Bangkok',
    names: ['bangkok'],
    iata: 'BKK',
    focal: { x: 0.5, y: 0.5 },
    alt: "Wat Arun's central prang and smaller towers on the Chao Phraya riverbank in Bangkok, with a long-tail boat on the river",
    photographer: 'Rolf Heinrich, Köln',
    licence: 'CC BY 3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Wat_Arun_03-2012-01.JPG',
    files: filesFor('bangkok'),
    blur: 'data:image/webp;base64,UklGRjwAAABXRUJQVlA4IDAAAACQAQCdASoIAAUAAsBMJZwAAuWt2ogA/sYHwC2Bd9qgh1dRgVCllMHwyQU+A9hQAAA=',
    tags: { months: [], climate: ['tropical'], source: 'https://en.wikipedia.org/w/index.php?title=Bangkok&oldid=1378643267' },
  },
  {
    // Commons API 7 Oct 2026. IATA: HAN (Noi Bai International Airport, https://www.wikidata.org/wiki/Q844098 P238; serves Hanoi per P931)
    slug: 'hanoi',
    city: 'Hanoi',
    names: ['hanoi', 'ha noi'],
    iata: 'HAN',
    focal: { x: 0.5, y: 0.5 },
    alt: 'A pond, a stone balustrade and an old brick wall with a gateway under large trees at the Temple of Literature in Hanoi',
    photographer: 'Jakub Hałun',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:%C5%9Awi%C4%85tynia_Literatury,_Hanoi,_Wietnam,_20240123_0937_3097.jpg',
    files: filesFor('hanoi'),
    blur: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAACQAQCdASoIAAUAAsBMJQBOgCIAgAAA/t281Djnk52/wDi3To57P9rJX71XuWihweISgAAA',
    tags: { months: [3, 4, 9, 10, 11], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Hanoi&oldid=1377769875' },
  },
  {
    // Commons API 7 Oct 2026. IATA: SYD (Sydney Airport, https://www.wikidata.org/wiki/Q17581 P238; serves Sydney per P931)
    slug: 'sydney',
    city: 'Sydney',
    names: ['sydney'],
    iata: 'SYD',
    focal: { x: 0.5, y: 0.5 },
    alt: 'The sails of the Sydney Opera House with a green and yellow ferry passing in front on the harbour',
    photographer: 'Nicki Mannix from Sydney, Australia',
    licence: 'CC BY 2.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/2.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sydney_Opera_House_(12477696154).jpg',
    files: filesFor('sydney'),
    blur: 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACQAQCdASoIAAUAAsBMJZQAAuWt3MQA/uH1AE14zQ96dS26tUaCuvWvAAZZwQAA',
    tags: { months: [1, 2, 3, 11, 12], climate: ['warm', 'sunny'], source: 'https://en.wikipedia.org/w/index.php?title=Climate_of_Sydney&oldid=1377162171' },
  },
  {
    // Commons API 7 Oct 2026. IATA: JFK (John F. Kennedy International Airport, https://www.wikidata.org/wiki/Q8685 P238; serves New York City per P931)
    slug: 'new-york',
    city: 'New York',
    names: ['new york', 'new york city', 'nyc'],
    iata: 'JFK',
    focal: { x: 0.47, y: 0.5 },
    alt: "Lower Manhattan's skyline seen from Upper New York Bay, with One World Trade Center rising on the left",
    photographer: 'Jakub Hałun',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Manhattan_skyline_from_Upper_New_York_Bay,_20231001_1043_0903.jpg',
    files: filesFor('new-york'),
    blur: 'data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACwAQCdASoIAAUAAsBMJQBOgCHHfk0AAP7HgL/fcjvnQRlbR5Zyi/P0WzHKZCa2V0AAAA==',
    tags: { months: [6, 7, 8, 9], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Climate_of_New_York_City&oldid=1372155322' },
  },
  {
    // Commons API 7 Oct 2026. IATA: SFO (San Francisco International Airport, https://www.wikidata.org/wiki/Q8688 P238; serves San Francisco per P931)
    slug: 'san-francisco',
    city: 'San Francisco',
    names: ['san francisco'],
    iata: 'SFO',
    focal: { x: 0.5, y: 0.6 },
    alt: "San Francisco's skyline across the bay from the hills of Kensington, with the Bay Bridge on the left under a cloudy sky",
    photographer: 'Ligocsicnarf89',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:San_Francisco_skyline_from_Kensington,_CA_(2025).jpg',
    files: filesFor('san-francisco'),
    blur: 'data:image/webp;base64,UklGRjYAAABXRUJQVlA4ICoAAADQAQCdASoIAAUAAsBMJYwCdAEOunBsAAD331dz9XwVf7ytBhUsnxz4IAA=',
    tags: { months: [], climate: ['sunny'], source: 'https://en.wikipedia.org/w/index.php?title=Template:San_Francisco_weatherbox&oldid=1373652200' },
  },
  {
    // Commons API 7 Oct 2026. IATA: MEX (Mexico City International Airport, https://www.wikidata.org/wiki/Q860559 P238; serves Mexico City per P931)
    slug: 'mexico-city',
    city: 'Mexico City',
    names: ['mexico city', 'ciudad de mexico', 'cdmx'],
    iata: 'MEX',
    focal: { x: 0.5, y: 0.5 },
    alt: "Mexico City's office towers rising above a green park, with a giant Mexican flag on the left",
    photographer: 'Bohao Zhao',
    licence: 'CC BY 3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Panorama_de_la_ciudad_de_M%C3%A9xico_-_panoramio.jpg',
    files: filesFor('mexico-city'),
    blur: 'data:image/webp;base64,UklGRjYAAABXRUJQVlA4ICoAAACQAQCdASoIAAUAAsBMJZwAAuWrziAA/sj/9UIPsxNnXtsIL+M+zVpQgAA=',
    tags: { months: [2, 3, 4, 5, 6, 7, 8], climate: ['warm', 'sunny'], source: 'https://en.wikipedia.org/w/index.php?title=Mexico_City&oldid=1378572322' },
  },
  {
    // Commons API 7 Oct 2026. IATA: GIG (Rio de Janeiro/Galeão International Airport, https://www.wikidata.org/wiki/Q733998 P238; serves Rio de Janeiro per P931)
    slug: 'rio-de-janeiro',
    city: 'Rio de Janeiro',
    names: ['rio de janeiro', 'rio'],
    iata: 'GIG',
    focal: { x: 0.5, y: 0.5 },
    alt: 'Sunset over Rio de Janeiro from Sugarloaf Mountain, with Christ the Redeemer on the peak and Botafogo Bay full of boats below',
    photographer: 'Wilfredor',
    licence: 'CC0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rio_skyline_and_Cristo_Redentor_from_Sugarloaf_Mountain,_Brazil.jpg',
    files: filesFor('rio-de-janeiro'),
    blur: 'data:image/webp;base64,UklGRjwAAABXRUJQVlA4IDAAAACwAQCdASoIAAUAAsBMJZQCdAEOuwSAAOJ+yPlaI6/zVulmpAzj243q/CjBpWMaAAA=',
    tags: { months: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], climate: ['warm', 'tropical'], source: 'https://en.wikipedia.org/w/index.php?title=Rio_de_Janeiro&oldid=1378255993' },
  },
  {
    // Commons API 7 Oct 2026. IATA: BUE (city code, https://www.wikidata.org/wiki/Q1486 P238); main airport EZE (https://www.wikidata.org/wiki/Q384788)
    slug: 'buenos-aires',
    city: 'Buenos Aires',
    names: ['buenos aires'],
    iata: 'BUE',
    focal: { x: 0.5, y: 0.55 },
    alt: 'Buenos Aires office towers silhouetted against an orange sunset sky above the treetops',
    photographer: 'Michelle Maria',
    licence: 'CC BY 3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Buenos_Aires,_Argentina_Skyline_-_panoramio_(1).jpg',
    files: filesFor('buenos-aires'),
    blur: 'data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACwAQCdASoIAAUAAsBMJQBOgCHfGbugAM4tVKTJJkbaMR1ktDqjkofY5x6knUdR9tQAAA==',
    tags: { months: [1, 2, 3, 11, 12], climate: ['warm'], source: 'https://en.wikipedia.org/w/index.php?title=Climate_of_Buenos_Aires&oldid=1369218435' },
  },
  {
    // Commons API 7 Oct 2026. IATA: YVR (Vancouver International Airport, https://www.wikidata.org/wiki/Q321224 P238; serves Vancouver per P931)
    slug: 'vancouver',
    city: 'Vancouver',
    names: ['vancouver'],
    iata: 'YVR',
    focal: { x: 0.5, y: 0.5 },
    alt: 'Glass residential towers above the seawall path in Vancouver on a sunny day, with trees, a pier and boats on the water',
    photographer: 'Daderot',
    licence: 'CC0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Skyline_with_seawall_-_Vancouver,_Canada_-_DSC09329.JPG',
    files: filesFor('vancouver'),
    blur: 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAACwAQCdASoIAAUAAsBMJZgCdAEOZ/HeAPZEKJjXfK6rGz4ORxtmkqaroVWKVlytjC8ZzAAA',
    tags: { months: [], climate: [], source: 'https://en.wikipedia.org/w/index.php?title=Climate_of_Vancouver&oldid=1374474516' },
  },
  {
    // Commons API 7 Oct 2026. IATA: CUZ (Alejandro Velasco Astete International Airport, https://www.wikidata.org/wiki/Q1431170 P238; serves Cusco per P931)
    slug: 'cusco',
    city: 'Cusco',
    names: ['cusco', 'cuzco'],
    iata: 'CUZ',
    focal: { x: 0.5, y: 0.5 },
    alt: "Cusco's red-tiled rooftops and the Plaza de Armas with its cathedral and churches, ringed by Andean hills under white clouds",
    photographer: 'WMrapids',
    licence: 'CC0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/deed.en',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Cusco_skyline_-_October_2025.jpg',
    files: filesFor('cusco'),
    blur: 'data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAADwAQCdASoIAAUAAsBMJQBOjXAAWXMVHAAAzfK4KzgI/a7n7DDxT9XbjN5WPYjEar8AAA==',
    tags: { months: [], climate: [], source: 'https://en.wikipedia.org/w/index.php?title=Cusco&oldid=1378207814' },
  },
]
