// Server-only data for the home page (Trips tab). The random cover city is
// picked here, never during render (React Compiler purity lint, Pitfall 10).
// 16-12 extends this with the user's trips.

import { CITY_PHOTOS, type CityPhoto } from '@/lib/photos/manifest'
import { randomCity } from '@/lib/photos/match'

export type HomeData = {
  /** Random curated city for the blank pass cover (D-09). */
  coverCity: CityPhoto
  /** The curated set, offered first in "Where to?". */
  cities: readonly CityPhoto[]
}

export function getHomeData(): HomeData {
  return { coverCity: randomCity(), cities: CITY_PHOTOS }
}
