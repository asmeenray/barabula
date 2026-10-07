'use client'

// Passenger card on the You tab (D-29, UI-SPEC §11): a pass with the Google
// avatar (initials on --surface-2 when there is none or it fails to load),
// PASSENGER + name, and two stamp fields under the perforation: TRIPS and
// HOME. Values arrive from the server page; nothing is fetched here.

import { Avatar } from '@base-ui/react/avatar'
import { initialsOf } from '@/lib/you/home-city'

const LABEL = 'font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-muted uppercase'

export interface PassengerCardProps {
  name: string
  /** https only (T-16-56); anything else shows initials. */
  avatarUrl: string | null
  /** null when the count couldn't be read. */
  trips: number | null
  homeCity: string | null
}

export function PassengerCard({ name, avatarUrl, trips, homeCity }: PassengerCardProps) {
  return (
    <section
      aria-label="Passenger"
      className="relative overflow-hidden rounded-2xl bg-surface text-ink shadow-[0_24px_48px_-28px_rgba(0,0,0,.55)] dark:border dark:border-line dark:shadow-none"
    >
      <div className="flex items-center gap-4 p-4">
        <Avatar.Root className="inline-flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 align-middle select-none">
          {avatarUrl && (
            <Avatar.Image
              src={avatarUrl}
              alt=""
              width={56}
              height={56}
              referrerPolicy="no-referrer"
              className="size-full object-cover"
            />
          )}
          <Avatar.Fallback
            aria-hidden
            className="flex size-full items-center justify-center font-mono text-base font-semibold text-ink"
          >
            {initialsOf(name)}
          </Avatar.Fallback>
        </Avatar.Root>
        <div className="min-w-0 flex-1">
          <p className={LABEL}>Passenger</p>
          <h1
            title={name}
            className="mt-0.5 truncate font-label text-[22px] leading-[1.2] font-semibold uppercase"
          >
            {name}
          </h1>
        </div>
      </div>

      {/* Perforation with two notches in the page colour, as on every pass. */}
      <div aria-hidden="true" className="relative h-0">
        <span className="absolute top-0 -left-3 size-6 -translate-y-1/2 rounded-full bg-bg" />
        <span className="absolute inset-x-4 top-0 border-t-[1.5px] border-dashed border-perf" />
        <span className="absolute top-0 -right-3 size-6 -translate-y-1/2 rounded-full bg-bg" />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-8 p-4">
        <div className="min-w-0">
          <dt className={LABEL}>Trips</dt>
          <dd data-testid="passenger-trips" className="mt-1 font-mono text-base font-semibold tabular-nums">
            {trips ?? '—'}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={LABEL}>Home</dt>
          <dd
            data-testid="passenger-home"
            title={homeCity ?? undefined}
            className="mt-1 truncate font-mono text-base font-semibold uppercase"
          >
            {homeCity ?? '—'}
          </dd>
        </div>
      </dl>
    </section>
  )
}
