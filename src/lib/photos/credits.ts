// Credit rows for the Credits page (UI-SPEC §You, "Credits"): one line per
// curated photo (cities, then country photos from 16-21), straight from the
// manifests, plus the place-name data credit. Server-only, like the manifests.

import { COUNTRIES } from './countries'
import { CITY_PHOTOS } from './manifest'

export type PhotoCreditRow = {
  /** City, or country with its variant ("Norway, summer"). */
  city: string
  photographer: string
  licence: string
  licenceUrl: string
  sourceUrl: string
}

export type DataCredit = {
  name: string
  url: string
  licence: string
  licenceUrl: string
  /** What we use it for, in plain words. */
  use: string
}

/**
 * GeoNames place names (CC BY 4.0) behind the country cover photos
 * (scripts/photos/geonames.mjs). GeoNames asks for credit with a link.
 */
export const GEONAMES_CREDIT: DataCredit = {
  name: 'GeoNames',
  url: 'https://www.geonames.org',
  licence: 'CC BY 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
  use: 'Place names, trimmed to name, alternate names, country and population',
}

export function credits(): PhotoCreditRow[] {
  const cities = CITY_PHOTOS.map(({ city, photographer, licence, licenceUrl, sourceUrl }) => ({
    city,
    photographer,
    licence,
    licenceUrl,
    sourceUrl,
  }))
  const countries = COUNTRIES.flatMap(({ country, photos }) =>
    photos.map(({ beach, season, photographer, licence, licenceUrl, sourceUrl }) => ({
      city: beach ? `${country}, beach` : season ? `${country}, ${season.name}` : country,
      photographer,
      licence,
      licenceUrl,
      sourceUrl,
    }))
  )
  return [...cities, ...countries]
}

/** Data sources to credit next to the photos. */
export function dataCredits(): DataCredit[] {
  return [GEONAMES_CREDIT]
}
