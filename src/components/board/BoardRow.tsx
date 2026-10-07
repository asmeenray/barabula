import { useRef } from 'react'
import type { Chip } from '@/lib/plan/board'
import type { WalkCell } from '@/lib/plan/walk'
import type { PlanActivity } from '@/lib/plan/types'
import type { ActivityUpdate } from '@/lib/plan/use-plan'
import { PlaceTicket, TICKET_CLICK_MARK, ticketId } from './PlaceTicket'
import { GripVerticalIcon } from '@/components/icons'
import { RowMenu, type RowActions } from './RowMenu'
import { StatusChip } from './StatusChip'

// One departure-board line (UI-SPEC §7 item 6): # · place · walk · status.
// Walk cell reads START (first located stop), "~{n} min" or "—"; a bare
// number is never shown. Maybe rows show "—" for # and walk.
// The row is a button that opens the place's ticket inline under it (§7 item
// 7); the parent keeps one ticket open at a time. Escape closes it and puts
// focus back on the row. Laptop rows also get a trailing "⋯" menu (16-09),
// shown on row hover or focus-within; on phone the menu lives in the ticket.
// Once the drag layer has loaded (16-14) the row gets a grip handle that takes
// the "#" cell on laptop hover/focus; on phone a long-press on the row drags it.
// (No 'use client' here: BoardHead imports BOARD_GRID
// and must not get a client reference; every user of BoardRow is a client.)

export const BOARD_GRID = 'grid grid-cols-[32px_minmax(0,1fr)_64px_80px] gap-2 px-4'

/**
 * A draggable row: no long-press callout or text selection on phone; lifted
 * while dragged (scale 1.02 + the sheet shadow; dark: a 1 px line, no shadow, as
 * the dark passes do, UI-SPEC Elevation). dnd-kit
 * sets data-dnd-dragging on the row while it is in the air.
 */
const DRAG_ROW =
  'max-lg:select-none max-lg:[-webkit-touch-callout:none] data-[dnd-dragging]:scale-[1.02] data-[dnd-dragging]:bg-board data-[dnd-dragging]:shadow-[0_-12px_40px_-12px_rgba(10,20,30,.4)] dark:data-[dnd-dragging]:border dark:data-[dnd-dragging]:border-line dark:data-[dnd-dragging]:shadow-none'

interface BoardRowProps {
  activity: PlanActivity
  /** 1-based stop number in the day; null in Maybe. */
  number: number | null
  walk: WalkCell
  chip: Chip
  /** This row's ticket is open. */
  open: boolean
  onToggle: (open: boolean) => void
  /** Laptop: this row or its pin is under the pointer (row wash, pin grows). */
  hovered?: boolean
  /** Laptop: pointer entered (id) or left (null) the row. */
  onHover?: (id: string | null) => void
  /** The last change to this row failed to save (D-33). */
  unsaved: boolean
  onUpdate: (id: string, update: ActivityUpdate) => void
  /** Row menu actions (Move to day…, Move up/down, Maybe, Edit, Remove). */
  actions: RowActions
  /** The inline edit form (laptop, 16-11); shown instead of the ticket. */
  editor?: React.ReactNode
  /** Map lookup state for this place (16-11, D-23, D-24). */
  geo?: RowGeo
  /** Registers the row element (the li) for the drag layer (16-14). */
  itemRef?: (el: Element | null) => void
  /** Set once the drag layer has loaded: registers the grip handle and shows it. */
  handleRef?: ((el: Element | null) => void) | null
}

/** A place's map lookup state, from useGeocode. */
export interface RowGeo {
  /** A lookup for it is running. */
  finding: boolean
  /** The user's "Find on map" found nothing (or it has no address). */
  stillOff: boolean
  /** "Find on map": one lookup through the server. */
  find: () => void
}

/** Not on the map: no address, or the lookup found nothing (UI-SPEC "NOT ON MAP"). */
export function notOnMap(a: Pick<PlanActivity, 'location' | 'extra_data'>): boolean {
  return !a.location?.trim() || a.extra_data?.geo_status === 'not_found'
}

function two(n: number): string {
  return String(n).padStart(2, '0')
}

