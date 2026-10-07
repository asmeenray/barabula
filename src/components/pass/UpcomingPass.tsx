'use client'

// Upcoming passes on the Trips home (UI-SPEC §2 item 4, §5). Each pass: a 144
// cover with the city and "UPCOMING", then one row of four fields (Label + Mono
// 16): WHEN ("12–15 MAY" / "4 DAYS" / "OPEN"), DAYS, PLACES, STATUS. The whole
// pass is one link to the plan. The list shows the first 3, soonest first, then
// "All upcoming ({n})" expands the rest in place (Base UI Collapsible). No
// carousel, no auto-rotation, no motion. Values come pre-computed from
// getHomeData. Client only so a failed photo can hide its credit.

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Collapsible } from '@base-ui/react/collapsible'
import type { HomeTrip } from '@/lib/home/data'
import { PassCover, PhotoCredit } from './PassCover'

const SHOWN = 3

/** STATUS chip: words in sentence case, uppercase from CSS (like StatusChip). */
function statusOf(trip: HomeTrip): string {
  return trip.dates ? 'Upcoming' : 'Open'
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function UpcomingPass({ trip }: { trip: HomeTrip }) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const when = trip.when ?? 'Open'
  const name = `${trip.title}, ${when}, ${plural(trip.placeCount, 'place', 'places')}`

  return (
    <Link
      href={`/itinerary/${trip.id}`}
      aria-label={name}
      title={trip.title}
      data-pass="upcoming"
      className="block overflow-hidden rounded-2xl bg-surface text-ink shadow-[0_24px_48px_-28px_rgba(0,0,0,.55)] transition-transform duration-[160ms] ease-[var(--ease-out)] active:scale-[0.985] dark:border dark:border-line dark:shadow-none"
    >
      <PassCover
        variant="upcoming"
        photo={trip.photo}
        cityName={trip.city}
        title={trip.title}
        stateLabel="Upcoming"
        code={trip.code}
        titleAs="h3"
        titleAttrs={{ title: trip.title }}
        oneLine
        onFallback={() => setPhotoFailed(true)}
      />

      <dl className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] border-t-[1.5px] border-dashed border-perf">
        <Field label="When" value={when} />
        <Field label="Days" value={String(trip.dayCount)} />
        <Field label="Places" value={String(trip.placeCount)} />
        <div className="flex min-w-0 flex-col justify-start gap-1 border-l-[1.5px] border-dashed border-perf py-2.5 pr-4 pl-3 xl:pr-3 xl:pl-2">
          <dt className="font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-muted uppercase">Status</dt>
          <dd>
            <span className="inline-flex h-6 items-center rounded-[4px] border border-field px-1.5 font-label text-xs leading-none font-semibold tracking-[0.16em] whitespace-nowrap text-muted uppercase xl:px-1 xl:tracking-[0.08em]">
              {statusOf(trip)}
            </span>
          </dd>
        </div>
      </dl>

      {trip.photo && !photoFailed && <PhotoCredit photo={trip.photo} className="px-4 pb-3 text-muted" />}
    </Link>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div data-field={label.toLowerCase()} className="flex min-w-0 flex-col justify-start gap-1 px-3 py-2.5 xl:px-2 not-first:border-l-[1.5px] not-first:border-dashed not-first:border-perf first:pl-4 xl:first:pl-3">
      <dt className="font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-muted uppercase">{label}</dt>
      <dd className="flex h-6 min-w-0 items-center">
        <span className="truncate font-mono text-base leading-tight font-semibold uppercase tabular-nums" title={value}>
          {value}
        </span>
      </dd>
    </div>
  )
}

/** The Upcoming section: heading + count, the first 3 passes, then "All upcoming ({n})". */
export function UpcomingList({ trips }: { trips: HomeTrip[] }) {
  const [open, setOpen] = useState(false)
  const firstHidden = useRef<HTMLDivElement>(null)
  if (trips.length === 0) return null
  const first = trips.slice(0, SHOWN)
  const rest = trips.slice(SHOWN)

  function onOpenChange(next: boolean) {
    setOpen(next)
    // The button goes away once open; focus moves to the first revealed pass.
    if (next) requestAnimationFrame(() => firstHidden.current?.querySelector('a')?.focus())
  }

  return (
    <section aria-labelledby="home-upcoming">
      <h2
        id="home-upcoming"
        className="flex items-baseline gap-2 font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-muted uppercase"
      >
        Upcoming <span className="font-mono tracking-normal tabular-nums">{trips.length}</span>
      </h2>
      <Collapsible.Root open={open} onOpenChange={onOpenChange} className="mt-3">
        <div className="grid gap-4 md:grid-cols-2 lg:gap-6 xl:grid-cols-3">
          {first.map((t) => (
            <UpcomingPass key={t.id} trip={t} />
          ))}
          {rest.length > 0 && (
            // display: contents, so the revealed passes join the same grid.
            <Collapsible.Panel className="contents">
              {rest.map((t, i) => (
                <div key={t.id} ref={i === 0 ? firstHidden : undefined}>
                  <UpcomingPass trip={t} />
                </div>
              ))}
            </Collapsible.Panel>
          )}
        </div>
        {rest.length > 0 && !open && (
          <Collapsible.Trigger className="mt-2 -ml-1 min-h-11 px-1 font-semibold text-ink underline underline-offset-[3px] transition-transform duration-[160ms] active:scale-[0.97]">
            All upcoming ({trips.length})
          </Collapsible.Trigger>
        )}
      </Collapsible.Root>
    </section>
  )
}
