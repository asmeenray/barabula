'use client'

import { useLayoutEffect } from 'react'
import { osmCoordsFrom } from '@/lib/geo-cache'
import { googleMapsUrl } from '@/lib/plan/maps-link'
import type { PlanActivity } from '@/lib/plan/types'
import type { WalkCell } from '@/lib/plan/walk'

// A place's ticket, opened inline under its board row (UI-SPEC §7 item 7).
// Renders only from data already on the page: no fetch on open (≤ 300 ms).
// Labels stay sentence case in the DOM; CSS sets the casing.

/** Marked when a row is activated and when its ticket has mounted (budget checked in 16-24). */
export const TICKET_CLICK_MARK = 'barabula:ticket-click'
export const TICKET_VISIBLE_MARK = 'barabula:ticket-visible'

export const QUIET_BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-surface-2 px-3 font-label text-base leading-none font-semibold tracking-[0.08em] text-ink uppercase transition-[background-color,transform] duration-150 ease-out hover:bg-line active:scale-[0.97]'

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
}

export function PlaceTicket({ activity: a, stop, walk }: PlaceTicketProps) {
  useLayoutEffect(() => {
    performance.mark(TICKET_VISIBLE_MARK)
  }, [])

  const maybe = a.day_number === null
  const nameId = `${ticketId(a.id)}-name`
  const coords = osmCoordsFrom(a.extra_data)
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
        <a
          href={googleMapsUrl({ name: a.name, location: a.location, lat: coords?.lat, lng: coords?.lng })}
          target="_blank"
          rel="noopener noreferrer"
          className={QUIET_BUTTON}
        >
          Open in Google Maps
        </a>
      </div>
    </div>
  )
}
