import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getHomeData, isFirstVisit } from '@/lib/home/data'
import { BlankPass } from '@/components/pass/BlankPass'
import { WhatBarabulaDoes } from '@/components/pass/WhatBarabulaDoes'

// Home = Trips tab (UI-SPEC §2, D-07, D-08). Server Component: the cover city
// is chosen on the server per request (D-09), so this page is never static.
// Until 16-12 adds Now/Next, Upcoming and Past, the blank pass spans the row
// on laptop (horizontal). First visit (logged out, or no trips): the pass, one
// line of guidance and What Barabula does, nothing else.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // The tz cookie (head script) gives the user's own today; UTC on the first visit.
  const tz = (await cookies()).get('tz')?.value
  const home = await getHomeData(supabase, user, tz)
  const firstVisit = isFirstVisit(!!user, home.tripCount)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-4 pt-4 pb-16 lg:gap-12 lg:px-8 lg:pt-8">
        <div className="flex flex-col gap-4">
          <BlankPass coverPhoto={home.coverCity} photos={home.cities} signedIn={!!user} layout="horizontal" />
          {firstVisit && <p className="text-base text-muted">Fill the pass to plan your first trip.</p>}
        </div>
        <WhatBarabulaDoes />
      </div>
    </div>
  )
}
