// DOM elements the idle-loaded drag layer binds to (16-14). The board renders
// its rows, grip handles, day tabs and day headers as before and registers the
// elements here with stable ref callbacks. PlanDnd (loaded later) points
// dnd-kit at them through ref-like getters, so loading it never remounts the
// board (no lost focus or half-typed form). Tiny and dependency-free: this file
// is in the plan route's first-load JS; dnd-kit is not.

type RefCallback = (el: Element | null) => void

export const rowKey = (id: string) => `row:${id}`
export const handleKey = (id: string) => `handle:${id}`
/** A drop target for a whole bucket: the phone day tab or the laptop day header ('d1'…, 'maybe'). */
export const targetKey = (bucket: string, layout: 'phone' | 'laptop') => `${layout}:${bucket}`

export class DndElements {
  private readonly els = new Map<string, Element>()
  private readonly refs = new Map<string, RefCallback>()

  get(key: string): Element | undefined {
    return this.els.get(key)
  }

  /** A stable ref callback for this key (React calls it with null on unmount). */
  ref(key: string): RefCallback {
    let cb = this.refs.get(key)
    if (!cb) {
      cb = (el) => {
        if (el) this.els.set(key, el)
        // A remount elsewhere may already have set the new element.
        else if (this.els.get(key) && !this.els.get(key)?.isConnected) this.els.delete(key)
      }
      this.refs.set(key, cb)
    }
    return cb
  }

  /** A ref-like object dnd-kit reads on every render of its hook (currentValue). */
  current(key: string): { readonly current: Element | undefined } {
    const els = this.els
    return {
      get current() {
        return els.get(key)
      },
    }
  }
}
