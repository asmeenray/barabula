'use client'

// Read-only trip plan board (UI-SPEC §7 phone, §8 laptop). One DOM for both:
// phone = map strip above the board, one day at a time behind day tabs, with
// an Expand map button; laptop (lg) = 440 px list with every day stacked under
// clickable day header rows, map filling the rest.

import { useEffect, useMemo, useRef, useState } from 'react'
import { groupDays } from '@/lib/plan/days'
import { chipFor, dayTitle, nextStopId, stopsLabel } from '@/lib/plan/board'
import { dayKm, walkCells } from '@/lib/plan/walk'
import type { PlanActivity, TripPlan } from '@/lib/plan/types'
import { TripMapLazy } from '@/components/map/TripMapLazy'
import { Maximize2Icon, Minimize2Icon } from '@/components/icons'
import { BoardHead, ColumnHeads } from './BoardHead'
import { BoardRow } from './BoardRow'
import { DayTabs, dayKeyId, type DayKey } from './DayTabs'
import { PlanHeader } from './PlanHeader'

/** Marked once the board has hydrated and its day tabs respond (logged by the budgets spec, Q46). */
export const BOARD_READY_MARK = 'barabula:board-ready'

const MAP_REGION_ID = 'trip-map'

const MAP_BUTTON =
  'flex min-h-11 items-center justify-center gap-2 rounded-lg border border-field bg-surface text-ink transition-transform duration-150 ease-out active:scale-[0.97]'

