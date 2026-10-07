'use client'

import { useEffect, useState } from 'react'

/**
 * True once a performance mark with this name exists (already set or set
 * later), or after timeoutMs, whichever comes first. Used to hold decorative
 * downloads until the map is ready, so they never compete with it on a slow
 * phone (Q46 map budget).
 */
export function useAfterMark(name: string, timeoutMs: number): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (ready) return
    const timer = window.setTimeout(() => setReady(true), timeoutMs)
    let observer: PerformanceObserver | null = null
    if (typeof PerformanceObserver !== 'undefined') {
      // buffered: marks set before this effect ran are delivered too.
      observer = new PerformanceObserver((list) => {
        if (list.getEntriesByName(name).length > 0) setReady(true)
      })
      try {
        observer.observe({ type: 'mark', buffered: true })
      } catch {
        observer = null
      }
    }
    return () => {
      window.clearTimeout(timer)
      observer?.disconnect()
    }
  }, [name, timeoutMs, ready])

  return ready
}
