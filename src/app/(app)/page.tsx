import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getHomeData, isFirstVisit } from '@/lib/home/data'
import { BlankPass } from '@/components/pass/BlankPass'
import { NowNextPass } from '@/components/pass/NowNextPass'
import { UpcomingList } from '@/components/pass/UpcomingPass'
import { PastPile } from '@/components/pass/PastPile'
import { CreateTripTile } from '@/components/pass/CreateTripTile'
import { WhatBarabulaDoes } from '@/components/pass/WhatBarabulaDoes'

// Home = Trips tab (UI-SPEC §2, D-07, D-08). Server Component: the cover city
// and the user's "today" are worked out on the server per request (D-09,
// Pitfall 9), so this page is never static. Order: during a trip the Now pass
// comes first, then the blank pass; otherwise the blank pass, then the Next
// pass. Then Upcoming, Past, Create a new trip and What Barabula does. Laptop
// row 1 = the two passes side by side as vertical passes; with no Now/Next pass
// the blank pass spans the row (horizontal). First visit (logged out, or no
// trips): the pass, one line of guidance and What Barabula does, nothing else.
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
  const paired = !!(home.now || home.next)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-4 pt-4 pb-16 lg:gap-12 lg:px-8 lg:pt-8">
        <div className={paired ? 'grid items-start gap-4 lg:grid-cols-2 lg:gap-8' : 'flex flex-col gap-4'}>
          {home.now && <NowNextPass trip={home.now} state="now" priority />}
          <BlankPass
            coverPhoto={home.coverCity}
            photos={home.cities}
            signedIn={!!user}
            layout={paired ? 'vertical' : 'horizontal'}
            priority={!home.now}
          />
          {home.next && <NowNextPass trip={home.next} state="next" />}
          {firstVisit && <p className="text-base text-muted">Fill the pass to plan your first trip.</p>}
        </div>
        <UpcomingList trips={home.upcoming} />
        <PastPile trips={home.past} />
        <CreateTripTile tripCount={home.tripCount} />
        <WhatBarabulaDoes />
      </div>
    </div>
  )
}
