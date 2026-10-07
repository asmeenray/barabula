'use client'

// Plan header (UI-SPEC §7 items 1–2): a 96 px PassCover strip (the curated
// photo, or the styled city-map cover) with the city in white inside the scrim,
// then the ticket row WHEN · WHO · INTO and, under it, the photo credit when a
// photo shows (the strip has no pass body). The photo is chosen on the server
// page with photoFor(trip.destination) and passed down, so the manifest stays
// out of client JS. On the plan the photo download waits for the map (PlanClient
// passes holdPhoto) so it never slows the map on a slow phone. Read-only here;
// the cells become question sheet triggers in 16-17. Values are sentence case;
// CSS sets the casing.

import { useState } from 'react'
import { tripInto, tripWhen, tripWho } from '@/lib/pass/trip-values'
import type { PlanTrip } from '@/lib/plan/types'
import type { CityPhoto } from '@/lib/photos/manifest'
import { PassCover, PhotoCredit } from '@/components/pass/PassCover'

// Element Timing attribute (not in React's DOM types, passed through as-is).
// The budgets spec reads when the board first paints from it (Q46).
const BOARD_TIMING = { elementtiming: 'board' } as Record<string, string>

/** "12–15 May", "28 May – 2 Jun", "{n} days" (pass length) or "Open". */
export function whenValue(trip: PlanTrip): string {
  return tripWhen(trip) ?? 'Open'
}

/** "2 adults · 1 kid", or "—" when the pass has no travellers. */
export function whoValue(trip: PlanTrip): string {
  return tripWho(trip) ?? '—'
}

/** "Food · Views", "+ note" when a note exists, or "—". */
export function intoValue(trip: PlanTrip): string {
  return tripInto(trip) ?? '—'
}

export function PlanHeader({
  trip,
  photo,
  holdPhoto = false,
}: {
  trip: PlanTrip
  photo: CityPhoto | null
  holdPhoto?: boolean
}) {
  const city = trip.destination || trip.title
  // A failed photo becomes the map cover; its credit goes with it.
  const [photoFailed, setPhotoFailed] = useState(false)
  const cells = [
    { label: 'When', value: whenValue(trip) },
    { label: 'Who', value: whoValue(trip) },
    { label: 'Into', value: intoValue(trip) },
  ]

  return (
    <header>
      <PassCover
        variant="header"
        photo={photo}
        cityName={city}
        title={city}
        code={photo?.iata}
        titleAs="h1"
        titleAttrs={BOARD_TIMING}
        holdPhoto={holdPhoto}
        onFallback={() => setPhotoFailed(true)}
      />

      <dl className="grid grid-cols-3 border-b border-board-line">
        {cells.map((c, i) => (
          <div
            key={c.label}
            className={`flex min-h-11 min-w-0 flex-col justify-center px-4 py-1.5 ${
              i > 0 ? 'border-l-[1.5px] border-dashed border-perf' : ''
            }`}
          >
            <dt className="font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-board-muted uppercase">
              {c.label}
            </dt>
            <dd className="truncate font-mono text-base leading-tight font-semibold uppercase tabular-nums" title={c.value}>
              {c.value}
            </dd>
          </div>
        ))}
      </dl>

      {photo && !photoFailed && (
        <PhotoCredit photo={photo} className="border-b border-board-line px-4 py-2 text-board-muted" />
      )}
    </header>
  )
}
