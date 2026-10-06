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
import { dayDate } from '@/lib/plan/board'
import type { PlanTrip } from '@/lib/plan/types'
import type { CityPhoto } from '@/lib/photos/manifest'
import { PassCover, PhotoCredit } from '@/components/pass/PassCover'

// Element Timing attribute (not in React's DOM types, passed through as-is).
// The budgets spec reads when the board first paints from it (Q46).
const BOARD_TIMING = { elementtiming: 'board' } as Record<string, string>

type Pass = {
  when?: unknown
  adults?: unknown
  kids?: unknown
  interests?: unknown
  note?: unknown
}

function passOf(trip: PlanTrip): Pass | null {
  const pass = trip.extra_data?.pass
  return pass && typeof pass === 'object' ? (pass as Pass) : null
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}

/** "12–15 May", "28 May – 2 Jun", "{n} days" (pass length) or "Open". */
export function whenValue(trip: PlanTrip): string {
  const first = dayDate(trip.start_date, 1)
  const last = dayDate(trip.end_date, 1)
  if (first && last) {
    return first.month === last.month
      ? first.day === last.day
        ? `${first.day} ${first.month}`
        : `${first.day}–${last.day} ${first.month}`
      : `${first.day} ${first.month} – ${last.day} ${last.month}`
  }
  const when = passOf(trip)?.when as { kind?: unknown; days?: unknown } | null | undefined
  const days = when?.kind === 'length' ? count(when.days) : null
  if (days) return `${days} ${days === 1 ? 'day' : 'days'}`
  return 'Open'
}

/** "2 adults · 1 kid", or "—" when the pass has no travellers. */
export function whoValue(trip: PlanTrip): string {
  const pass = passOf(trip)
  const adults = count(pass?.adults)
  const kids = count(pass?.kids)
  const parts: string[] = []
  if (adults) parts.push(`${adults} ${adults === 1 ? 'adult' : 'adults'}`)
  if (kids) parts.push(`${kids} ${kids === 1 ? 'kid' : 'kids'}`)
  return parts.length ? parts.join(' · ') : '—'
}

/** "Food · Views", "+ note" when a note exists, or "—". */
export function intoValue(trip: PlanTrip): string {
  const pass = passOf(trip)
  const interests = Array.isArray(pass?.interests)
    ? pass.interests.filter((i): i is string => typeof i === 'string' && i.trim() !== '')
    : []
  const note = typeof pass?.note === 'string' && pass.note.trim() !== ''
  if (interests.length === 0) return note ? 'Note' : '—'
  return interests.join(' · ') + (note ? ' + note' : '')
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