export function PlanClient({ plan }: { plan: TripPlan }) {
  const { trip, activities } = plan
  const city = trip.destination || trip.title
  const { days, maybe } = useMemo(() => groupDays(activities, plan.dayCount), [activities, plan.dayCount])
  const [selected, setSelected] = useState<DayKey>(1)
  const [mapExpanded, setMapExpanded] = useState(false)
  // One ticket open at a time (UI-SPEC §7 item 7).
  const [openId, setOpenId] = useState<string | null>(null)
  const isEmpty = activities.length === 0
  const expandRef = useRef<HTMLButtonElement>(null)
  const shrinkRef = useRef<HTMLButtonElement>(null)
  const toggledRef = useRef(false)

  function toggleMap(expanded: boolean) {
    toggledRef.current = true
    setMapExpanded(expanded)
  }

  // The button the user pressed unmounts; hand focus to its counterpart.
  useEffect(() => {
    if (!toggledRef.current) return
    toggledRef.current = false
    ;(mapExpanded ? shrinkRef : expandRef).current?.focus()
  }, [mapExpanded])

  useEffect(() => {
    if (performance.getEntriesByName(BOARD_READY_MARK).length === 0) performance.mark(BOARD_READY_MARK)
  }, [])

  const tabs = (props: { idPrefix?: string; controls?: (key: DayKey) => string; className?: string }) => (
    <DayTabs
      dayCount={days.length}
      maybeCount={maybe.length}
      startDate={trip.start_date}
      selected={selected}
      onSelect={setSelected}
      {...props}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[440px_minmax(0,1fr)]">
      {/* Map: 34% strip on phone (full height when expanded), fills the right column on laptop. */}
      <div
        className={`relative shrink-0 lg:col-start-2 lg:row-start-1 lg:h-auto lg:min-h-0 ${
          mapExpanded ? 'min-h-0 flex-1' : 'h-[34vh] min-h-[200px]'
        }`}
      >
        <TripMapLazy activities={activities} selectedDay={selected} id={MAP_REGION_ID} />

        {mapExpanded ? (
          <>
            <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 border-b border-board-line bg-board py-2 pr-2 pl-4 lg:hidden">
              {tabs({ idPrefix: 'map-day-tab', controls: () => MAP_REGION_ID, className: 'min-w-0 flex-1' })}
              <button
                type="button"
                ref={shrinkRef}
                aria-label="Shrink map"
                onClick={() => toggleMap(false)}
                className={`${MAP_BUTTON} w-11 shrink-0`}
              >
                <Minimize2Icon />
              </button>
            </div>
            <button
              type="button"
              onClick={() => toggleMap(false)}
              className={`${MAP_BUTTON} absolute bottom-6 left-1/2 z-10 -translate-x-1/2 px-4 font-label text-base font-semibold tracking-[0.08em] uppercase lg:hidden`}
            >
              Show list
            </button>
          </>
        ) : (
          <button
            type="button"
            ref={expandRef}
            aria-label="Expand map"
            onClick={() => toggleMap(true)}
            className={`${MAP_BUTTON} absolute top-2 right-2 z-10 w-11 lg:hidden`}
          >
            <Maximize2Icon />
          </button>
        )}
      </div>

      <div
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain bg-board text-board-ink lg:col-start-1 lg:row-start-1 lg:block lg:border-r lg:border-line ${
          mapExpanded ? 'max-lg:hidden' : ''
        }`}
      >
        <PlanHeader trip={trip} />

        {isEmpty ? (
          <div className="px-4 pt-12 pb-8">
            <h2 className="text-[22px] leading-[1.2] font-semibold">Now boarding: {city}</h2>
            <p className="mt-2 max-w-[60ch] text-base text-board-muted">
              Your plan is empty. Add the places you want to see, then arrange them by day.
            </p>
          </div>
        ) : (
          <>
            {/* Day tabs: phone only, sticky at the top of the board panel. */}
            {tabs({ className: 'sticky top-0 z-10 border-b border-board-line bg-board px-4 py-2 lg:hidden' })}

            {days.map((rows, i) => {
              const n = i + 1
              return (
                <DaySection
                  key={n}
                  day={n}
                  city={city}
                  startDate={trip.start_date}
                  selected={selected === n}
                  onSelect={() => setSelected(n)}
                  rows={rows}
                  openId={openId}
                  onOpen={setOpenId}
                  empty={
                    <>
                      <p className="font-mono text-base font-semibold uppercase">No stops yet</p>
                      <p className="mt-1 text-base text-board-muted">Add a place to this day, or drag one here.</p>
                    </>
                  }
                />
              )
            })}

            <DaySection
              day="maybe"
              city={city}
              startDate={trip.start_date}
              selected={selected === 'maybe'}
              onSelect={() => setSelected('maybe')}
              rows={maybe}
              openId={openId}
              onOpen={setOpenId}
              empty={
                <p className="text-base text-board-muted">
                  Nothing in Maybe. Move a place here to keep it without planning it.
                </p>
              }
            />
          </>
        )}

        {/* Clears the Add place opener (16-07) under the last row. */}
        <div className="h-24" aria-hidden />
      </div>
    </div>
  )
}

interface DaySectionProps {
  day: DayKey
  city: string
  startDate: string | null
  /** Phone shows only the selected day; laptop shows every day and marks this one. */
  selected: boolean
  onSelect: () => void
  rows: PlanActivity[]
  openId: string | null
  onOpen: (id: string | null) => void
  empty: React.ReactNode
}

function DaySection({ day, city, startDate, selected, onSelect, rows, openId, onOpen, empty }: DaySectionProps) {
  const id = dayKeyId(day)
  const maybe = day === 'maybe'
  const walks = maybe ? [] : walkCells(rows)
  // Accent NEXT only on the selected day (UI-SPEC "Accent reserved for" 1).
  const nextId = maybe || !selected ? null : nextStopId(rows)
  const km = maybe ? 0 : dayKm(rows)

  return (
    <section
      id={`day-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`day-head-${id}`}
      data-day={id}
      className={selected ? undefined : 'max-lg:hidden'}
    >
      {/* Phone: the board head for the selected day. */}
      <BoardHead
        id={id}
        city={city}
        day={day}
        startDate={startDate}
        stops={rows.length}
        km={km}
        className="lg:hidden"
      />

      {/* Laptop: a day header row that selects the day and refits the map. */}
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={`hidden min-h-11 w-full items-center justify-between gap-3 border-b px-4 py-2.5 text-left transition-colors duration-150 ease-out lg:flex ${
          selected
            ? 'border-board-ink bg-board-ink text-board'
            : 'border-board-line bg-surface-2 text-board-ink hover:bg-row-selected'
        }`}
      >
        <span className="font-mono text-xs font-semibold tracking-[0.08em] uppercase tabular-nums">
          {maybe ? 'Maybe' : `D${day} · ${dayTitle(startDate, day)}`}
        </span>
        <span className="shrink-0 font-mono text-xs uppercase tabular-nums">
          {maybe ? stopsLabel(rows.length) : `~${km} km`}
        </span>
      </button>

      {rows.length === 0 ? (
        <div className="border-b border-board-line px-4 py-4">{empty}</div>
      ) : (
        <>
          <ColumnHeads />
          <ol>
            {rows.map((a, i) => (
              <BoardRow
                key={a.id}
                activity={a}
                number={maybe ? null : i + 1}
                walk={maybe ? null : walks[i]}
                chip={chipFor(a, nextId)}
                open={openId === a.id}
                onToggle={(open) => onOpen(open ? a.id : null)}
              />
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
