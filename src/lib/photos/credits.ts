// Photo credit rows for the Credits page (UI-SPEC §You, "Credits"): one line
// per curated photo, straight from the manifest.

import { CITY_PHOTOS } from './manifest'

export type PhotoCreditRow = {
  city: string
  photographer: string
  licence: string
  licenceUrl: string
  sourceUrl: string
}

export function credits(): PhotoCreditRow[] {
  return CITY_PHOTOS.map(({ city, photographer, licence, licenceUrl, sourceUrl }) => ({
    city,
    photographer,
    licence,
    licenceUrl,
    sourceUrl,
  }))
}
