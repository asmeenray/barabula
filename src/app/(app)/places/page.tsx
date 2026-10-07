import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { toPlaces, type PlacesRow } from '@/lib/places-tab/filter'
import { PlacesClient, PlacesLoadError } from '@/components/places/PlacesClient'

// The Places tab (D-28): every place across the signed-in user's own trips.
// Server-rendered from one RLS read; the root top bar and tab bar come from
// AppShell. No loading.tsx: the read is one query and the page has no other
// data to wait for.

const COLUMNS =
  'id, title, destination, start_date, end_date, updated_at, activities(id, name, location, activity_type, day_number, position, extra_data)'

export default async function PlacesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Places needs an account (UI-SPEC §1); logged out goes to sign-in (T-16-51).
  if (!user) redirect('/login')

  // RLS limits rows to the owner; the user_id filter is a second guard (T-16-51).
  const { data, error } = await supabase.from('itineraries').select(COLUMNS).eq('user_id', user.id)

  if (error || !Array.isArray(data)) {
    console.error('[places] read failed', error?.code)
    return <PlacesLoadError />
  }

  const { trips, points } = toPlaces(data as PlacesRow[])
  return <PlacesClient points={points} trips={trips} />
}
