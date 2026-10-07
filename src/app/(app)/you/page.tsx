import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PassengerCard } from '@/components/you/PassengerCard'
import { SettingsList } from '@/components/you/SettingsList'
import { cleanHomeCity } from '@/lib/you/home-city'
import pkg from '../../../../package.json'

// The You tab (D-29, UI-SPEC §11): passenger card and settings. The root top
// bar and tab bar come from AppShell. Name, avatar and home city come from
// the signed-in user's own auth record (user_metadata, D-43); the trip count
// is one RLS-limited count query.

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** Google's avatar, https only (T-16-56); anything else falls back to initials. */
function avatarUrl(value: unknown): string | null {
  const url = text(value)
  if (!url) return null
  try {
    return new URL(url).protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

export default async function YouPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // You needs an account (UI-SPEC §1).
  if (!user) redirect('/login')

  // RLS limits rows to the owner; the user_id filter is a second guard.
  const { count, error } = await supabase
    .from('itineraries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if (error) console.error('[you] trip count failed', error.code)

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const name = text(meta.full_name) ?? text(meta.name) ?? user.email?.split('@')[0] ?? 'Passenger'
  const home = text(meta.home_city)
  // Display-only, length-bounded, rendered as text (T-16-54).
  const homeCity = home ? cleanHomeCity(home) || null : null

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[640px] px-4 pt-4 pb-12 lg:px-8 lg:pt-8">
        <PassengerCard
          name={name}
          avatarUrl={avatarUrl(meta.avatar_url) ?? avatarUrl(meta.picture)}
          trips={error ? null : (count ?? 0)}
          homeCity={homeCity}
        />
        <SettingsList homeCity={homeCity} version={pkg.version} />
      </div>
    </div>
  )
}
