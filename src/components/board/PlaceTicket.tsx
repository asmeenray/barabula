'use client'

import { useLayoutEffect, useRef } from 'react'
import { useAnnounce } from '@/components/a11y/LiveRegion'
import { useCanEdit } from '@/lib/client/use-online'
import { osmCoordsFrom } from '@/lib/geo-cache'
import { isVisited } from '@/lib/plan/board'
import { googleMapsUrl } from '@/lib/plan/maps-link'
import type { PlanActivity } from '@/lib/plan/types'
import type { ActivityUpdate } from '@/lib/plan/use-plan'
import type { WalkCell } from '@/lib/plan/walk'
import { RowMenu, type RowActions } from './RowMenu'
import type { RowGeo } from './BoardRow'

// A place's ticket, opened inline under its board row (UI-SPEC §7 item 7).
// Renders only from data already on the page: no fetch on open (≤ 300 ms).
// Labels stay sentence case in the DOM; CSS sets the casing.

/** Marked when a row is activated and when its ticket has mounted (budget checked in 16-24). */
export const TICKET_CLICK_MARK = 'barabula:ticket-click'
export const TICKET_VISIBLE_MARK = 'barabula:ticket-visible'

const QUIET_BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-surface-2 px-3 font-label text-base leading-none font-semibold tracking-[0.08em] text-ink uppercase'
export const QUIET_BUTTON = `${QUIET_BASE} transition-[background-color,transform] duration-150 ease-out hover:bg-line active:scale-[0.97]`
/** Disabled (UI-SPEC Interaction States): 40% opacity, no hover; still focusable. */
export const QUIET_BUTTON_DISABLED = `${QUIET_BASE} cursor-not-allowed opacity-40`

const LABEL = 'font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-board-muted uppercase'
const VALUE = 'font-mono text-base leading-tight font-semibold tabular-nums'

export function ticketId(activityId: string): string {
  return `ticket-${activityId}`
}

function two(n: number): string {
  return String(n).padStart(2, '0')
}

function clock(time: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim())
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : time.trim()
}

function text(value: string | null): string | null {
  const t = value?.trim()
  return t ? t : null
}

interface PlaceTicketProps {
  activity: PlanActivity
  /** 1-based stop number in the day; null in Maybe. */
  stop: number | null
  walk: WalkCell
  onUpdate: (id: string, update: ActivityUpdate) => void
  /** The "⋯" menu (16-09): the keyboard / screen-reader path for moves. */
  actions: RowActions
  /** Map lookup state and the "Find on map" retry (16-11). */
  geo?: RowGeo
}

const STILL_OFF = 'Still not on map. Add an address with Edit place.'

export function PlaceTicket({ activity: a, stop, walk, onUpdate, actions, geo }: PlaceTicketProps) {
  const announce = useAnnounce()
  // A just-added place can't be edited until its save has answered.
  const canEdit = useCanEdit() && !actions.locked

  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    performance.mark(TICKET_VISIBLE_MARK)
    // On phone a lower row's ticket opens below the fold; bring it into the
    // board's scroll area (instant: list scrolling is never animated).
    ref.current?.scrollIntoView({ block: 'nearest' })
  }, [])

  const visited = isVisited(a)

  // D-26: the toggle is its own undo (no toast); the change is announced once.
  function toggleVisited() {
    // Offline (D-34): the control stays focusable and explained by the banner, but does nothing.
    if (!canEdit) return
    const next = !visited
    onUpdate(a.id, { extra_data: { visited: next } })
    announce(`${a.name} marked ${next ? 'visited' : 'not visited'}.`)
  }

  const maybe = a.day_number === null
  const nameId = `${ticketId(a.id)}-name`
  const coords = osmCoordsFrom(a.extra_data)
  // "Find on map" only for a place without a pin (UI-SPEC §7 item 7).
  const offMap = coords === null && geo !== undefined
  const canFind = canEdit && !geo?.finding
  const fixedTime = a.extra_data?.fixed_time === true && a.time ? clock(a.time) : null
  const note = text(a.description)
  const duration = text(a.duration)
  const tips = text(a.tips)

  const fields = [
    { label: 'Day', value: maybe ? 'Maybe' : String(a.day_number) },
    { label: 'Stop', value: stop === null ? '—' : two(stop) },
    { label: 'From prev', value: typeof walk === 'number' ? `~${walk} min` : '—' },
    { label: 'Area', value: text(a.location) ?? '—' },
  ]

  return (
    <div
      ref={ref}
      id={ticketId(a.id)}
      role="region"
      aria-labelledby={nameId}
      className="mx-4 mb-3 rounded-2xl border border-board-line bg-surface p-4 text-ink motion-safe:animate-[ticket-in_250ms_var(--ease-out)]"
    >
      <p className={LABEL}>{maybe || stop === null ? 'Maybe' : `Day ${a.day_number} · Stop ${stop}`}</p>
      <h3 id={nameId} className="mt-1 font-label text-[22px] leading-[1.2] font-semibold break-words uppercase">
        {a.name}
      </h3>

      <dl className="mt-3 grid grid-cols-[auto_auto_auto_minmax(0,1fr)] border-y-[1.5px] border-dashed border-perf">
        {fields.map((f, i) => (
          <div
            key={f.label}
            className={`flex min-h-11 min-w-0 flex-col justify-center py-1.5 ${
              i > 0 ? 'border-l-[1.5px] border-dashed border-perf pl-3' : ''
            } ${i < fields.length - 1 ? 'pr-3' : ''}`}
          >
            <dt className={LABEL}>{f.label}</dt>
            <dd className={`${VALUE} ${f.label === 'Area' ? 'break-words' : 'whitespace-nowrap'}`}>{f.value}</dd>
          </div>
        ))}
      </dl>

      {(fixedTime || duration) && (
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {fixedTime && (
            <div>
              <dt className={LABEL}>Time</dt>
              <dd className={VALUE}>
                <time>{fixedTime}</time>
              </dd>
            </div>
          )}
          {duration && (
            <div className="min-w-0">
              <dt className={LABEL}>Duration</dt>
              <dd className="text-base break-words">{duration}</dd>
            </div>
          )}
        </dl>
      )}

      {note && <p className="mt-3 max-w-[65ch] text-base break-words whitespace-pre-line">{note}</p>}

      {tips && (
        <div className="mt-3">
          <p className={LABEL}>Tips</p>
          <p className="max-w-[65ch] text-base break-words whitespace-pre-line">{tips}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          aria-disabled={!canEdit || undefined}
          onClick={toggleVisited}
          className={canEdit ? QUIET_BUTTON : QUIET_BUTTON_DISABLED}
        >
          {visited ? 'Mark not visited' : 'Mark visited'}
        </button>
        <a
          href={googleMapsUrl({ name: a.name, location: a.location, lat: coords?.lat, lng: coords?.lng })}
          target="_blank"
          rel="noopener noreferrer"
          className={QUIET_BUTTON}
        >
          Open in Google Maps
        </a>
        {offMap && (
          <button
            type="button"
            aria-disabled={!canFind || undefined}
            onClick={() => {
              if (canFind) geo.find()
            }}
            className={canFind ? QUIET_BUTTON : QUIET_BUTTON_DISABLED}
          >
            Find on map
          </button>
        )}
        <RowMenu placeName={a.name} day={a.day_number} {...actions} className="ml-auto bg-surface-2" />
      </div>

      {offMap && (
        <p aria-live="polite" className="mt-2 max-w-[65ch] text-base text-muted empty:hidden">
          {geo.stillOff && !geo.finding ? STILL_OFF : ''}
        </p>
      )}
    </div>
  )
}
