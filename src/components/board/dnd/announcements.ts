// Screen-reader announcements for drag and drop, in place words (UI-SPEC
// Accessibility "Screen-reader announcements", D-22, 16-14). Pure builders
// handed to dnd-kit's Accessibility plugin, which writes them as plain text
// into its own polite live region (T-16-39: text only, never HTML).
// A drag is announced here once; its Undo toast stays silent (Pitfall 11).

/** Where a place is: a day (1…n) and a 1-based stop, or Maybe (day null). */
export interface DropLocation {
  day: number | null
  stop: number
}

/** start = where it was picked up · over = where it would land now · end = where it landed · cancel = where it is back. */
export type DragMoment = 'start' | 'over' | 'end' | 'cancel'

/** The part of a dnd-kit drag event the announcements read. */
export interface AnnounceEvent {
  operation: {
    source: { id: string | number } | null
    target?: { id: string | number; type?: unknown } | null
  }
  canceled?: boolean
}

/** One shared description for every drag handle (the handle's name already says the place). */
export const DRAG_INSTRUCTIONS =
  'Press Space or Enter to pick up the place. Use arrow keys to move, Space or Enter to drop, Escape to cancel.'

export function buildAnnouncements(
  nameOf: (id: string) => string,
  locate: (id: string, when: DragMoment, event: AnnounceEvent) => DropLocation | null
) {
  /** The place's name and location for this moment, or null to stay quiet. */
  function read(event: AnnounceEvent, when: DragMoment): { name: string; at: DropLocation } | null {
    const source = event.operation.source
    if (!source) return null
    const id = String(source.id)
    const at = locate(id, when, event)
    return at ? { name: nameOf(id), at } : null
  }

  return {
    announcements: {
      dragstart(event: AnnounceEvent): string | undefined {
        const r = read(event, 'start')
        if (!r) return undefined
        return r.at.day === null
          ? `Picked up ${r.name} from Maybe.`
          : `Picked up ${r.name}, day ${r.at.day}, stop ${r.at.stop}.`
      },
      dragover(event: AnnounceEvent): string | undefined {
        const r = read(event, 'over')
        if (!r) return undefined
        return r.at.day === null ? `${r.name}: Maybe.` : `${r.name}: day ${r.at.day}, stop ${r.at.stop}.`
      },
      dragend(event: AnnounceEvent): string | undefined {
        if (event.canceled) {
          const r = read(event, 'cancel')
          if (!r) return undefined
          return r.at.day === null
            ? `Move cancelled. ${r.name} is back in Maybe.`
            : `Move cancelled. ${r.name} is back on day ${r.at.day}, stop ${r.at.stop}.`
        }
        const r = read(event, 'end')
        if (!r) return undefined
        return r.at.day === null ? `${r.name} moved to Maybe.` : `${r.name} moved to day ${r.at.day}, position ${r.at.stop}.`
      },
    },
    screenReaderInstructions: { draggable: DRAG_INSTRUCTIONS },
  }
}
