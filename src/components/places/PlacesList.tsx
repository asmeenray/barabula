'use client'

// The Places list (UI-SPEC §10): "{n} places" heading, then the places grouped
// by trip (trip colour dot + title), each place one board line: name on one
// line with an ellipsis, then its area (or NOT ON MAP) and the day. It is the
// accessible equivalent of the map. Laptop opens the card inline under its row;
// phone swaps the list for the card (PlacesSheet).

import { useId } from 'react'
import type { PlacePoint, TripGroup } from '@/lib/places-tab/filter'
import { CARD_CLICK_MARK } from './PlaceCard'

export function placesHeading(n: number): string {
  return n === 1 ? '1 place' : `${n} places`
}

export function cardDomId(id: string): string {
  return `place-card-${id}`
}

const LABEL = 'font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] uppercase'
const TEXT_BUTTON = 'inline-flex min-h-11 items-center px-1 text-base font-semibold text-ink underline underline-offset-[3px]'

interface PlacesListProps {
  groups: TripGroup[]
  count: number
  colors: ReadonlyMap<string, string>
  onOpen: (id: string) => void
  /** Laptop: rows expand; the open row's card shows inline under it. */
  inline?: boolean
  openId?: string | null
  card?: React.ReactNode
  onClearFilters: () => void
  /** The heading's id, so a sheet can be named by it. */
  headingId?: string
  /** Extra classes for the heading row (the phone sheet makes it the drag strip). */
  headingClassName?: string
}

function Row({
  place: p,
  inline,
  open,
  onOpen,
  card,
}: {
  place: PlacePoint
  inline: boolean
  open: boolean
  onOpen: (id: string) => void
  card: React.ReactNode
}) {
  return (
    <li className="border-b border-board-line last:border-b-0">
      <button
        type="button"
        aria-expanded={inline ? open : undefined}
        aria-controls={inline && open ? cardDomId(p.id) : undefined}
        onClick={() => {
          if (!open) performance.mark(CARD_CLICK_MARK)
          onOpen(p.id)
        }}
        className={`grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-2.5 text-left transition-colors duration-150 ease-out ${
          open ? 'bg-row-selected' : 'hover:bg-surface-2'
        }`}
      >
        <span className={`min-w-0 ${p.visited ? 'text-board-muted' : ''}`}>
          <span
            className={`block truncate font-label text-base leading-tight font-semibold tracking-[0.06em] uppercase ${
              p.visited ? 'line-through decoration-[1.5px]' : ''
            }`}
          >
            {p.name}
          </span>
          {p.coords === null ? (
            <span className="mt-1 inline-flex h-5 items-center rounded-[4px] border border-board-muted px-1.5 font-label text-xs leading-none font-semibold tracking-[0.16em] whitespace-nowrap text-board-muted uppercase">
              Not on map
            </span>
          ) : (
            p.location && <span className="mt-0.5 block truncate font-mono text-xs text-board-muted">{p.location}</span>
          )}
        </span>
        <span className="pt-0.5 font-mono text-xs leading-tight font-semibold whitespace-nowrap text-board-muted uppercase tabular-nums">
          {p.day === null ? 'Maybe' : `Day ${p.day}`}
        </span>
      </button>
      {inline && open && <div className="px-4 pb-3">{card}</div>}
    </li>
  )
}

export function PlacesList({
  groups,
  count,
  colors,
  onOpen,
  inline = false,
  openId = null,
  card = null,
  onClearFilters,
  headingId,
  headingClassName = '',
}: PlacesListProps) {
  const baseId = useId()
  return (
    <div className="text-board-ink">
      <h2
        id={headingId}
        className={`font-mono text-base leading-tight font-semibold tabular-nums uppercase ${headingClassName}`}
      >
        {placesHeading(count)}
      </h2>

      {count === 0 ? (
        <div className="flex flex-col items-start gap-2 px-4 py-6">
          <p className="text-base text-ink">No places match these filters.</p>
          <button type="button" onClick={onClearFilters} className={TEXT_BUTTON}>
            Clear filters
          </button>
        </div>
      ) : (
        groups.map(({ trip, places }, i) => {
          const gid = `${baseId}-g${i}`
          return (
            <section key={trip.id} aria-labelledby={gid}>
              <h3
                id={gid}
                className={`${LABEL} sticky top-0 z-[1] flex min-h-11 items-center gap-2 border-y border-board-line bg-board px-4 text-board-muted`}
              >
                {/* The dot repeats the trip's map colour; its ring keeps it visible on any surface. */}
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full ring-2 ring-ink"
                  style={{ backgroundColor: colors.get(trip.id) }}
                />
                <span className="min-w-0 truncate text-board-ink">{trip.title}</span>
              </h3>
              <ul>
                {places.map((p) => (
                  <Row
                    key={p.id}
                    place={p}
                    inline={inline}
                    open={openId === p.id}
                    onOpen={onOpen}
                    card={openId === p.id ? card : null}
                  />
                ))}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}
