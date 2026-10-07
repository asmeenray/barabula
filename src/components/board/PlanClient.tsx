'use client'

// Read-only trip plan board (UI-SPEC §7 phone, §8 laptop). One DOM for both:
// phone = map strip above the board, one day at a time behind day tabs, with
// an Expand map button; laptop (lg) = 440 px list with every day stacked under
// clickable day header rows, map filling the rest.
// Drag and drop (16-14, D-22) loads on idle once the map is up and only while
// the owner can edit; the row "⋯" menu does every move before (and without) it.

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { groupDays } from '@/lib/plan/days'
import { chipFor, dayTitle, nextStopId, stopsLabel } from '@/lib/plan/board'
import { dayKm, walkCells } from '@/lib/plan/walk'
import { bucketKey, type DropItems } from '@/lib/plan/drop'
import type { PlanActivity, TripPlan } from '@/lib/plan/types'
import type { CoverPhoto } from '@/lib/photos/manifest'
import { clockOf, isTempId, usePlan, type ActivityUpdate, type NewPlace } from '@/lib/plan/use-plan'
import { useCanEdit } from '@/lib/client/use-online'
import { useGeocode } from '@/lib/plan/use-geocode'
import { LAPTOP_QUERY, useMediaQuery } from '@/lib/client/use-media'
import { useUndo } from '@/components/undo/UndoProvider'
import { useAfterMark } from '@/lib/client/use-after-mark'
import { TripMapLazy } from '@/components/map/TripMapLazy'
import { Maximize2Icon, Minimize2Icon } from '@/components/icons'
import { AddPlaceButton, LazyPlaceForm } from './AddPlaceButton'
import type { PlaceFormValues } from './PlaceForm'
import { BoardHead, ColumnHeads } from './BoardHead'
import { BoardRow, type RowGeo } from './BoardRow'
import type { RowActions } from './RowMenu'
import { BoardStatusLine } from './BoardStatusLine'
import { DayTabs, dayKeyId, type DayKey } from './DayTabs'
import { PlanHeader } from './PlanHeader'
import { DndElements, handleKey, rowKey, targetKey } from './dnd/elements'
import type { PlanDndProps } from './dnd/PlanDnd'

/** Marked once the board has hydrated and its day tabs respond (logged by the budgets spec, Q46). */
export const BOARD_READY_MARK = 'barabula:board-ready'

const MAP_REGION_ID = 'trip-map'

// Same name as MAP_LOAD_MARK in TripMap.tsx; not imported, because that module
// pulls MapLibre into this chunk. The header photo waits for it (Q46 map budget:
// on throttled 4G the photo cost the map 0.7–1.4 s), or for the timeout if the
// map never loads.
const MAP_READY_MARK = 'barabula:map-load'
const PHOTO_HOLD_MAX_MS = 10_000

/** The place form, open in add or edit mode (16-11, D-18). */
type FormState = { mode: 'add' } | { mode: 'edit'; id: string }

/** Loads the drag layer when the browser is idle (setTimeout where requestIdleCallback is missing). */
function whenIdle(run: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(run, { timeout: 2000 })
    return () => window.cancelIdleCallback(handle)
  }
  const timer = window.setTimeout(run, 200)
  return () => window.clearTimeout(timer)
}

/** The board's order as drag buckets: 'd1'…'dN' and 'maybe'. */
function toItems(days: PlanActivity[][], maybe: PlanActivity[]): DropItems {
  const items: DropItems = {}
  days.forEach((rows, i) => {
    items[bucketKey(i + 1)] = rows.map((a) => a.id)
  })
  items.maybe = maybe.map((a) => a.id)
  return items
}

const EMPTY_FORM: PlaceFormValues = { name: '', day: 1, location: '', fixedTime: false, time: '', note: '' }

