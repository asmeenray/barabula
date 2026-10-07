'use client'

// The small place card on the Places tab (D-28, UI-SPEC §10): name, type and
// area, trip and day, a Visited switch, Open in Google Maps and Open trip. No
// other editing. Phone: it replaces the list in the sheet (back arrow returns);
// laptop: it opens inline under its row. Rendered from data already on the
// page, no fetch on open (≤ 300 ms, checked in 16-24).

import { useId, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import { Switch } from '@base-ui/react/switch'
import { useCanEdit } from '@/lib/client/use-online'
import { googleMapsUrl } from '@/lib/plan/maps-link'
import type { PlacePoint } from '@/lib/places-tab/filter'
import { ArrowLeftIcon } from '@/components/icons'
import { BoardStatusLine } from '@/components/board/BoardStatusLine'

/** Marked when a row or pin is activated and when its card has mounted. */
export const CARD_CLICK_MARK = 'barabula:card-click'
export const CARD_VISIBLE_MARK = 'barabula:card-visible'

// Same quiet button as the plan's ticket (PlaceTicket), kept here so the board code stays off this route.
const QUIET_BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-surface-2 px-3 font-label text-base leading-none font-semibold tracking-[0.08em] text-ink uppercase transition-[background-color,transform] duration-150 ease-out hover:bg-line active:scale-[0.97]'
const PRIMARY =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-ink px-4 font-label text-base leading-none font-semibold tracking-[0.08em] text-bg uppercase transition-[background-color,transform] duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--ink)_88%,#000)] active:scale-[0.97]'

const TYPE_LABEL = { places: 'Place', stays: 'Stay' } as const

export function cardMeta(p: Pick<PlacePoint, 'type' | 'location'>): string {
  return p.location ? `${TYPE_LABEL[p.type]} · ${p.location}` : TYPE_LABEL[p.type]
}

export function cardTripLine(p: Pick<PlacePoint, 'tripTitle' | 'day'>): string {
  return `${p.tripTitle} · ${p.day === null ? 'Maybe' : `Day ${p.day}`}`
}

interface PlaceCardProps {
  place: PlacePoint
  color: string
  /** The last Visited change didn't save (the switch has reverted). */
  saveFailed: boolean
  onVisited: (next: boolean) => void
  onRetry: () => void
  /** Phone: the back arrow to the list. Laptop cards close from their row. */
  onBack?: () => void
  id?: string
}

export function PlaceCard({ place: p, color, saveFailed, onVisited, onRetry, onBack, id }: PlaceCardProps) {
  const canEdit = useCanEdit()
  const nameId = useId()
  const switchId = useId()
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    performance.mark(CARD_VISIBLE_MARK)
    ref.current?.scrollIntoView({ block: 'nearest' })
  }, [])

  return (
    <div
      ref={ref}
      id={id}
      role="region"
      aria-labelledby={nameId}
      className="rounded-2xl border border-board-line bg-surface p-4 text-ink motion-safe:animate-[ticket-in_250ms_var(--ease-out)]"
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to places"
          className="-mt-2 -ml-2 mb-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg pr-3 pl-2 font-label text-base font-semibold tracking-[0.08em] text-ink uppercase"
        >
          <ArrowLeftIcon />
          Places
        </button>
      )}
      <h3 id={nameId} className="font-label text-[22px] leading-[1.2] font-semibold break-words uppercase">
        {p.name}
      </h3>
      <p className="mt-1 font-mono text-xs leading-[1.33] break-words text-board-muted">{cardMeta(p)}</p>
      <p className="mt-2 flex items-center gap-2 text-base">
        <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        {cardTripLine(p)}
      </p>

      <label
        htmlFor={switchId}
        className="mt-3 flex min-h-11 items-center justify-between gap-4 border-y-[1.5px] border-dashed border-perf"
      >
        <span className="text-base">Visited</span>
        <Switch.Root
          id={switchId}
          checked={p.visited}
          // Offline (D-34): still focusable and explained by the banner, but inert.
          readOnly={!canEdit}
          aria-disabled={!canEdit || undefined}
          onCheckedChange={(checked) => {
            if (canEdit) onVisited(checked)
          }}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-[1.5px] border-field bg-surface-2 p-0.5 transition-colors duration-150 ease-out data-checked:border-ink data-checked:bg-ink ${
            canEdit ? '' : 'cursor-not-allowed opacity-40'
          }`}
        >
          <Switch.Thumb className="size-5 rounded-full bg-ink transition-[translate,background-color] duration-150 ease-out data-checked:translate-x-5 data-checked:bg-bg motion-reduce:transition-none" />
        </Switch.Root>
      </label>

      {saveFailed && <BoardStatusLine className="mt-3" message="Couldn't save." onRetry={onRetry} retryDisabled={!canEdit} />}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={googleMapsUrl({ name: p.name, location: p.location, lat: p.coords?.lat, lng: p.coords?.lng })}
          target="_blank"
          rel="noopener noreferrer"
          className={QUIET_BUTTON}
        >
          Open in Google Maps
        </a>
        <Link href={`/itinerary/${p.tripId}`} className={`${PRIMARY} ml-auto`}>
          Open trip
        </Link>
      </div>
    </div>
  )
}