/** "14:30" from a stored time ("14:30" or "14:30:00"); other formats as stored. */
function clock(time: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim())
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : time.trim()
}

export function BoardRow({
  activity: a,
  number,
  walk,
  chip,
  open,
  onToggle,
  hovered = false,
  onHover,
  unsaved,
  onUpdate,
  actions,
  editor = null,
  geo,
  itemRef,
  handleRef = null,
}: BoardRowProps) {
  const draggable = handleRef !== null
  const rowRef = useRef<HTMLButtonElement>(null)
  const visited = chip === 'VISITED'
  // D-25: clock times are shown only for fixed anchors (bookings, timed tickets).
  const fixedTime = a.extra_data?.fixed_time === true && a.time ? clock(a.time) : null

  function toggle() {
    if (!open) performance.mark(TICKET_CLICK_MARK)
    onToggle(!open)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Escape' || !open || e.defaultPrevented) return
    // Keys from the row menu bubble here through its portal; the menu handles its own Escape.
    if (!e.currentTarget.contains(e.target as Node)) return
    e.stopPropagation()
    onToggle(false)
    rowRef.current?.focus()
  }

  return (
    <li
      ref={itemRef}
      data-activity-id={a.id}
      data-chip={chip}
      className={`group relative border-b border-board-line ${draggable ? DRAG_ROW : ''}`}
      onKeyDown={onKeyDown}
      onMouseEnter={onHover && (() => onHover(a.id))}
      onMouseLeave={onHover && (() => onHover(null))}
    >
      {/* Laptop drag handle: replaces the "#" number on row hover or focus (UI-SPEC §8).
          First in the DOM so Tab goes grip → row → "⋯". Hidden on phone (long-press the row). */}
      {draggable && (
        <button
          ref={handleRef}
          type="button"
          aria-label={`Drag ${a.name} to reorder`}
          className="absolute top-1.5 left-2 z-[1] inline-flex size-11 cursor-grab touch-none items-center justify-center rounded-lg text-board-muted opacity-0 transition-opacity duration-150 ease-out group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing max-lg:hidden"
        >
          <GripVerticalIcon />
        </button>
      )}
      <button
        ref={rowRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? ticketId(a.id) : undefined}
        onClick={toggle}
        className={`${BOARD_GRID} min-h-14 w-full items-start py-3 text-left transition-colors duration-150 ease-out ${
          open || hovered ? 'bg-row-selected' : 'lg:group-hover:bg-surface-2'
        }`}
      >
        <span
          className={`font-mono text-base leading-tight font-semibold text-board-muted tabular-nums ${
            draggable ? 'lg:group-focus-within:invisible lg:group-hover:invisible' : ''
          }`}
        >
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
          {/* Meta line: "Finding on map…" while a lookup runs, the NOT ON MAP tag
              (sentence case in the DOM, uppercase by CSS), else the location. */}
          {geo?.finding ? (
            <span data-geo="finding" className="mt-0.5 block truncate font-mono text-xs text-board-muted">
              Finding on map…
            </span>
          ) : notOnMap(a) ? (
            <span
              data-geo="not-on-map"
              className="mt-1 inline-flex h-5 items-center rounded-[4px] border border-board-muted px-1.5 font-label text-xs leading-none font-semibold tracking-[0.16em] whitespace-nowrap text-board-muted uppercase"
            >
              Not on map
            </span>
          ) : (
            a.location && <span className="mt-0.5 block truncate font-mono text-xs text-board-muted">{a.location}</span>
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

        {/* Laptop: the "⋯" takes the status cell while the row is hovered or focused. */}
        <span className="justify-self-end lg:group-focus-within:invisible lg:group-hover:invisible">
          <StatusChip chip={chip} />
        </span>
      </button>

      {/* Laptop: trailing "⋯" over the status cell while the row is hovered or focused. */}
      <RowMenu
        placeName={a.name}
        day={a.day_number}
        {...actions}
        className="absolute top-1.5 right-2 bg-surface-2 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 max-lg:hidden"
      />

      {editor ?? (open && <PlaceTicket activity={a} stop={number} walk={walk} onUpdate={onUpdate} actions={actions} geo={geo} />)}
    </li>
  )
}