/** Form values → what usePlan stores (blank optional text = null; a time only with the switch on). */
export function toNewPlace(v: PlaceFormValues): NewPlace {
  const time = v.fixedTime ? v.time.trim() || null : null
  return {
    day_number: v.day,
    name: v.name.trim(),
    location: v.location.trim() || null,
    description: v.note.trim() || null,
    time,
    fixed_time: time !== null,
  }
}

/** The edit form starts from the place as stored. */
function editValues(a: PlanActivity): PlaceFormValues {
  const fixedTime = a.extra_data?.fixed_time === true
  return {
    name: a.name,
    day: a.day_number,
    location: a.location ?? '',
    fixedTime,
    time: fixedTime ? (clockOf(a.time) ?? '') : '',
    note: a.description ?? '',
  }
}

/** The row's own button (the ticket toggle); focus returns here after an edit. */
function rowButtonOf(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`li[data-activity-id="${CSS.escape(id)}"] > button[aria-expanded]`)
}

/** Laptop day header as a drop target (16-14): dashed while a drag is on; a solid ink ring and a wash under the place. */
const DROP_HEADER =
  'data-[drop=ready]:outline-1 data-[drop=ready]:-outline-offset-4 data-[drop=ready]:outline-current data-[drop=ready]:outline-dashed data-[drop=over]:outline-2 data-[drop=over]:-outline-offset-4 data-[drop=over]:outline-board-ink data-[drop=over]:outline-solid data-[drop=over]:bg-row-selected data-[drop=over]:text-board-ink'

const MAP_BUTTON =
  'flex min-h-11 items-center justify-center gap-2 rounded-lg border border-field bg-surface text-ink transition-transform duration-150 ease-out active:scale-[0.97]'

