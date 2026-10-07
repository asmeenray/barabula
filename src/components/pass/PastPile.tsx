'use client'

// Past trips on the Trips home (UI-SPEC §2 item 5, Accessibility "Past pile",
// D-07). Collapsed: a still, Wallet-style pile of up to 3 stubs behind one
// button "Past trips · {n}" (aria-expanded); each lower stub sits 12 px further
// down and is scaled 0.96 / 0.92, with no motion, and every stub in the pile is
// aria-hidden decoration. Expanded: a real list of the latest 6 stub links
// (3 columns on laptop), then "Show all past trips". The list is inert and
// hidden while collapsed, so only visible items are ever focusable.

import { useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import type { HomeTrip } from '@/lib/home/data'
import { ChevronDownIcon } from '@/components/icons'
import { useVisibleTrips } from './HideWhenPending'

const PILE = 3
const LATEST = 6
const OFFSET = 12
const SCALE = [1, 0.96, 0.92]

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const STUB =
  'overflow-hidden rounded-2xl bg-surface shadow-[0_24px_48px_-28px_rgba(0,0,0,.55)] dark:border dark:border-line dark:shadow-none'

/** What a stub prints: city (Mono 22), dates (Mono 12) and, on the right, the places count (or the pile's label). */
function StubFace({ trip, trailing, hideMain = false }: { trip: HomeTrip; trailing?: ReactNode; hideMain?: boolean }) {
  return (
    <>
      <span aria-hidden={hideMain || undefined} className="flex min-w-0 flex-col justify-center gap-1">
        <span className="truncate font-mono text-[22px] leading-[1.2] font-semibold tracking-[-0.01em] uppercase" title={trip.title}>
          {trip.title}
        </span>
        {trip.dates && (
          <span className="truncate font-mono text-xs leading-[1.33] text-muted uppercase tabular-nums">{trip.dates}</span>
        )}
      </span>
      {trailing ?? (
        <span className="shrink-0 font-mono text-xs leading-[1.33] text-muted tabular-nums">
          {plural(trip.placeCount, 'place', 'places')}
        </span>
      )}
    </>
  )
}

/** One past trip: a 72 px stub, no photo, one link to the plan. */
export function PastStub({ trip }: { trip: HomeTrip }) {
  return (
    <Link
      href={`/itinerary/${trip.id}`}
      aria-label={[trip.title, trip.dates, plural(trip.placeCount, 'place', 'places')].filter(Boolean).join(', ')}
      title={trip.title}
      data-pass="past"
      className={`flex h-18 items-center justify-between gap-3 px-4 text-ink transition-[background-color,transform] duration-[120ms] hover:bg-surface-2 active:scale-[0.985] ${STUB}`}
    >
      <StubFace trip={trip} />
    </Link>
  )
}

export function PastPile({ trips: allPast }: { trips: HomeTrip[] }) {
  // A trip being deleted (10 s Undo, D-27) leaves the pile and its count.
  const trips = useVisibleTrips(allPast)
  const [open, setOpen] = useState(false)
  const [all, setAll] = useState(false)
  const firstMore = useRef<HTMLLIElement>(null)
  if (trips.length === 0) return null

  const pile = trips.slice(0, PILE)
  const shown = all ? trips : trips.slice(0, LATEST)
  const label = `Past trips · ${trips.length}`

  function showAll() {
    setAll(true)
    // The button goes away; focus moves to the first stub it revealed.
    requestAnimationFrame(() => firstMore.current?.querySelector('a')?.focus())
  }

  return (
    <section aria-labelledby="home-past">
      <h2
        id="home-past"
        className="font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-muted uppercase"
      >
        Past
      </h2>

      <button
        type="button"
        aria-expanded={open}
        aria-controls="home-past-list"
        onClick={() => setOpen((o) => !o)}
        className={
          open
            ? 'mt-2 -ml-1 inline-flex min-h-11 items-center gap-1 px-1 font-semibold text-ink underline underline-offset-[3px]'
            : 'group relative mt-3 block w-full text-left transition-transform duration-[160ms] ease-[var(--ease-out)] active:scale-[0.985] md:max-w-[calc(50%-8px)] xl:max-w-[calc((100%-48px)/3)]'
        }
        style={open ? undefined : { height: 72 + OFFSET * (pile.length - 1) }}
      >
        {open ? (
          <>
            {label}
            <ChevronDownIcon size={16} className="rotate-180" />
          </>
        ) : (
          <>
            {/* The pile, front stub last so it paints on top. The back stubs and the
                front stub's trip details are decoration; the button's name is its label. */}
            {pile
              .map((trip, i) => (
                <span
                  key={trip.id}
                  aria-hidden={i > 0 || undefined}
                  className={`absolute inset-x-0 flex h-18 items-center justify-between gap-3 px-4 text-ink transition-colors duration-[120ms] ${STUB} ${
                    i === 0 ? 'group-hover:bg-surface-2' : ''
                  }`}
                  style={{ top: OFFSET * i, transform: `scale(${SCALE[i]})`, transformOrigin: '50% 100%', zIndex: PILE - i }}
                >
                  {i === 0 && (
                    <StubFace
                      trip={trip}
                      hideMain
                      trailing={
                        <span className="inline-flex shrink-0 items-center gap-1 font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] whitespace-nowrap uppercase">
                          {label}
                          <ChevronDownIcon size={16} />
                        </span>
                      }
                    />
                  )}
                </span>
              ))
              .reverse()}
          </>
        )}
      </button>

      <div id="home-past-list" inert={!open} hidden={!open} className="mt-3">
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((trip, i) => (
            <li key={trip.id} ref={i === LATEST ? firstMore : undefined}>
              <PastStub trip={trip} />
            </li>
          ))}
        </ul>
        {trips.length > LATEST && !all && (
          <button
            type="button"
            onClick={showAll}
            className="mt-2 -ml-1 min-h-11 px-1 font-semibold text-ink underline underline-offset-[3px] transition-transform duration-[160ms] active:scale-[0.97]"
          >
            Show all past trips
          </button>
        )}
      </div>
    </section>
  )
}
