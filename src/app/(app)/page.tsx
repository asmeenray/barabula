import { createClient } from '@/lib/supabase/server'
import { getHomeData } from '@/lib/home/data'
import { BlankPass } from '@/components/pass/BlankPass'

// Home = Trips tab (UI-SPEC §2, D-07). Server Component: the cover city is
// chosen on the server per request (D-09), so this page is never static.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const home = getHomeData()

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1120px] px-4 pt-4 pb-16 lg:px-8 lg:pt-8">
        <BlankPass coverPhoto={home.coverCity} photos={home.cities} signedIn={!!user} />
      </div>
    </div>
  )
}