export function PlanClient({ plan, photo = null }: { plan: TripPlan; photo?: CoverPhoto | null }) {
  const { trip } = plan
  const {
    activities: all,
    addActivity,
    editActivity,
    patchLocalExtra,
    updateActivity,
    moveActivity,
    moveUp,
    moveDown,
    removeActivity,
    unsaved,
    error,
  } = usePlan(plan)
  // A place whose removal is waiting out its Undo window is not shown (16-09).
  const { pendingIds } = useUndo()
  const activities = useMemo(
    () => (pendingIds.size === 0 ? all : all.filter((a) => !pendingIds.has(a.id))),
    [all, pendingIds]
  )
  const canEdit = useCanEdit()
  const mapReady = useAfterMark(MAP_READY_MARK, PHOTO_HOLD_MAX_MS)
  // Places without a pin are looked up through the server once the map is up (D-23).
  const { finding, stillOff, geocodeOne } = useGeocode(trip.id, all, canEdit, { start: mapReady, patchLocalExtra })
  const geoFor = (a: PlanActivity): RowGeo => ({
    finding: finding.has(a.id),
    stillOff: stillOff.has(a.id),
    find: () => void geocodeOne(a.id, { manual: true }),
  })
  const city = trip.destination || trip.title
  const grouped = useMemo(() => groupDays(activities, plan.dayCount), [activities, plan.dayCount])
  // While a place is dragged the board shows the drag order (16-14); null = stored order.
  const [dragOrder, setDragOrder] = useState<DropItems | null>(null)
  const { days, maybe } = useMemo(() => {
    if (!dragOrder) return grouped
    const byId = new Map(activities.map((a) => [a.id, a]))
    const pick = (ids: string[] | undefined) =>
      (ids ?? []).map((id) => byId.get(id)).filter((a): a is PlanActivity => a !== undefined)
    return { days: grouped.days.map((_, i) => pick(dragOrder[bucketKey(i + 1)])), maybe: pick(dragOrder.maybe) }
  }, [dragOrder, grouped, activities])
  const [selected, setSelected] = useState<DayKey>(1)
  const [mapExpanded, setMapExpanded] = useState(false)
  // One ticket open at a time (UI-SPEC §7 item 7).
  const [openId, setOpenId] = useState<string | null>(null)
  // Laptop row ↔ pin hover (UI-SPEC §8): the hovered row's pin grows; a hovered pin washes its row.
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const isEmpty = activities.length === 0
  const expandRef = useRef<HTMLButtonElement>(null)
  const shrinkRef = useRef<HTMLButtonElement>(null)
  const toggledRef = useRef(false)
  const isLaptop = useMediaQuery(LAPTOP_QUERY)
  const fabRef = useRef<HTMLButtonElement>(null)
  const barRef = useRef<HTMLButtonElement>(null)
  const [form, setForm] = useState<FormState | null>(null)
  // Drag layer (16-14): the board's elements are registered here from the first
  // render; PlanDnd binds dnd-kit to them once it has loaded.
  const [elements] = useState(() => new DndElements())
  const [PlanDnd, setPlanDnd] = useState<ComponentType<PlanDndProps> | null>(null)

  // Load it on idle after the plan is interactive and the map is up (so it never
  // competes with the map on a slow phone), and only while the owner can edit.
  useEffect(() => {
    if (PlanDnd || !canEdit || !mapReady) return
    let cancelled = false
    const cancelIdle = whenIdle(() => {
      import('./dnd/PlanDnd')
        .then((m) => {
          if (!cancelled) setPlanDnd(() => m.default)
        })
        .catch(() => {})
    })
    return () => {
      cancelled = true
      cancelIdle()
    }
  }, [PlanDnd, canEdit, mapReady])
  const draggable = PlanDnd !== null
  /** The control that opened the form; focus goes back to it on close. */
  const openerRef = useRef<HTMLElement | null>(null)
  const refocusRef = useRef(false)

  function openForm(next: FormState, opener: HTMLElement | null) {
    openerRef.current = opener
    setForm(next)
  }

  function closeForm() {
    refocusRef.current = true
    setForm(null)
  }

  // Inline (laptop) forms unmount on close; put focus back on the opener.
  // The phone sheet does this itself (Drawer finalFocus).
  useEffect(() => {
    if (form !== null || !refocusRef.current) return
    refocusRef.current = false
    openerRef.current?.focus()
  }, [form])

  function submitAdd(values: PlaceFormValues) {
    const place = toNewPlace(values)
    // Phone shows one day: follow the place to its day so it is seen landing.
    setSelected(place.day_number ?? 'maybe')
    void addActivity(place).then((row) => {
      if (row?.location) void geocodeOne(row.id)
    })
  }

  function submitEdit(id: string, values: PlaceFormValues) {
    const place = toNewPlace(values)
    if (activities.find((a) => a.id === id)?.day_number !== place.day_number) setSelected(place.day_number ?? 'maybe')
    void editActivity(id, place).then(({ saved, locationChanged }) => {
      // The server cleared the old pin; look the new address up (D-24).
      if (saved && locationChanged && place.location) void geocodeOne(id)
    })
  }

  const editing = form?.mode === 'edit' ? activities.find((a) => a.id === form.id) ?? null : null

  /** Laptop: the edit form opens inline under its row (UI-SPEC §9). */
  function editorFor(a: PlanActivity): React.ReactNode {
    if (!isLaptop || editing?.id !== a.id) return null
    return (
      <Suspense fallback={null}>
        <LazyPlaceForm
          mode="edit"
          variant="inline"
          dayCount={days.length}
          initial={editValues(a)}
          onSubmit={(values) => submitEdit(a.id, values)}
          onClose={closeForm}
        />
      </Suspense>
    )
  }

  /** A pin was tapped: its day, the list (phone) and its ticket open. */
  function selectPin(id: string) {
    setSelected(activities.find((a) => a.id === id)?.day_number ?? 'maybe')
    setMapExpanded(false)
    setOpenId(id)
  }

  // The open ticket's row stays in view (a pin tap can open one off screen).
  useEffect(() => {
    if (openId) rowButtonOf(openId)?.scrollIntoView({ block: 'nearest' })
  }, [openId, mapExpanded])

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

  // The row "⋯" menu (16-09): every move is reachable without drag (D-22).
  // Move up / Move down are left out (shown disabled) at the ends of a bucket.
  const actionsFor = (a: PlanActivity, index: number, rows: PlanActivity[]): RowActions => ({
    dayCount: days.length,
    // Not saved yet (temporary id): nothing to move or remove on the server.
    locked: isTempId(a.id),
    move: (toDay) => moveActivity(a.id, toDay),
    moveUp: index > 0 ? () => moveUp(a.id) : undefined,
    moveDown: index < rows.length - 1 ? () => moveDown(a.id) : undefined,
    // No confirm dialog: the place hides at once with a 10 s Undo (D-27 pattern).
    remove: () => removeActivity(a.id),
    edit: () => openForm({ mode: 'edit', id: a.id }, rowButtonOf(a.id)),
  })

  const tabs = (props: {
    idPrefix?: string
    controls?: (key: DayKey) => string
    className?: string
    dropRef?: (key: DayKey) => (el: Element | null) => void
  }) => (
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
        <TripMapLazy
          activities={activities}
          selectedDay={selected}
          id={MAP_REGION_ID}
          hoveredId={hoveredId}
          selectedId={openId}
          onPinHover={setHoveredId}
          onPinSelect={selectPin}
        />

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

      {/* The board panel; the phone FAB floats over its bottom-right corner. */}
      <div
        className={`relative flex min-h-0 flex-1 flex-col lg:col-start-1 lg:row-start-1 lg:border-r lg:border-line ${
          mapExpanded ? 'max-lg:hidden' : ''
        }`}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-board text-board-ink">
          <PlanHeader trip={trip} photo={photo} holdPhoto={!mapReady} />

          {isEmpty ? (
            <div className="px-4 pt-12 pb-8">
              <h2 className="text-[22px] leading-[1.2] font-semibold">Now boarding: {city}</h2>
              <p className="mt-2 max-w-[60ch] text-base text-board-muted">
                Your plan is empty. Add the places you want to see, then arrange them by day.
              </p>
            </div>
          ) : (
            <>
              {/* Sticky at the top of the board panel: the DELAYED line (D-33) while a
                  save has failed, then the day tabs (phone only). */}
              <div className="sticky top-0 z-10 bg-board">
                {error && (
                  <BoardStatusLine
                    message={error.message}
                    onRetry={error.retry}
                    retryDisabled={!canEdit}
                    className="border-b border-board-line px-4 py-2"
                  />
                )}
                {tabs({
                  className: 'border-b border-board-line px-4 py-2 lg:hidden',
                  dropRef: (key) => elements.ref(targetKey(bucketKey(key === 'maybe' ? null : key), 'phone')),
                })}
              </div>

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
                    hoveredId={hoveredId}
                    onHover={isLaptop ? setHoveredId : undefined}
                    unsaved={unsaved}
                    onUpdate={updateActivity}
                    actionsFor={actionsFor}
                    editorFor={editorFor}
                    geoFor={geoFor}
                    elements={elements}
                    draggable={draggable}
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
                hoveredId={hoveredId}
                onHover={isLaptop ? setHoveredId : undefined}
                unsaved={unsaved}
                onUpdate={updateActivity}
                actionsFor={actionsFor}
                editorFor={editorFor}
                geoFor={geoFor}
                elements={elements}
                draggable={draggable}
                empty={
                  <p className="text-base text-board-muted">
                    Nothing in Maybe. Move a place here to keep it without planning it.
                  </p>
                }
              />
            </>
          )}

          {/* Laptop: the inline add form takes the Add place bar's place (UI-SPEC §9). */}
          {form?.mode === 'add' && isLaptop ? (
            <Suspense fallback={null}>
              <LazyPlaceForm
                mode="add"
                variant="inline"
                dayCount={days.length}
                initial={{ ...EMPTY_FORM, day: selected === 'maybe' ? null : selected }}
                onSubmit={submitAdd}
                onClose={closeForm}
              />
            </Suspense>
          ) : (
            <div className="sticky bottom-0 z-10 bg-board px-4 pt-2 pb-4 max-lg:hidden">
              <AddPlaceButton variant="bar" onOpen={() => openForm({ mode: 'add' }, barRef.current)} ref={barRef} />
            </div>
          )}

          {PlanDnd && !isEmpty && (
            <PlanDnd
              items={dragOrder ?? toItems(grouped.days, grouped.maybe)}
              layout={isLaptop ? 'laptop' : 'phone'}
              visible={bucketKey(selected === 'maybe' ? null : selected)}
              elements={elements}
              nameOf={(id) => activities.find((a) => a.id === id)?.name ?? ''}
              positions={Object.fromEntries(activities.map((a) => [a.id, a.position]))}
              enabled={canEdit}
              locked={isTempId}
              onOrder={setDragOrder}
              onDrop={(id, day, index) => moveActivity(id, day, index, { announce: false })}
            />
          )}

          {/* Phone: clears the Add place FAB under the last row (UI-SPEC §7 item 8). */}
          <div className="h-24 lg:hidden" aria-hidden />
        </div>

        <AddPlaceButton
          variant="fab"
          ref={fabRef}
          onOpen={() => openForm({ mode: 'add' }, fabRef.current)}
          className="absolute right-4 bottom-4 z-20 lg:hidden"
        />
      </div>

      {/* Phone: the place form is a bottom sheet (Drawer). */}
      {form?.mode === 'add' && !isLaptop && (
        <Suspense fallback={null}>
          <LazyPlaceForm
            mode="add"
            variant="sheet"
            dayCount={days.length}
            initial={{ ...EMPTY_FORM, day: selected === 'maybe' ? null : selected }}
            onSubmit={submitAdd}
            onClose={closeForm}
            returnFocus={openerRef}
          />
        </Suspense>
      )}
      {editing && !isLaptop && (
        <Suspense fallback={null}>
          <LazyPlaceForm
            key={editing.id}
            mode="edit"
            variant="sheet"
            dayCount={days.length}
            initial={editValues(editing)}
            onSubmit={(values) => submitEdit(editing.id, values)}
            onClose={closeForm}
            returnFocus={openerRef}
          />
        </Suspense>
      )}
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
  hoveredId: string | null
  /** Laptop only: the pointer entered (id) or left (null) a row. */
  onHover?: (id: string | null) => void
  unsaved: ReadonlySet<string>
  onUpdate: (id: string, update: ActivityUpdate) => void
  actionsFor: (a: PlanActivity, index: number, rows: PlanActivity[]) => RowActions
  /** The inline edit form for a row (laptop), or null. */
  editorFor: (a: PlanActivity) => React.ReactNode
  geoFor: (a: PlanActivity) => RowGeo
  /** Board elements for the drag layer (16-14). */
  elements: DndElements
  /** The drag layer has loaded: rows get their grip handle. */
  draggable: boolean
  empty: React.ReactNode
}

function DaySection({
  day,
  city,
  startDate,
  selected,
  onSelect,
  rows,
  openId,
  onOpen,
  hoveredId,
  onHover,
  unsaved,
  onUpdate,
  actionsFor,
  editorFor,
  geoFor,
  elements,
  draggable,
  empty,
}: DaySectionProps) {
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
        ref={elements.ref(targetKey(bucketKey(maybe ? null : (day as number)), 'laptop'))}
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={`hidden min-h-11 w-full items-center justify-between gap-3 border-b px-4 py-2.5 text-left transition-colors duration-150 ease-out lg:flex ${DROP_HEADER} ${
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
                hovered={hoveredId === a.id}
                onHover={onHover}
                unsaved={unsaved.has(a.id)}
                onUpdate={onUpdate}
                actions={actionsFor(a, i, rows)}
                editor={editorFor(a)}
                geo={geoFor(a)}
                itemRef={elements.ref(rowKey(a.id))}
                handleRef={draggable ? elements.ref(handleKey(a.id)) : null}
              />
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
