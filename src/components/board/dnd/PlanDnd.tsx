'use client'

// Drag and drop on the trip plan (16-14, D-22, UI-SPEC §7–§8 "Reorder / move",
// Research Pattern 6). Loaded on idle after the plan is interactive, only while
// the owner can edit; until then (and always) the row "⋯" menu does every move.
//
// - Phone: long-press a row (250 ms, 5 px, dnd-kit's touch default) and drop
//   it among the day's rows, or on a day tab (appends to that day).
// - Laptop: drag the grip handle; day headers (and MAYBE) are drop targets.
// - Keyboard: Space/Enter on the handle picks up, arrows move, Space/Enter
//   drops, Escape cancels.
//
// This component renders no DOM of its own. The board keeps rendering its rows;
// the entities here bind dnd-kit to the board's elements through DndElements,
// so the board is never remounted when this chunk arrives. While a place is
// dragged the board renders the drag order (onOrder); a drop becomes one
// moveActivity → one PATCH { day_number, position } with a silent Undo toast
// (the drop is announced here, in place words, Pitfall 11). Escape or a
// cancelled drag puts the board back exactly as it was.
//
// It uses @dnd-kit/dom directly (DragDropManager, Sortable, Droppable) rather
// than the @dnd-kit/react hooks: the adapter cost ~3.3 KB gzip, which took the
// plan route over its 200 KB JS budget (16-14 budget run: 205,319 B). The
// pieces the adapter adds are small and live here: entities registered in
// layout effects, and a renderer that tells dnd-kit when React has committed
// the drag order.

