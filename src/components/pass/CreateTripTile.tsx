'use client'

// "Create a new trip" on the Trips home (UI-SPEC §2 item 6, D-08): shown only
// once the user has at least one trip. One tile, "Fill the pass", that scrolls
// back to the blank pass and focuses "Where to?" (or the pass's first control
// when a later question is open). Paste-a-link and Google Maps import tiles are
// not rendered until they work (D-08).

import { TicketIcon } from '@/components/icons'

export const BLANK_PASS_ID = 'next-trip-pass'
const WHERE_TO_ID = 'pass-where-to'

function fillThePass() {
  const pass = document.getElementById(BLANK_PASS_ID)
  if (!pass) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  pass.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  const target =
    document.getElementById(WHERE_TO_ID) ??
    pass.querySelector<HTMLElement>('input, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')
  target?.focus({ preventScroll: true })
}

export function CreateTripTile({ tripCount }: { tripCount: number | null }) {
  if (!tripCount || tripCount < 1) return null
  return (
    <section aria-labelledby="home-create">
      <h2
        id="home-create"
        className="font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-muted uppercase"
      >
        Create a new trip
      </h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <button
          type="button"
          onClick={fillThePass}
          className="flex min-h-18 items-center gap-3 rounded-xl border-[1.5px] border-dashed border-field bg-surface px-4 py-3 text-left text-ink transition-[background-color,transform] duration-[120ms] hover:bg-surface-2 active:scale-[0.97]"
        >
          <TicketIcon className="shrink-0" />
          <span className="flex min-w-0 flex-col">
            <span className="font-label text-base leading-tight font-semibold tracking-[0.08em] uppercase">Fill the pass</span>
            <span className="text-base text-muted">A city, or one sentence about the trip</span>
          </span>
        </button>
      </div>
    </section>
  )
}
