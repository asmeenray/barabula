import 'server-only'

// "On the cover" captions for the laptop blank pass (quick 261007-wms, A-4).
//
// Server-only: import this from src/lib/home/data.ts only. getHomeData sends
// the one caption of the cover it picked; nothing else reaches the client.
// Not a manifest field on purpose: CITY_PHOTOS crosses to the client as the
// "Where to?" list, so a manifest field would ship every caption.
//
// Source rule: each caption names only what the shipped file's own Wikimedia
// Commons title says (the manifest sourceUrl, decoded), cross-checked with the
// candidates row for that same file in 16-PHOTO-CANDIDATES.md. A landmark,
// district, street, river, bridge, square or viewpoint, nothing else; never a
// fact from memory, from the alt text alone or from the web. Titles that only
// say skyline, panorama or assorted, or whose subject is unclear, get no entry
// (no caption is shown). The city is appended at render as " · {City}", so a
// caption never repeats it at the end.
//
// City photos only: the blank pass cover is always a curated city
// (randomCity), so no surface would show a country photo's caption.

export const CITY_CAPTIONS: Readonly<Record<string, string>> = {
  // "Alfama Rooftops and Tagus River View, Lisbon (54733698959).jpg"
  lisbon: 'Alfama rooftops and the Tagus River',
  // "View of Porto old town from Cais de Gaia with Porto Cathedral, 20250605 1623 9881.jpg"
  porto: 'Old town and Porto Cathedral from Cais de Gaia',
  // "Gran Vía (Madrid) 1.jpg"
  madrid: 'Gran Vía',
  // "Barcelona Skyline as seen from Parc Güell.jpg"
  barcelona: 'Skyline from Parc Güell',
  // "Toits Guadalquivir ponts Séville Espagne.jpg" (French: roofs, Guadalquivir, bridges)
  seville: 'Rooftops, bridges and the Guadalquivir',
  // "View up the Seine from Pont d'Iéna, Paris, 2016.jpg"
  paris: "The Seine from Pont d'Iéna",
  // "Palace of Westminster London 2023 01.jpg"
  london: 'Palace of Westminster',
  // "Edinburgh Calton Hill.jpg"
  edinburgh: 'Calton Hill',
  // "Dublin Stephen's Green-44 edit.jpg" (candidates row: "Aerial (drone) view of St Stephen's Green")
  dublin: "St Stephen's Green",
  // "Lascar View of Prague's skyline from the Petřínská rozhledna (4501601667).jpg"
  prague: 'Skyline from the Petřín lookout tower',
  // "Sant'Angelo bridge, dusk, Rome, Italy.jpg"
  rome: "Sant'Angelo Bridge at dusk",
  // "Ponte Vecchio Arno Florence.jpg"
  florence: 'Ponte Vecchio and the Arno',
  // "Piazzetta San Marco Venice BLS.jpg"
  venice: 'Piazzetta San Marco',
  // "Copenhagen skyline as seen from Rundetårn (37897078631).jpg"
  copenhagen: 'Skyline from Rundetårn',
  // "Skeppsbrokajen Gamla Stan from Skeppsholmen Stockholm 2016 01.jpg"
  stockholm: 'Skeppsbrokajen, Gamla Stan, from Skeppsholmen',
  // "View of the Acropolis of Athens from Lycabettus, 20240531 1922 9902.jpg"
  athens: 'The Acropolis from Lycabettus',
  // "Golden Horn, Istanbul (52112039576).jpg"
  istanbul: 'Golden Horn',
  // "Old Town roofs, with the Franciscan Church and Monastery tower visible, Dubrovnik, Croatia (PPL3-Altered) julesvernex2.jpg"
  dubrovnik: 'Old Town roofs and the Franciscan Monastery tower',
  // "Wawel Royal Castle, view from Stradomska Street, Old Town, Kraków, Poland.jpg"
  krakow: 'Wawel Royal Castle from Stradomska Street',
  // "Koutoubia Mosque2(js).jpg" (candidates row, Description (API): "Marakesz. Meczet Koutoubia.")
  marrakech: 'Koutoubia Mosque',
  // "Dubai Skyline mit Burj Khalifa (18241030269).jpg"
  dubai: 'Skyline with the Burj Khalifa',
  // "Minato City, Tokyo, Japan.jpg"
  tokyo: 'Minato City',
  // "Kyoto Skyline - Pentinlo.jpg" (candidates row: "CC BY skyline with Kyoto Tower")
  kyoto: 'Skyline with Kyoto Tower',
  // "Gyeongbokgung(palace) Geunjeongjeon(hall).jpg"
  seoul: 'Geunjeongjeon Hall, Gyeongbokgung Palace',
  // "Skyline of Singapore Central Business District 20250903.jpg"
  singapore: 'Central Business District',
  // "Wat Arun 03-2012-01.JPG"
  bangkok: 'Wat Arun',
  // "Świątynia Literatury, Hanoi, Wietnam, 20240123 0937 3097.jpg" (Polish: Temple of Literature)
  hanoi: 'Temple of Literature',
  // "Sydney Opera House (12477696154).jpg"
  sydney: 'Sydney Opera House',
  // "Manhattan skyline from Upper New York Bay, 20231001 1043 0903.jpg"
  'new-york': 'Manhattan skyline from Upper New York Bay',
  // "San Francisco skyline from Kensington, CA (2025).jpg"
  'san-francisco': 'Skyline from Kensington, California',
  // "Rio skyline and Cristo Redentor from Sugarloaf Mountain, Brazil.jpg"
  'rio-de-janeiro': 'Cristo Redentor from Sugarloaf Mountain',
  // No entry (no named subject or an unclear one in the title):
  // amsterdam "Amsterdam Canals - July 2006", berlin "Skyline of Berlin Germany",
  // vienna "Stephansdom Vienna July 2008 (27)-(31)" (a view from the cathedral,
  // not of it), budapest "Budapest Panorama R01", cape-town "Cape Town, assorted",
  // mexico-city "Panorama de la ciudad de México", buenos-aires "Buenos Aires,
  // Argentina Skyline", vancouver "Skyline with seawall", cusco "Cusco skyline".
}

/** The cover's caption, or null when it has none (and for any non-city slug). */
export function captionFor(slug: string): string | null {
  return Object.hasOwn(CITY_CAPTIONS, slug) ? CITY_CAPTIONS[slug] : null
}
