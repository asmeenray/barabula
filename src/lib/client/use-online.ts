'use client'

import { useSyncExternalStore } from 'react'

// Online state for D-34: while the browser is offline the app shows the
// offline banner and every edit control is disabled. The server snapshot is
// "online", so the first paint never shows the banner by mistake.

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  )
}

/** Every edit control in phase 16 asks this before it acts (D-34). */
export function useCanEdit(): boolean {
  return useOnline()
}
