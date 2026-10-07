'use client'

import { useSyncExternalStore } from 'react'

/** The laptop shell breakpoint (UI-SPEC: lg = 1024 px). */
export const LAPTOP_QUERY = '(min-width: 1024px)'

/**
 * True while the media query matches. The server snapshot is false (phone
 * first), so anything that differs by breakpoint renders after hydration.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    // No matchMedia (old engines, test DOMs): phone layout.
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false
  )
}
