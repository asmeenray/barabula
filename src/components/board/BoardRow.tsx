import type { Chip } from '@/lib/plan/board'
import type { WalkCell } from '@/lib/plan/walk'
import type { PlanActivity } from '@/lib/plan/types'
import { StatusChip } from './StatusChip'

// One departure-board line (UI-SPEC §7 item 6): # · place · walk · status.
// Walk cell reads START (first located stop), "~{n} min" or "—"; a bare
// number is never shown. Maybe rows show "—" for # and walk.

export const BOARD_GRID = 'grid grid-cols-[32px_minmax(0,1fr)_64px_80px] gap-2 px-4'

interface BoardRowProps {
  activity: PlanActivity
  /** 1-based stop number in the day; null in Maybe. */
  number: number | null
  walk: WalkCell
  chip: Chip
}

function two(n: number): string {
  return String(n).padStart(2, '0')
}

/** "14:30" from a stored time ("14:30" or "14:30:00"); other formats as stored. */
function clock(time: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim())
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : time.trim()
}

export function BoardRow({ activity: a, number, walk, chip }: BoardRowProps) {
  const visited = chip === 'VISITED'
  // D-25: clock times are shown only for fixed anchors (bookings, timed tickets).
  const fixedTime = a.extra_data?.fixed_time === true && a.time ? clock(a.time) : null

  return (
    <li
      data-activity-id={a.id}
      data-chip={chip}
      className={`${BOARD_GRID} min-h-14 items-start border-b border-board-line py-3`}
    >
      <span className="font-mono text-base leading-tight font-semibold text-board-muted tabular-nums">
        {number === null ? '—' : two(number)}
      </span>

      <span className={`min-w-0 ${visited ? 'text-board-muted' : ''}`}>
        <span className="flex min-w-0 items-baseline gap-2">
          {fixedTime && (
            <time className="shrink-0 font-mono text-xs font-semibold tabular-nums">{fixedTime}</time>
          )}
          <span
            className={`line-clamp-2 min-w-0 font-label text-base leading-tight font-semibold tracking-[0.06em] break-words uppercase ${
              visited ? 'line-through decoration-[1.5px]' : ''
            }`}
          >
            {a.name}
          </span>
        </span>
        {a.location && (
          <span className="mt-0.5 block truncate font-mono text-xs text-board-muted">{a.location}</span>
        )}
      </span>

      {/* Walk: START / ~{n} min / — (always "~": straight-line estimate). */}
      <span
        className={`pt-0.5 font-mono text-xs leading-tight whitespace-nowrap text-board-muted tabular-nums ${
          walk === 'start' ? 'uppercase' : ''
        }`}
      >
        {walk === 'start' ? 'Start' : walk === null ? '—' : `~${walk} min`}
      </span>

      <span className="justify-self-end">
        <StatusChip chip={chip} />
      </span>
    </li>
  )
}