import { useEffect, useLayoutEffect, useState } from 'react'
import {
  Accessibility,
  DragDropManager,
  Droppable,
  Feedback,
  KeyboardSensor,
  PointerSensor,
  type Draggable,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/dom'
import { Sortable, SortableKeyboardPlugin } from '@dnd-kit/dom/sortable'
import { CollisionPriority, CollisionType, type CollisionDetector, type Plugins } from '@dnd-kit/abstract'
import { move } from '@dnd-kit/helpers'
import { bucketOfId, dropToPatch, moveToEnd, type DropItems } from '@/lib/plan/drop'
import { buildAnnouncements, type AnnounceEvent, type DragMoment, type DropLocation } from './announcements'
import { DndElements, handleKey, rowKey, targetKey } from './elements'

/** Marked when the drag layer is bound (the budgets spec waits for it before counting JS). */
export const DND_READY_MARK = 'barabula:dnd-ready'

const PLACE = 'place'
const DAY = 'day'
const TARGET_PREFIX = 'tab-'

/**
 * Rows and day targets collide only under the pointer (finger). With dnd-kit's
 * default (pointer, else shape overlap) the lifted row's shape overlapping the
 * first row of the next day beats the day header right under the pointer, so
 * a drop on the header would land at the top of that day instead of the end.
 * The keyboard sensor uses its own closest-corners detection.
 */
const underPointer: CollisionDetector = ({ dragOperation, droppable }) => {
  const point = dragOperation.position.current
  const shape = droppable.shape
  if (!point || !shape || !shape.containsPoint(point)) return null
  const distance = Math.hypot(shape.center.x - point.x, shape.center.y - point.y)
  return {
    id: droppable.id,
    value: 1 / Math.max(distance, 1),
    type: CollisionType.PointerIntersection,
    priority: CollisionPriority.High,
  }
}

/** Rows making room: the content tier (spring visualDuration 0.25, bounce 0 ≈ this ease-out). */
const ROOM_TRANSITION = { duration: 250, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', idle: false }

export interface PlanDndProps {
  /** The board order now (the drag order while dragging): 'd1'…'dN' and 'maybe'. */
  items: DropItems
  /** Phone binds the selected day's rows and the day tabs; laptop every row and the day headers. */
  layout: 'phone' | 'laptop'
  /** The bucket on screen on phone ('d2', 'maybe'). */
  visible: string
  elements: DndElements
  nameOf: (id: string) => string
  positions: Record<string, number | null>
  /** False while offline (D-34): nothing can be picked up. */
  enabled: boolean
  /** Rows that can't move yet (not saved: temporary id). */
  locked: (id: string) => boolean
  /** The drag order to render, or null to go back to the stored order. */
  onOrder: (items: DropItems | null) => void
  /** A finished drop: the place's new day (null = Maybe) and stop index there. */
  onDrop: (id: string, day: number | null, index: number) => void
}

type DragState = { start: DropItems; items: DropItems }


function bucketOfTarget(target: { id: string | number } | null | undefined): string | null {
  const id = target ? String(target.id) : ''
  return id.startsWith(TARGET_PREFIX) ? id.slice(TARGET_PREFIX.length) : null
}

function isDayTarget(target: { type?: unknown } | null | undefined): boolean {
  return target?.type === DAY
}

/** Where a place is in `items`, as the board numbers it (stop 1…n; Maybe has no day). */
function locationIn(items: DropItems, id: string): DropLocation | null {
  const key = bucketOfId(items, id)
  if (key === null) return null
  return { day: key === 'maybe' ? null : Number(key.slice(1)), stop: items[key].indexOf(id) + 1 }
}

/**
 * Where the place lands if dropped now. A day tab / header appends it to that
 * day, unless it is already in that day (then it stays where it is, so passing
 * over its own header never sends it to the end).
 */
function landing(items: DropItems, id: string, target: AnnounceEvent['operation']['target']): DropItems {
  if (!isDayTarget(target)) return items
  const to = bucketOfTarget(target)
  if (to === null || bucketOfId(items, id) === to) return items
  return moveToEnd(items, id, to)
}

/** The row's own button (the ticket toggle): a touch long-press there starts a drag. */
function rowButtonOf(source: Draggable): Element | undefined {
  return source.element?.querySelector(':scope > button[aria-expanded]:not([aria-haspopup])') ?? undefined
}

/** The pointer starts a drag from the grip (any pointer) or, by touch, from the row button. */
function canActivate(event: PointerEvent, source: Draggable): boolean {
  const target = event.target as Node | null
  if (!target) return false
  if (source.handle?.contains(target)) return true
  return event.pointerType === 'touch' && (rowButtonOf(source)?.contains(target) ?? false)
}

const SENSORS = [
  PointerSensor.configure({
    activatorElements: (source) => [source.handle, rowButtonOf(source)],
    preventActivation: (event, source) => !canActivate(event, source),
  }),
  KeyboardSensor,
]

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/** A drag order handed to React; dnd-kit waits for it to be committed (see renderer). */
interface PendingRender {
  promise: Promise<void>
  resolve: () => void
}

/**
 * One drag at a time, outside React state: the latest props, the order at
 * pick-up and the drag order so far, plus the dnd-kit manager. The handlers
 * and announcements read it, so they always see the newest board.
 */
export class DragSession {
  private props: PlanDndProps
  private drag: DragState | null = null
  private pending: PendingRender | null = null
  private dnd: DragDropManager | null = null
  private users = 0
  private destroyTimer: ReturnType<typeof setTimeout> | undefined
  readonly reduced = prefersReducedMotion()
  readonly plugins: (defaults: Plugins) => Plugins

  constructor(props: PlanDndProps) {
    this.props = props
    const accessibility = buildAnnouncements((id) => this.props.nameOf(id), this.locate)
    const reduced = this.reduced
    this.plugins = (defaults) => [
      ...defaults.filter((p) => p !== Accessibility && !(reduced && p === Feedback)),
      ...(reduced ? [Feedback.configure({ dropAnimation: null, keyboardTransition: null })] : []),
      Accessibility.configure({ id: 'plan', ...accessibility }),
    ]
  }

  /** The dnd-kit manager, created on first use (in render, like the React adapter does). */
  get manager(): DragDropManager {
    if (!this.dnd) {
      const pending = () => this.pending?.promise ?? Promise.resolve()
      const manager = new DragDropManager({
        plugins: this.plugins,
        sensors: SENSORS,
        // dnd-kit awaits this after a dragover / drop before it measures again.
        renderer: {
          get rendering() {
            return pending()
          },
        },
      })
      manager.monitor.addEventListener('dragstart', () => this.onDragStart())
      manager.monitor.addEventListener('dragover', (event) => this.onDragOver(event))
      manager.monitor.addEventListener('dragend', (event) => this.onDragEnd(event))
      this.dnd = manager
    }
    return this.dnd
  }

  update(props: PlanDndProps) {
    this.props = props
  }

  /** The board has committed what it was given (called from a layout effect). */
  rendered() {
    const p = this.pending
    this.pending = null
    p?.resolve()
  }

  /** Mounted / unmounted. Destroy is deferred, so React StrictMode's remount keeps the manager. */
  acquire() {
    this.users += 1
    clearTimeout(this.destroyTimer)
  }

  release() {
    this.users -= 1
    if (this.users > 0) return
    this.destroyTimer = setTimeout(() => {
      if (this.users > 0) return
      this.dnd?.destroy()
      this.dnd = null
    }, 0)
  }

  /** Hands a drag order to the board; dnd-kit waits until it is on screen. */
  private order(items: DropItems | null) {
    if (!this.pending) {
      let resolve = () => {}
      const promise = new Promise<void>((r) => {
        resolve = r
      })
      this.pending = { promise, resolve }
      // Never leave dnd-kit waiting if nothing re-renders.
      setTimeout(() => this.rendered(), 300)
    }
    this.props.onOrder(items)
  }

  /** Drop-target highlight on the day tabs / headers: data-drop="ready" | "over". */
  private paint(active: boolean, over: string | null) {
    const { items, elements, layout } = this.props
    for (const bucket of Object.keys(items)) {
      const el = elements.get(targetKey(bucket, layout))
      if (!el) continue
      const state = !active ? null : bucket === over ? 'over' : 'ready'
      if (state) el.setAttribute('data-drop', state)
      else el.removeAttribute('data-drop')
    }
  }

  private current(): DropItems {
    return this.drag?.items ?? this.props.items
  }

  /** Where the place is (start), would land (over), landed (end) or is back (cancel). */
  private locate = (id: string, when: DragMoment, event: AnnounceEvent): DropLocation | null => {
    if (when === 'start') return locationIn(this.current(), id)
    if (when === 'cancel') return locationIn(this.drag?.start ?? this.props.items, id)
    const target = event.operation.target
    if (when === 'end' || isDayTarget(target)) return locationIn(landing(this.current(), id, target), id)
    // 'over' a row: the drag order is updated right after this runs, so project it.
    if (!target || String(target.id) === id) return null
    return locationIn(move(this.current(), event as Parameters<typeof move>[1]), id)
  }

  onDragStart() {
    const items = this.props.items
    this.drag = { start: items, items }
    this.paint(true, null)
  }

  onDragOver(event: DragOverEvent) {
    const d = this.drag
    const { source, target } = event.operation
    this.paint(true, isDayTarget(target) ? bucketOfTarget(target) : null)
    if (!d || !source || !target || String(target.id) === String(source.id)) return
    // Over a day tab / header: highlighted only; the place moves there on drop.
    if (isDayTarget(target)) return
    const next = move(d.items, event)
    if (next === d.items) return
    d.items = next
    this.order(next)
  }

  onDragEnd(event: DragEndEvent) {
    const d = this.drag
    this.drag = null
    this.paint(false, null)
    const { onDrop, positions } = this.props
    const source = event.operation.source
    // Escape or a cancelled drag: back exactly as before, nothing is sent.
    if (!d || !source || event.canceled) {
      this.order(null)
      return
    }
    const id = String(source.id)
    const final = landing(d.items, id, event.operation.target)
    this.order(null)
    const patch = dropToPatch(final, id, positions)
    if (!patch) return
    const from = locationIn(d.start, id)
    if (from && from.day === patch.day_number && from.stop === patch.index + 1) return
    onDrop(id, patch.day_number, patch.index)
  }
}

export default function PlanDnd(props: PlanDndProps) {
  const [session] = useState(() => new DragSession(props))
  useLayoutEffect(() => {
    session.update(props)
    session.rendered()
  })

  useEffect(() => {
    session.acquire()
    if (performance.getEntriesByName(DND_READY_MARK).length === 0) performance.mark(DND_READY_MARK)
    return () => session.release()
  }, [session])

  const { items, layout, visible, elements, enabled, locked } = props
  const buckets = Object.keys(items)
  const transition = session.reduced ? null : ROOM_TRANSITION

  return (
    <>
      {buckets.map((bucket) =>
        layout === 'phone' && bucket !== visible
          ? null
          : items[bucket].map((id, index) => (
              <SortableRow
                key={id}
                session={session}
                id={id}
                index={index}
                group={bucket}
                elements={elements}
                disabled={!enabled || locked(id)}
                transition={transition}
              />
            ))
      )}
      {buckets.map((bucket) => (
        <DayTarget key={`${layout}:${bucket}`} session={session} bucket={bucket} layout={layout} elements={elements} />
      ))}
    </>
  )
}

interface SortableRowProps {
  session: DragSession
  id: string
  index: number
  group: string
  elements: DndElements
  disabled: boolean
  transition: typeof ROOM_TRANSITION | null
}

/** Keeps a sortable in step with its row after each render (index, day, elements, disabled). */
function syncSortable(sortable: Sortable, p: Omit<SortableRowProps, 'session' | 'transition'>) {
  if (sortable.group !== p.group) sortable.group = p.group
  if (sortable.index !== p.index) sortable.index = p.index
  const element = p.elements.get(rowKey(p.id))
  if (element && sortable.element !== element) sortable.element = element
  const handle = p.elements.get(handleKey(p.id))
  if (handle && sortable.handle !== handle) sortable.handle = handle
  if (sortable.disabled !== p.disabled) sortable.disabled = p.disabled
}

/** Binds one board row (and its grip) as a sortable place in its day. */
function SortableRow({ session, transition, ...p }: SortableRowProps) {
  const [sortable] = useState(
    () =>
      new Sortable(
        {
          id: p.id,
          index: p.index,
          group: p.group,
          type: PLACE,
          accept: PLACE,
          element: p.elements.get(rowKey(p.id)),
          handle: p.elements.get(handleKey(p.id)),
          disabled: p.disabled,
          transition,
          collisionDetector: underPointer,
          // React moves the rows (onOrder); dnd-kit's optimistic DOM sorting stays off.
          plugins: [SortableKeyboardPlugin],
          register: false,
        },
        session.manager
      )
  )
  useLayoutEffect(() => sortable.register(), [sortable])
  useLayoutEffect(() => syncSortable(sortable, p))
  return null
}

/** A whole-day drop target: the phone day tab or the laptop day header. Low priority, so rows win. */
function DayTarget({
  session,
  bucket,
  layout,
  elements,
}: {
  session: DragSession
  bucket: string
  layout: 'phone' | 'laptop'
  elements: DndElements
}) {
  const key = targetKey(bucket, layout)
  const [droppable] = useState(
    () =>
      new Droppable(
        {
          id: `${TARGET_PREFIX}${bucket}`,
          type: DAY,
          accept: PLACE,
          collisionPriority: CollisionPriority.Low,
          collisionDetector: underPointer,
          element: elements.get(key),
          register: false,
        },
        session.manager
      )
  )
  useLayoutEffect(() => droppable.register(), [droppable])
  useLayoutEffect(() => syncTarget(droppable, elements.get(key)))
  return null
}

function syncTarget(droppable: Droppable, element: Element | undefined) {
  if (element && droppable.element !== element) droppable.element = element
}
