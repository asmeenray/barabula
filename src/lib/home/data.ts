// Server-only data for the home page (Trips tab). The random cover city is
// picked here, never during render (React Compiler purity lint, Pitfall 10).
// 16-12 extends this with the user's trips.

import type { SupabaseClient, User } from '@supabase/supabase-js'
import { CITY_PHOTOS, type CityPhoto } from '@/lib/photos/manifest'
import { randomCity } from '@/lib/photos/match'

export type HomeData = {
  /** Random curated city for the blank pass cover (D-09). */
  coverCity: CityPhoto
  /** The curated set, offered first in "Where to?". */
  cities: readonly CityPhoto[]
  /** The signed-in user's own trips; null when logged out or the count failed. */
  tripCount: number | null
}

export async function getHomeData(supabase: SupabaseClient, user: User | null): Promise<HomeData> {
  let tripCount: number | null = null
  if (user) {
    // RLS client; the user_id filter is a second guard. head: no rows, count only.
    const { count, error } = await supabase
      .from('itineraries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    tripCount = error ? null : (count ?? 0)
  }
  return { coverCity: randomCity(), cities: CITY_PHOTOS, tripCount }
}

/** First visit (UI-SPEC §2): logged out, or signed in with no trips yet. */
export function isFirstVisit(signedIn: boolean, tripCount: number | null): boolean {
  return !signedIn || tripCount === 0
}
