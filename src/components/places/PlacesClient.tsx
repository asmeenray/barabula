'use client'

// The Places tab (D-28, UI-SPEC §10): every place across the user's trips.
// Phone: the map fills the space between the top bar and the tab bar, with the
// search and filters floating at the top and a non-modal list sheet (148 px ·
// 50% · 92%). Laptop: a 400 px panel (search, filters, grouped list; the card
// opens inline at its row) beside the map. A pin or a row opens the small place
// card. The map is the extra view; the list is the accessible one.

import { useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Drawer } from '@base-ui/react/drawer'
import { useAnnounce } from '@/components/a11y/LiveRegion'
import { BoardStatusLine } from '@/components/board/BoardStatusLine'
import { useUndo } from '@/components/undo/UndoProvider'
import { LAPTOP_QUERY, useMediaQuery } from '@/lib/client/use-media'
import { useTripDeletes } from '@/lib/plan/delete-trip'
import { tripColor } from '@/lib/places-tab/colors'
import {
  availableTypes,
  filterPlaces,
  groupByTrip,
  NO_FILTERS,
  type PlaceFilters,
  type PlacePoint,
  type PlaceTrip,
} from '@/lib/places-tab/filter'
import { CARD_CLICK_MARK, PlaceCard } from './PlaceCard'
import { PlacesFilters } from './PlacesFilters'
import { cardDomId, PlacesList } from './PlacesList'
import { PlacesSheet, SNAP_HALF, SNAP_PEEK } from './PlacesSheet'

const PRIMARY =
  'inline-flex h-12 items-center justify-center rounded-lg bg-ink px-6 font-label text-base font-semibold tracking-[0.08em] text-bg uppercase transition-[background-color,transform] duration-150 ease-out hover:bg-[color-mix(in_oklab,var(--ink)_88%,#000)] active:scale-[0.97]'

/** "DELAYED · Couldn't load your places. Retry" (D-33); Retry reloads the page data. */
export function PlacesLoadError() {
  const router = useRouter()
  return (
    <div className="flex-1 bg-board p-4 lg:px-8">
      <BoardStatusLine message="Couldn't load your places." onRetry={() => router.refresh()} />
    </div>
  )
}

function NoPlaces() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-[400px] flex-col items-start gap-2 rounded-2xl bg-surface p-6 text-ink">
        <h2 className="font-label text-[22px] leading-[1.2] font-semibold uppercase">No places yet</h2>
        <p className="text-base text-muted">Places you add to a trip show up here.</p>
        <Link href="/" className={`${PRIMARY} mt-4`}>
          Go to trips
        </Link>
      </div>
    </div>
  )
}

const noSubscribe = () => () => {}

/** False on the server and during hydration, true after. */
function useIsClient(): boolean {
  return useSyncExternalStore(noSubscribe, () => true, () => false)
}

