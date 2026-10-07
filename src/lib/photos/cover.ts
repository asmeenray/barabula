// Pass cover choice (D-06 + 16-21 country fallback). Server-only: it reads the
// city manifest, the country manifest and the GeoNames lookup, none of which
// may reach client JavaScript. Pages and data functions call it and pass the
// chosen photo down as a prop.
//
// Order (Asmeen, 16-21 addendum):
//   1. the curated city photo (exact name match, photoFor)
//   2. the country photo, found from the country's own names or from GeoNames
//      (most populous place with that name):
//      - a season variant by the trip's start month (southern hemisphere inverted)
//      - the beach variant when the trip's interests include Beaches; beach wins
//        over a season variant unless the season variant is itself a beach
//      - otherwise the country's default photo
//   3. null, which draws the styled city-map cover.
// Pure string work; no URL is ever built from the user's text (T-16-23).

import type { PlanTrip } from '@/lib/plan/types'
import { storedPass } from '@/lib/pass/trip-values'
import { COUNTRIES, type Country, type CountryPhoto } from './countries'
import GEONAMES from './geonames.json'
import type { CoverPhoto } from './manifest'
import { photoFor } from './match'
import { normalizeCity } from './normalize'

const BEACHES = 'Beaches'

let places: Map<string, string> | null = null

/** ISO alpha-2 of the most populous GeoNames place with this normalised name. */
function placeCountry(key: string): string | undefined {
  if (!places) {
    places = new Map()
    for (const [iso, names] of Object.entries(GEONAMES as Record<string, string>)) {
      for (const name of names.split('|')) places.set(name, iso)
    }
  }
  return places.get(key)
}

/** The curated country for a destination (a country name, or a place in GeoNames), or null. */
export function countryFor(destination: string | null | undefined): Country | null {
  if (!destination) return null
  const key = normalizeCity(destination)
  if (!key) return null
  const named = COUNTRIES.find((c) => c.names.includes(key))
  if (named) return named
  const iso = placeCountry(key)
  return (iso && COUNTRIES.find((c) => c.iso === iso)) || null
}

/** Month as the northern-hemisphere season tables read it: shifted by six in the south. */
function seasonMonth(month: number, hemisphere: Country['hemisphere']): number {
  return hemisphere === 'S' ? ((month + 5) % 12) + 1 : month
}

/** The country's photo for a start month (1–12 or null) and whether the trip wants beaches. */
export function countryPhoto(country: Country, opts: { month?: number | null; beach?: boolean } = {}): CountryPhoto {
  const { month = null, beach = false } = opts
  const m = month !== null && month >= 1 && month <= 12 ? seasonMonth(month, country.hemisphere) : null
  const season = m === null ? undefined : country.photos.find((p) => p.season?.months.includes(m))
  if (beach) {
    if (season?.beach) return season
    const beachPhoto = country.photos.find((p) => p.beach && !p.season)
    if (beachPhoto) return beachPhoto
  }
  if (season) return season
  return country.photos.find((p) => !p.beach && !p.season) ?? country.photos[0]
}

/** City photo → country photo → null (map cover) for a destination. */
export function coverFor(
  destination: string | null | undefined,
  opts: { month?: number | null; interests?: readonly string[] } = {}
): CoverPhoto | null {
  const city = photoFor(destination)
  if (city) return city
  const country = countryFor(destination)
  if (!country) return null
  return countryPhoto(country, { month: opts.month, beach: opts.interests?.includes(BEACHES) ?? false })
}

/** Start month (1–12) from an ISO date, or null. */
export function startMonth(date: string | null | undefined): number | null {
  const m = date ? /^\d{4}-(\d{2})-\d{2}$/.exec(date) : null
  const n = m ? Number(m[1]) : NaN
  return n >= 1 && n <= 12 ? n : null
}

/** The cover for a saved trip: its destination (else title), start month and pass interests. */
export function tripCover(trip: Pick<PlanTrip, 'destination' | 'title' | 'start_date' | 'extra_data'>): CoverPhoto | null {
  const interests = storedPass(trip)?.interests
  return coverFor(trip.destination || trip.title, {
    month: startMonth(trip.start_date),
    interests: Array.isArray(interests) ? interests.filter((i): i is string => typeof i === 'string') : [],
  })
}
