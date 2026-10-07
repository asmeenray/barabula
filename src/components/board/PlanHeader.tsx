'use client'

// Plan header (UI-SPEC §7 items 1–2): a 96 px PassCover strip (the curated
// photo, or the styled city-map cover) with the city in white inside the scrim,
// then the ticket row WHEN · WHO · INTO and, under it, the photo credit when a
// photo shows (the strip has no pass body). The photo is chosen on the server
// page with tripCover(trip) (city photo, else country photo) and passed down, so
// the manifests stay out of client JS. Only city photos carry an IATA code. On the plan the photo download waits for the map (PlanClient
// passes holdPhoto) so it never slows the map on a slow phone. Values are
// sentence case; CSS sets the casing.
// Editing (16-17, D-20): the city strip and each ticket cell carry a button
// ("Edit destination", "Edit dates", "Edit travellers", "Edit interests") that
// opens that line's question with Save / Cancel: a sheet on phone, inline under
// the ticket row on laptop. The editor loads on first use (hover/focus warm it).
// The dt/dd stay outside the buttons, so the values read as before.
// Moment 4 (16-22, D-30): the strip is the trip-cover-{id} ViewTransition the
// tapped pass morphs into.

import { lazy, Suspense, useRef, useState } from 'react'
import { tripInto, tripWhen, tripWho } from '@/lib/pass/trip-values'
import { tripAnswers, type TripLine } from '@/lib/plan/trip-patch'
import type { PlanTrip } from '@/lib/plan/types'
import type { PassAnswers, PassCity } from '@/lib/pass/types'
import type { CoverPhoto } from '@/lib/photos/manifest'
import { useCanEdit } from '@/lib/client/use-online'
import { PassCover, PhotoCredit } from '@/components/pass/PassCover'

const loadEditor = () => import('./TripDetailsSheet')
const TripDetailsSheet = lazy(loadEditor)

function preloadEditor() {
  void loadEditor().catch(() => {})
}

/** Accessible names of the edit buttons (UI-SPEC Accessibility, D-20). */
export const EDIT_NAMES: Record<TripLine, string> = {
  to: 'Edit destination',
  when: 'Edit dates',
  who: 'Edit travellers',
  into: 'Edit interests',
}

/** A whole-cell button laid over a header area; focus ring inset, wash on hover. */
const OVERLAY =
  'absolute inset-0 z-[1] cursor-pointer outline-none transition-colors duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--board-ink)_6%,transparent)] focus-visible:shadow-[inset_0_0_0_2px_var(--board-ink)] aria-disabled:cursor-not-allowed aria-disabled:hover:bg-transparent'

// Element Timing attribute (not in React's DOM types, passed through as-is).
// The budgets spec reads when the board first paints from it (Q46).
const BOARD_TIMING = { elementtiming: 'board' } as Record<string, string>

/** "12–15 May", "28 May – 2 Jun", "{n} days" (pass length) or "Open". */
export function whenValue(trip: PlanTrip): string {
  return tripWhen(trip) ?? 'Open'
}

/** "2 adults · 1 kid", or "—" when the pass has no travellers. */
export function whoValue(trip: PlanTrip): string {
  return tripWho(trip) ?? '—'
}

/** "Food · Views", "+ note" when a note exists, or "—". */
export function intoValue(trip: PlanTrip): string {
  return tripInto(trip) ?? '—'
}

export function PlanHeader({
  trip,
  photo,
  holdPhoto = false,
  cities = [],
  isLaptop = false,
  onEdit,
}: {
  trip: PlanTrip
  photo: CoverPhoto | null
  holdPhoto?: boolean
  /** Curated cities for the Where to? list (passed from the server page). */
  cities?: readonly PassCity[]
  /** Laptop edits inline under the ticket row; phone uses a sheet. */
  isLaptop?: boolean
  /** Saves a line's answers (usePlan.updateTrip via PlanClient); no edit buttons without it. */
  onEdit?: (patch: Partial<PassAnswers>) => void
}) {
  const city = trip.destination || trip.title
  // A failed photo becomes the map cover; its credit goes with it.
  const [photoFailed, setPhotoFailed] = useState(false)
  const canEdit = useCanEdit()
  const [editing, setEditing] = useState<TripLine | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const cells: { line: TripLine; label: string; value: string }[] = [
    { line: 'when', label: 'When', value: whenValue(trip) },
    { line: 'who', label: 'Who', value: whoValue(trip) },
    { line: 'into', label: 'Into', value: intoValue(trip) },
  ]

  function editButton(line: TripLine) {
    if (!onEdit) return null
    return (
      <button
        type="button"
        aria-label={EDIT_NAMES[line]}
        aria-expanded={editing === line}
        aria-disabled={!canEdit || undefined}
        onPointerEnter={preloadEditor}
        onFocus={preloadEditor}
        onClick={(e) => {
          // Offline (D-34): stays focusable, explained by the banner, does nothing.
          if (!canEdit) return
          openerRef.current = e.currentTarget
          setEditing((open) => (open === line && isLaptop ? null : line))
        }}
        className={OVERLAY}
      />
    )
  }

  function close() {
    setEditing(null)
    // The inline panel unmounts; the sheet returns focus itself (finalFocus).
    if (isLaptop) requestAnimationFrame(() => openerRef.current?.focus())
  }

  const editor =
    editing && onEdit ? (
      <Suspense fallback={null}>
        <TripDetailsSheet
          key={editing}
          line={editing}
          answers={tripAnswers(trip)}
          cities={cities}
          variant={isLaptop ? 'inline' : 'sheet'}
          onSave={onEdit}
          onClose={close}
          returnFocus={openerRef}
        />
      </Suspense>
    ) : null

  return (
    <header>
      <div className="relative">
        <PassCover
          variant="header"
          photo={photo}
          cityName={city}
          title={city}
          code={photo?.iata}
          titleAs="h1"
          titleAttrs={BOARD_TIMING}
          holdPhoto={holdPhoto}
          transitionId={trip.id}
          onFallback={() => setPhotoFailed(true)}
        />
        {editButton('to')}
      </div>

      <dl className="grid grid-cols-3 border-b border-board-line">
        {cells.map((c, i) => (
          <div
            key={c.label}
            className={`relative flex min-h-11 min-w-0 flex-col justify-center px-4 py-1.5 ${
              i > 0 ? 'border-l-[1.5px] border-dashed border-perf' : ''
            }`}
          >
            <dt className="font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-board-muted uppercase">
              {c.label}
            </dt>
            <dd className="truncate font-mono text-base leading-tight font-semibold uppercase tabular-nums" title={c.value}>
              {c.value}
              {/* Inside the dd (a dl may only hold dt/dd); positioned against the cell. */}
              {editButton(c.line)}
            </dd>
          </div>
        ))}
      </dl>

      {photo && !photoFailed && (
        <PhotoCredit photo={photo} className="border-b border-board-line px-4 py-2 text-board-muted" />
      )}

      {/* Laptop: inline under the ticket row (after the photo's own credit line). */}
      {editor}
    </header>
  )
}
