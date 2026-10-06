// Plan header (UI-SPEC §7 items 1–2): a 96 px strip with the city in white
// inside a scrim (the photo cover replaces the plain gradient in 16-08), then
// the ticket row WHEN · WHO · INTO. Read-only here; the cells become question
// sheet triggers in 16-17. Values are sentence case; CSS sets the casing.

import { dayDate } from '@/lib/plan/board'
import type { PlanTrip } from '@/lib/plan/types'

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

export function PlanHeader({ trip }: { trip: PlanTrip }) {
  const city = trip.destination || trip.title
  const cells = [
    { label: 'When', value: whenValue(trip) },
    { label: 'Who', value: whoValue(trip) },
    { label: 'Into', value: intoValue(trip) },
  ]

  return (
    <header>
      <div className="flex h-24 items-end bg-[linear-gradient(to_right,#0B1014_0%,#0B1014_45%,rgba(11,16,20,0)_100%)] px-4 pb-3">
        <h1
          {...BOARD_TIMING}
          className="line-clamp-2 max-w-[75%] font-mono text-[22px] leading-[1.2] font-semibold tracking-[-0.01em] break-words text-on-photo uppercase"
        >
          {city}
        </h1>
      </div>

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
    </header>
  )
}
