'use client'

// Read-only trip plan board (tracer, 16-05). One DOM for both layouts:
// phone = map strip above the board, one day at a time behind day tabs;
// laptop (lg) = 440 px list with every day stacked, map filling the rest.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { groupDays } from '@/lib/plan/days'
import { chipFor, dayDate, nextStopId } from '@/lib/plan/board'
import { dayKm, walkCells } from '@/lib/plan/walk'
import type { PlanActivity, TripPlan } from '@/lib/plan/types'
import { TripMapLazy } from '@/components/map/TripMapLazy'
import type { DayKey } from '@/components/map/TripMap'
import { BoardHead, ColumnHeads } from './BoardHead'
import { BoardRow } from './BoardRow'

/** Marked once the board has hydrated and its day tabs respond (logged by the budgets spec, Q46). */
export const BOARD_READY_MARK = 'barabula:board-ready'

// Element Timing attribute (not in React's DOM types, passed through as-is).
const BOARD_TIMING = { elementtiming: 'board' } as Record<string, string>

function tripDates(plan: TripPlan): string {
  const first = dayDate(plan.trip.start_date, 1)
  const last = plan.trip.end_date ? dayDate(plan.trip.end_date, 1) : null
  if (first && last) {
    return first.month === last.month
      ? `${first.day}–${last.day} ${first.month}`
      : `${first.day} ${first.month} – ${last.day} ${last.month}`
  }
  return `${plan.dayCount} ${plan.dayCount === 1 ? 'day' : 'days'}`
}

function tabKey(key: DayKey): string {
  return key === 'maybe' ? 'maybe' : String(key)
}

export function PlanClient({ plan }: { plan: TripPlan }) {
  const { trip, activities } = plan
  const city = trip.destination || trip.title
  const { days, maybe } = useMemo(() => groupDays(activities, plan.dayCount), [activities, plan.dayCount])
  const [selected, setSelected] = useState<DayKey>(1)

  const tabKeys: DayKey[] = useMemo(() => [...days.map((_, i) => i + 1), 'maybe' as const], [days])
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())

  useEffect(() => {
    if (performance.getEntriesByName(BOARD_READY_MARK).length === 0) performance.mark(BOARD_READY_MARK)
  }, [])

  // Keep the selected tab in view when the strip scrolls (more than 5 days).
  useEffect(() => {
    tabRefs.current.get(tabKey(selected))?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [selected])

  function onTabKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = tabKeys.findIndex((k) => k === selected)
    let next = index
    if (e.key === 'ArrowRight') next = (index + 1) % tabKeys.length
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabKeys.length) % tabKeys.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabKeys.length - 1
    else return
    e.preventDefault()
    const key = tabKeys[next]
    setSelected(key)
    tabRefs.current.get(tabKey(key))?.focus()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[440px_minmax(0,1fr)]">
      {/* Map: strip on phone, fills the right column on laptop. */}
      <div className="h-[34vh] min-h-[200px] shrink-0 lg:col-start-2 lg:row-start-1 lg:h-auto lg:min-h-0">
        <TripMapLazy activities={activities} selectedDay={selected} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-board text-board-ink lg:col-start-1 lg:row-start-1 lg:border-r lg:border-line">
        <header className="px-4 pt-4 pb-3">
          {/* elementtiming: the budgets spec reads when the board first paints (Q46). */}
          <h1 {...BOARD_TIMING} className="font-mono text-[22px] leading-tight font-semibold tracking-[-0.01em] uppercase">
            {trip.title}
          </h1>
          <p className="mt-1 font-mono text-xs text-board-muted uppercase tabular-nums">
            {tripDates(plan)} · {activities.length} {activities.length === 1 ? 'place' : 'places'}
          </p>
        </header>

        {/* Day tabs: phone only. */}
        <div
          role="tablist"
          aria-label="Days"
          onKeyDown={onTabKeyDown}
          className="sticky top-0 z-10 flex snap-x snap-mandatory scroll-px-4 gap-1.5 overflow-x-auto border-b border-board-line bg-board px-4 py-2 lg:hidden"
        >
          {tabKeys.map((key) => {
            const isSelected = key === selected
            const id = tabKey(key)
            const date = key === 'maybe' ? null : dayDate(trip.start_date, key)
            return (
              <button
                key={id}
                ref={(el) => {
                  if (el) tabRefs.current.set(id, el)
                  else tabRefs.current.delete(id)
                }}
                id={`day-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={`day-panel-${id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setSelected(key)}
                className={`flex h-12 min-w-16 flex-1 shrink-0 snap-start flex-col items-start justify-center rounded-[4px] border px-2 text-left transition-colors duration-150 ease-out ${
                  isSelected
                    ? 'border-board-ink bg-board-ink text-board'
                    : 'border-board-line text-board-muted'
                }`}
              >
                {key === 'maybe' ? (
                  <>
                    <span className="font-label text-xs leading-none font-semibold tracking-[0.16em] uppercase">Maybe</span>
                    <span className="mt-1 font-mono text-xs leading-none tabular-nums">{maybe.length}</span>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-base leading-none font-semibold tabular-nums">D{key}</span>
                    {date && (
                      <span className="mt-1 font-label text-xs leading-none font-semibold tracking-[0.16em] whitespace-nowrap uppercase">
                        {date.weekday} {date.day}
                      </span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>

        {days.map((rows, i) => {
          const n = i + 1
          return (
            <DaySection
              key={n}
              id={String(n)}
              day={n}
              city={city}
              startDate={trip.start_date}
              hidden={selected !== n}
              rows={rows}
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
          id="maybe"
          day="maybe"
          city={city}
          startDate={trip.start_date}
          hidden={selected !== 'maybe'}
          rows={maybe}
          empty={
            <p className="text-base text-board-muted">
              Nothing in Maybe. Move a place here to keep it without planning it.
            </p>
          }
        />

        <div className="h-24" aria-hidden />
      </div>
    </div>
  )
}

interface DaySectionProps {
  id: string
  day: number | 'maybe'
  city: string
  startDate: string | null
  hidden: boolean
  rows: PlanActivity[]
  empty: React.ReactNode
}

function DaySection({ id, day, city, startDate, hidden, rows, empty }: DaySectionProps) {
  const maybe = day === 'maybe'
  const walks = maybe ? [] : walkCells(rows)
  const nextId = maybe ? null : nextStopId(rows)
  return (
    <section
      id={`day-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`day-head-${id}`}
      data-day={id}
      className={hidden ? 'max-lg:hidden' : undefined}
    >
      <BoardHead
        id={id}
        city={city}
        day={day}
        startDate={startDate}
        stops={rows.length}
        km={maybe ? 0 : dayKm(rows)}
      />

      {rows.length === 0 ? (
        <div className="border-t border-board-line px-4 py-4">{empty}</div>
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
              />
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
