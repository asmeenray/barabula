// Cities the describe box can read (D-11). Names only: display name plus the
// folded (lowercase, accent-free) names and common aliases a sentence may use.
// No codes, coordinates or tags here; IATA codes and climate tags come only
// from the curated photo manifest.
//
// The list is hand-written plain names of well-known destination cities. Words
// that are also everyday English words or common first names (Nice, Split,
// Bath, Reading, Wellington, Charlotte, Austin, Phoenix, Sofia, Victoria…) are left out on
// purpose, so the reader never turns an ordinary word into a stop.
//
// Client-safe: no manifest import. The page passes the curated cities as props
// and knownCities() puts them first (the manifest stays out of client JS).

export type KnownCity = {
  name: string
  /** Folded names and aliases: lowercase, accent-free, letters/digits/spaces only. */
  names: readonly string[]
}

const c = (name: string, ...aliases: string[]): KnownCity => ({
  name,
  names: [foldName(name), ...aliases],
})

/** Lowercase, accents and special letters folded, punctuation to spaces. */
export function foldName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[øœæßłđı]/g, (ch) => FOLD[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const FOLD: Record<string, string> = { ø: 'o', œ: 'oe', æ: 'ae', ß: 'ss', ł: 'l', đ: 'd', ı: 'i' }

export const KNOWN_CITIES: readonly KnownCity[] = [
  // Europe
  c('Lisbon', 'lisboa'),
  c('Porto', 'oporto'),
  c('Madrid'),
  c('Barcelona'),
  c('Seville', 'sevilla'),
  c('Valencia'),
  c('Granada'),
  c('Malaga'),
  c('Bilbao'),
  c('San Sebastian', 'donostia'),
  c('Palma', 'palma de mallorca'),
  c('Paris'),
  c('Lyon'),
  c('Marseille', 'marseilles'),
  c('Bordeaux'),
  c('Strasbourg'),
  c('London'),
  c('Edinburgh'),
  c('Manchester'),
  c('Liverpool'),
  c('Dublin'),
  c('Amsterdam'),
  c('Rotterdam'),
  c('Brussels', 'bruxelles', 'brussel'),
  c('Bruges', 'brugge'),
  c('Antwerp', 'antwerpen'),
  c('Berlin'),
  c('Munich', 'munchen', 'muenchen'),
  c('Hamburg'),
  c('Cologne', 'koln', 'koeln'),
  c('Frankfurt'),
  c('Vienna', 'wien'),
  c('Salzburg'),
  c('Zurich', 'zuerich'),
  c('Geneva', 'geneve', 'genf'),
  c('Rome', 'roma'),
  c('Milan', 'milano'),
  c('Florence', 'firenze'),
  c('Venice', 'venezia'),
  c('Naples', 'napoli'),
  c('Bologna'),
  c('Turin', 'torino'),
  c('Palermo'),
  c('Prague', 'praha', 'prag'),
  c('Budapest'),
  c('Krakow', 'cracow'),
  c('Warsaw', 'warszawa'),
  c('Copenhagen', 'kobenhavn'),
  c('Stockholm'),
  c('Oslo'),
  c('Bergen'),
  c('Helsinki'),
  c('Reykjavik'),
  c('Tallinn'),
  c('Riga'),
  c('Vilnius'),
  c('Athens', 'athina'),
  c('Thessaloniki'),
  c('Istanbul'),
  c('Dubrovnik'),
  c('Zagreb'),
  c('Ljubljana'),
  c('Belgrade', 'beograd'),
  c('Sarajevo'),
  c('Bucharest', 'bucuresti'),
  c('Valletta'),
  // Middle East and Africa
  c('Dubai'),
  c('Abu Dhabi'),
  c('Doha'),
  c('Tel Aviv'),
  c('Jerusalem'),
  c('Amman'),
  c('Marrakech', 'marrakesh'),
  c('Fez', 'fes'),
  c('Cairo'),
  c('Cape Town'),
  c('Johannesburg'),
  c('Nairobi'),
  c('Zanzibar City'),
  // Asia and Oceania
  c('Tokyo'),
  c('Kyoto'),
  c('Osaka'),
  c('Seoul'),
  c('Busan'),
  c('Beijing'),
  c('Shanghai'),
  c('Hong Kong'),
  c('Taipei'),
  c('Singapore'),
  c('Bangkok'),
  c('Chiang Mai'),
  c('Hanoi'),
  c('Ho Chi Minh City', 'saigon'),
  c('Hoi An'),
  c('Kuala Lumpur'),
  c('Jakarta'),
  c('Manila'),
  c('Mumbai', 'bombay'),
  c('Delhi', 'new delhi'),
  c('Jaipur'),
  c('Kathmandu'),
  c('Colombo'),
  c('Sydney'),
  c('Melbourne'),
  c('Brisbane'),
  c('Perth'),
  c('Auckland'),
  c('Queenstown'),
  // Americas
  c('New York', 'new york city', 'nyc'),
  c('Boston'),
  c('Chicago'),
  c('Washington DC'),
  c('Miami'),
  c('New Orleans'),
  c('San Francisco'),
  c('Los Angeles'),
  c('Seattle'),
  c('Las Vegas'),
  c('Honolulu'),
  c('Toronto'),
  c('Montreal'),
  c('Vancouver'),
  c('Quebec City'),
  c('Mexico City', 'cdmx', 'ciudad de mexico'),
  c('Oaxaca'),
  c('Havana', 'la habana'),
  c('Cartagena'),
  c('Bogota'),
  c('Medellin'),
  c('Lima'),
  c('Cusco', 'cuzco'),
  c('Buenos Aires'),
  c('Santiago'),
  c('Rio de Janeiro', 'rio'),
  c('Sao Paulo'),
]

/** The curated cities first (photo manifest, passed in as props), then the rest without repeats. */
export function knownCities(curated: readonly KnownCity[]): KnownCity[] {
  const out: KnownCity[] = curated.map((x) => ({ name: x.name, names: x.names.map(foldName).filter(Boolean) }))
  const seen = new Set(out.map((x) => foldName(x.name)))
  for (const city of KNOWN_CITIES) {
    if (!seen.has(foldName(city.name))) out.push(city)
  }
  return out
}