async function sendVisited(id: string, visited: boolean): Promise<boolean> {
  try {
    const res = await fetch(`/api/activities/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extra_data: { visited } }),
    })
    return res.ok
  } catch {
    return false
  }
}

interface PlacesClientProps {
  points: PlacePoint[]
  trips: PlaceTrip[]
}

export function PlacesClient({ points, trips }: PlacesClientProps) {
  const isLaptop = useMediaQuery(LAPTOP_QUERY)
  const isClient = useIsClient()
  const announce = useAnnounce()
  const areaRef = useRef<HTMLDivElement>(null)
  const headingId = useId()

  const [filters, setFilters] = useState<PlaceFilters>(NO_FILTERS)
  const [openId, setOpenId] = useState<string | null>(null)
  const [snap, setSnap] = useState<Drawer.Root.SnapPoint | null>(SNAP_PEEK)
  /** Visited changes made here, over the server's values (D-26: the switch is its own undo). */
  const [visited, setVisited] = useState<ReadonlyMap<string, boolean>>(new Map())
  /** The place whose last Visited change didn't save, and the value it wanted. */
  const [failed, setFailed] = useState<{ id: string; value: boolean } | null>(null)
  const sends = useRef(new Map<string, number>())

  // A trip being deleted (16-17) leaves the Places tab with it.
  const { pendingIds } = useUndo()
  const { hidden } = useTripDeletes()
  const all = useMemo(
    () =>
      points
        .filter((p) => !pendingIds.has(p.tripId) && !hidden.has(p.tripId))
        .map((p) => (visited.has(p.id) ? { ...p, visited: visited.get(p.id) === true } : p)),
    [points, pendingIds, hidden, visited]
  )

  // Colours follow the home order of the trips that have places, whatever the filters.
  const allGroups = useMemo(() => groupByTrip(all, trips), [all, trips])
  const colors = useMemo(() => new Map(allGroups.map((g, i) => [g.trip.id, tripColor(i)])), [allGroups])
  const tripOptions = useMemo(() => allGroups.map((g) => g.trip), [allGroups])
  const types = useMemo(() => availableTypes(all), [all])

  const shown = useMemo(() => filterPlaces(all, filters), [all, filters])
  const groups = useMemo(() => groupByTrip(shown, trips), [shown, trips])

  const open = openId === null ? null : (all.find((p) => p.id === openId) ?? null)

  if (all.length === 0) return <NoPlaces />

  function changeVisited(id: string, next: boolean) {
    const place = all.find((p) => p.id === id)
    if (!place) return
    const seq = (sends.current.get(id) ?? 0) + 1
    sends.current.set(id, seq)
    setVisited((m) => new Map(m).set(id, next))
    setFailed(null)
    announce(`${place.name} marked ${next ? 'visited' : 'not visited'}.`)
    void sendVisited(id, next).then((ok) => {
      if (ok || sends.current.get(id) !== seq) return
      // D-33: the switch goes back and the card says so, with Retry.
      setVisited((m) => new Map(m).set(id, !next))
      setFailed({ id, value: next })
    })
  }

  function select(id: string, from: 'list' | 'map') {
    if (from === 'map') performance.mark(CARD_CLICK_MARK)
    // Laptop rows toggle their inline card; a pin always opens it.
    const next = isLaptop && from === 'list' && openId === id ? null : id
    setOpenId(next)
    if (next !== openId) setFailed(null)
    if (!isLaptop && next !== null) setSnap(SNAP_HALF)
  }

  const clear = () => setFilters(NO_FILTERS)

  const card = open && (
    <PlaceCard
      key={open.id}
      id={cardDomId(open.id)}
      place={open}
      color={colors.get(open.tripId) ?? tripColor(0)}
      saveFailed={failed?.id === open.id}
      onVisited={(next) => changeVisited(open.id, next)}
      onRetry={() => failed && changeVisited(failed.id, failed.value)}
      onBack={isLaptop ? undefined : () => setOpenId(null)}
    />
  )

  // The clustered map lands in the next commit (16-18 Task 2).
  const map = <div aria-hidden className="h-full w-full bg-surface-2" />

  const list = (variant: 'panel' | 'sheet') => (
    <PlacesList
      groups={groups}
      count={shown.length}
      colors={colors}
      onOpen={(id) => select(id, 'list')}
      inline={variant === 'panel'}
      openId={openId}
      card={card}
      onClearFilters={clear}
      headingId={headingId}
      headingClassName={variant === 'panel' ? 'px-4 py-3' : 'px-4 pt-2 pb-3'}
    />
  )

  // One tree for both layouts, so the map never remounts. The server renders the
  // laptop panel (hidden below lg by CSS) and the phone filters (hidden on lg),
  // so neither layout jumps on hydration; after it, only the matching one stays.
  return (
    <div className="relative flex min-h-0 flex-1 lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
      <aside aria-label="Your places" className="flex min-h-0 flex-col border-r border-line bg-board max-lg:hidden">
        {(!isClient || isLaptop) && (
          <>
            <div className="border-b border-board-line p-4">
              <PlacesFilters variant="panel" filters={filters} onChange={setFilters} trips={tripOptions} types={types} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{list('panel')}</div>
          </>
        )}
      </aside>
      <div ref={areaRef} className="relative min-h-0 flex-1 overflow-hidden overscroll-none">
        {map}
        {!isLaptop && (
          <div className="absolute inset-x-4 top-4 z-10 lg:hidden">
            <PlacesFilters variant="floating" filters={filters} onChange={setFilters} trips={tripOptions} types={types} />
          </div>
        )}
        {isClient && !isLaptop && (
          <PlacesSheet
            container={areaRef}
            snap={snap}
            onSnapChange={setSnap}
            labelledBy={card ? undefined : headingId}
            label={open?.name}
          >
            {card ? <div className="px-4 pt-2 pb-4">{card}</div> : list('sheet')}
          </PlacesSheet>
        )}
      </div>
    </div>
  )
}
