import { dayTitle, stopsLabel } from '@/lib/plan/board'
import { BOARD_GRID } from './BoardRow'

// Board head (UI-SPEC §7 items 4–5): "{CITY} · DAY {n}", the big Mono line
// ("TUE 12 MAY" or "DAY {n}") and "{n} STOPS · ~{km} KM", then the column
// heads # · PLACE · WALK · STATUS. Casing comes from CSS.

interface BoardHeadProps {
  id: string
  city: string
  /** 1-based day, or 'maybe' for the Maybe bucket. */
  day: number | 'maybe'
  startDate: string | null
  stops: number
  km: number
  /** The big head is phone-only when the laptop shows its own day header row. */
  className?: string
}

export function BoardHead({ id, city, day, startDate, stops, km, className }: BoardHeadProps) {
  const isMaybe = day === 'maybe'
  return (
    <div className={`px-4 pt-4 pb-3 ${className ?? ''}`}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-board-muted uppercase">
            {city} · {isMaybe ? 'Maybe' : `Day ${day}`}
          </p>
          <h2
            id={`day-head-${id}`}
            className="mt-1 font-mono text-[22px] leading-[1.2] font-semibold uppercase tabular-nums"
          >
            {isMaybe ? 'Maybe' : dayTitle(startDate, day)}
          </h2>
        </div>
        <p className="shrink-0 pb-0.5 font-mono text-xs leading-[1.33] text-board-muted uppercase tabular-nums">
          {stopsLabel(stops)}
          {!isMaybe && ` · ~${km} km`}
        </p>
      </div>
    </div>
  )
}

export function ColumnHeads() {
  return (
    <div
      aria-hidden
      className={`${BOARD_GRID} border-b border-board-line pb-2 font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-board-muted uppercase`}
    >
      <span>#</span>
      <span>Place</span>
      <span>Walk</span>
      <span className="text-right">Status</span>
    </div>
  )
}
