// Server-only data for the home page (Trips tab). The random cover city and
// "today" are computed here, never during render (React Compiler purity lint,
// Pitfall 10). Today is the user's own calendar day from the tz cookie
// (Pitfall 9), UTC on the very first visit.

import type { SupabaseClient, User } from '@supabase/supabase-js'
import { tripCover } from '@/lib/photos/cover'
import { CITY_PHOTOS, type CityPhoto, type CoverPhoto } from '@/lib/photos/manifest'
import { photoFor, randomCity } from '@/lib/photos/match'
import { findCity } from '@/lib/photos/normalize'
import { dayCountFor } from '@/lib/plan/days'
import type { ExtraData } from '@/lib/plan/types'
import { passTitle } from '@/lib/pass/format'
import { tripDates, tripInto, tripStops, tripWhen, tripWho } from '@/lib/pass/trip-values'
import { sectionTrips } from './sections'
import { nextPlaceFor, statusLine, type StatusActivity } from './status'
import { todayInZone } from './today'

/** One trip as the home passes and stubs print it. Plain data, safe to pass to client components. */
export type HomeTrip = {
  id: string
  /** Cover / stub title: the trip title, or the stops as codes ("LIS → PRG") when every stop has one. */
  title: string
  /** Seeds the city-map cover when there is no photo. */
  city: string
  /** City photo, else the country photo (16-21), else null for the city-map cover. */
  photo: CoverPhoto | null
  /** IATA code for a single-stop trip whose curated city has a real one. */
  code?: string
  /** "12–15 May" from the dates; null when undated. */
  dates: string | null
  /** Dates, else the pass length ("4 days"); null when neither. */
  when: string | null
  who: string | null
  into: string | null
  dayCount: number
  placeCount: number
  /** Now/Next cover line ("Day 2 of 3", "Departs in 11 days", "Dates not set"); null once ended. */
  status: string | null
  /** First not-visited place of today's day, during the trip. */
  nextPlace: string | null
}

export type HomeData = {
  /** Random curated city for the blank pass cover (D-09). */
  coverCity: CityPhoto
  /** The curated set, offered first in "Where to?". */
  cities: readonly CityPhoto[]
  /** The signed-in user's own trips; null when logged out or the read failed. */
  tripCount: number | null
  /** The user's calendar day (YYYY-MM-DD) the sections were computed for. */
  today: string
  /** The trip happening today (shown above the blank pass). */
  now: HomeTrip | null
  /** Otherwise the soonest upcoming trip, else the most recently edited undated one. */
  next: HomeTrip | null
  upcoming: HomeTrip[]
  past: HomeTrip[]
}

type Row = {
  id: string
  title: string
  destination: string | null
  start_date: string | null
  end_date: string | null
  updated_at: string | null
  extra_data: ExtraData
  activities: StatusActivity[] | null
}

const TRIP_COLUMNS =
  'id, title, destination, start_date, end_date, updated_at, extra_data, activities(id, day_number, position, name, extra_data)'

const codeOf = (stop: string) => findCity(CITY_PHOTOS, stop)?.iata

function toHomeTrip(row: Row, today: string): HomeTrip {
  const activities = row.activities ?? []
  const city = row.destination || row.title
  const photo = tripCover(row)
  const stops = tripStops(row)
  const multi = stops.length > 1
  return {
    id: row.id,
    title: multi ? passTitle(stops, codeOf) : row.title || city,
    city,
    photo,
    code: multi ? undefined : photoFor(city)?.iata,
    dates: tripDates(row),
    when: tripWhen(row),
    who: tripWho(row),
    into: tripInto(row),
    dayCount: dayCountFor(row, activities),
    placeCount: activities.length,
    status: statusLine(row, today),
    nextPlace: nextPlaceFor(row, activities, today),
  }
}

export async function getHomeData(
  supabase: SupabaseClient,
  user: User | null,
  tz?: string | null,
  now: Date = new Date()
): Promise<HomeData> {
  const today = todayInZone(tz, now)
  const empty = { now: null, next: null, upcoming: [], past: [] }
  let tripCount: number | null = null
  let sections: Pick<HomeData, 'now' | 'next' | 'upcoming' | 'past'> = empty

  if (user) {
    // RLS client; the user_id filter is a second guard (T-16-36). Logged out reads nothing.
    const { data, error } = await supabase.from('itineraries').select(TRIP_COLUMNS).eq('user_id', user.id)
    if (!error && Array.isArray(data)) {
      const rows = data as Row[]
      tripCount = rows.length
      const s = sectionTrips(rows, today)
      const map = (r: Row) => toHomeTrip(r, today)
      sections = {
        now: s.now && map(s.now),
        next: s.next && map(s.next),
        upcoming: s.upcoming.map(map),
        past: s.past.map(map),
      }
    }
  }

  return { coverCity: randomCity(), cities: CITY_PHOTOS, tripCount, today, ...sections }
}

/** First visit (UI-SPEC §2): logged out, or signed in with no trips yet. */
export function isFirstVisit(signedIn: boolean, tripCount: number | null): boolean {
  return !signedIn || tripCount === 0
}
