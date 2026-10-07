'use client'

// Now/Next pass on the Trips home (UI-SPEC §5, D-07): the current trip ("NOW")
// or the next one ("NEXT TRIP"). Cover 200 on phone, 280 on laptop, with the
// airline status line in Mono 16 on the cover ("Day 2 of 3", "Gate closes
// tomorrow", "Dates not set"); the body prints the answered stamp lines
// read-only and, during the trip, "Next: {Place}". The whole pass is one link
// to the plan. All values arrive pre-computed from getHomeData (no dates are
// read during render). Client only so a failed photo can hide its credit.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { HomeTrip } from '@/lib/home/data'
import { LinkLoadingRow } from '@/components/motion/LoadingRow'
import { PassCover, PhotoCredit } from './PassCover'
import { StampLine } from './StampLine'

type Props = {
  trip: HomeTrip
  state: 'now' | 'next'
  /** Only when this pass is the first thing on the page. */
  priority?: boolean
}

const STATE_LABEL = { now: 'Now', next: 'Next trip' } as const

/** sessionStorage: the Now/Next title has split-flapped on this visit. */
export const NOWNEXT_FLAP_KEY = 'barabula-nownext-flap'

/** True the first time it is called in a browser session (storage blocked: never). */
function firstFlapThisVisit(): boolean {
  try {
    if (window.sessionStorage.getItem(NOWNEXT_FLAP_KEY)) return false
    window.sessionStorage.setItem(NOWNEXT_FLAP_KEY, '1')
    return true
  } catch {
    return false
  }
}

/** LOADING… over a tapped pass's body while its plan opens (D-32; the plan route has no loading.tsx). */
export const PASS_LOADING =
  'absolute inset-0 z-[1] flex items-center bg-surface px-4 font-mono text-base font-semibold text-board-muted uppercase lg:px-6'

export function NowNextPass({ trip, state, priority = false }: Props) {
  const [photoFailed, setPhotoFailed] = useState(false)
  // The title split-flaps once per visit only (UI-SPEC "Split-flap rules"),
  // after hydration: the server has no session storage. The flag is written
  // in the frame callback, so a Strict Mode re-run still flips once.
  const [flap, setFlap] = useState(false)
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(NOWNEXT_FLAP_KEY)) return
    } catch {
      return
    }
    const frame = requestAnimationFrame(() => {
      if (firstFlapThisVisit()) setFlap(true)
    })
    return () => cancelAnimationFrame(frame)
  }, [])
  const lines = [
    { label: 'To', value: trip.title },
    trip.when && { label: 'When', value: trip.when },
    trip.who && { label: 'Who', value: trip.who },
    trip.into && { label: 'Into', value: trip.into },
  ].filter((l): l is { label: string; value: string } => !!l)
  const name = [trip.title, STATE_LABEL[state], trip.status, trip.nextPlace && `Next: ${trip.nextPlace}`]
    .filter(Boolean)
    .join(', ')

  return (
    <Link
      href={`/itinerary/${trip.id}`}
      aria-label={name}
      title={trip.title}
      data-pass={state}
      className="group block overflow-hidden rounded-2xl bg-surface text-ink shadow-[0_24px_48px_-28px_rgba(0,0,0,.55)] transition-transform duration-[160ms] ease-[var(--ease-out)] active:scale-[0.985] dark:border dark:border-line dark:shadow-none"
    >
      <PassCover
        variant="nownext"
        photo={trip.photo}
        cityName={trip.city}
        title={trip.title}
        stateLabel={STATE_LABEL[state]}
        code={trip.code}
        statusLine={trip.status ?? undefined}
        priority={priority}
        titleAs="h2"
        flapTitle={flap}
        onFallback={() => setPhotoFailed(true)}
        className="lg:h-70"
      />

      <Perforation />

      <div className="relative flex min-w-0 flex-col gap-3 px-4 pt-2 pb-4 lg:px-6 lg:pt-4 lg:pb-6">
        <LinkLoadingRow className={PASS_LOADING} />
        <div>
          {lines.map((l) => (
            <StampLine key={l.label} label={l.label} value={l.value} editName="" />
          ))}
        </div>
        {trip.nextPlace && (
          <p className="flex min-w-0 items-baseline gap-2">
            <span className="font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-muted uppercase">
              Next:
            </span>
            <span className="min-w-0 truncate font-label text-base leading-tight font-semibold tracking-[0.06em] uppercase" title={trip.nextPlace}>
              {trip.nextPlace}
            </span>
          </p>
        )}
        {trip.photo && !photoFailed && <PhotoCredit photo={trip.photo} />}
      </div>
    </Link>
  )
}

/** Dashed perforation with two notches in the page colour (UI-SPEC §3). */
export function Perforation() {
  return (
    <div aria-hidden="true" className="relative h-0">
      <span className="absolute top-0 -left-3 h-6 w-6 -translate-y-1/2 rounded-full bg-bg" />
      <span className="absolute inset-x-4 top-0 border-t-[1.5px] border-dashed border-perf" />
      <span className="absolute top-0 -right-3 h-6 w-6 -translate-y-1/2 rounded-full bg-bg" />
    </div>
  )
}
