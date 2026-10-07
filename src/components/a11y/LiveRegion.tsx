'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

// One polite live region for the whole app (UI-SPEC Accessibility, D-22).
// Components call useAnnounce()(text) with place words, e.g.
// "{Place} marked visited." Text goes in through React as plain text (T-16-21).

type Announce = (message: string) => void

const AnnounceContext = createContext<Announce>(() => {})

export function LiveRegionProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const announce = useCallback<Announce>((text) => {
    // Clear first so the same sentence twice in a row is read again.
    setMessage('')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(text), 50)
  }, [])

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-region">
        {message}
      </div>
    </AnnounceContext.Provider>
  )
}

/** Returns announce(text); a no-op outside LiveRegionProvider. */
export function useAnnounce(): Announce {
  return useContext(AnnounceContext)
}
