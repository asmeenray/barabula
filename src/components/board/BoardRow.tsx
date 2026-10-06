import { useRef } from 'react'
import type { Chip } from '@/lib/plan/board'
import type { WalkCell } from '@/lib/plan/walk'
import type { PlanActivity } from '@/lib/plan/types'
import type { ActivityUpdate } from '@/lib/plan/use-plan'
import { PlaceTicket, TICKET_CLICK_MARK, ticketId } from './PlaceTicket'
import { StatusChip } from './StatusChip'

// One departure-board line (UI-SPEC §7 item 6): # · place · walk · status.
// Walk cell reads START (first located stop), "~{n} min" or "—"; a bare
// number is never shown. Maybe rows show "—" for # and walk.
// The row is a button that opens the place's ticket inline under it (§7 item
// 7); the parent keeps one ticket open at a time. Escape closes it and puts
// focus back on the row. (No 'use client' here: BoardHead imports BOARD_GRID
// and must not get a client reference; every user of BoardRow is a client.)

export const BOARD_GRID = 'grid grid-cols-[32px_minmax(0,1fr)_64px_80px] gap-2 px-4'

interface BoardRowProps {
  activity: PlanActivity
  /** 1-based stop number in the day; null in Maybe. */
  number: number | null
  walk: WalkCell
  chip: Chip
  /** This row's ticket is open. */
  open: boolean
  onToggle: (open: boolean) => void
  /** The last change to this row failed to save (D-33). */
  unsaved: boolean
  onUpdate: (id: string, update: ActivityUpdate) => void
}

function two(n: number): string {
  return String(n).padStart(2, '0')
}

/** "14:30" from a stored time ("14:30" or "14:30:00"); other formats as stored. */
function clock(time: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim())
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : time.trim()
}

export function BoardRow({ activity: a, number, walk, chip, open, onToggle, unsaved, onUpdate }: BoardRowProps) {
  const rowRef = useRef<HTMLButtonElement>(null)
  const visited = chip === 'VISITED'
  // D-25: clock times are shown only for fixed anchors (bookings, timed tickets).
  const fixedTime = a.extra_data?.fixed_time === true && a.time ? clock(a.time) : null

  function toggle() {
    if (!open) performance.mark(TICKET_CLICK_MARK)
    onToggle(!open)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Escape' || !open) return
    e.stopPropagation()
    onToggle(false)
    rowRef.current?.focus()
  }

  return (
    <li data-activity-id={a.id} data-chip={chip} className="border-b border-board-line" onKeyDown={onKeyDown}>
      <button
        ref={rowRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? ticketId(a.id) : undefined}
        onClick={toggle}
        className={`${BOARD_GRID} min-h-14 w-full items-start py-3 text-left transition-colors duration-150 ease-out ${
          open ? 'bg-row-selected' : 'lg:hover:bg-surface-2'
        }`}
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
          {unsaved && (
            <span data-unsaved className="mt-0.5 block text-xs leading-[1.33] text-board-muted">
              Not saved yet
            </span>
          )}
        </span>

        {/* Walk: START / ~{n} min / — (always "~": straight-line estimate). */}
        <span
          data-walk
          className={`pt-0.5 font-mono text-xs leading-tight whitespace-nowrap text-board-muted tabular-nums ${
            walk === 'start' ? 'uppercase' : ''
          }`}
        >
          {walk === 'start' ? 'Start' : walk === null ? '—' : `~${walk} min`}
        </span>

        <span className="justify-self-end">
          <StatusChip chip={chip} />
        </span>
      </button>

      {open && <PlaceTicket activity={a} stop={number} walk={walk} onUpdate={onUpdate} />}
    </li>
  )
}
