'use client'

// The LOADING board row (UI-SPEC Interaction States "Loading", D-32): Mono 16
// in board-muted, split-flapping while it is up. Shown only when loading takes
// longer than 300 ms, and then kept for at least 400 ms so it never flashes
// (useDelayedFlag). Static text under reduced motion. Used for the tapped pass
// while the plan opens (the plan route has no loading.tsx) and for the maps
// before their first render ("LOADING MAP…").

import { useEffect, useRef, useState } from 'react'
import { useLinkStatus } from 'next/link'
import { useReducedMotionConfig } from 'motion/react'
import { SplitFlap } from './SplitFlap'

const SHOW_AFTER_MS = 300
const MIN_VISIBLE_MS = 400
/** A new flip every 1.6 s while the row is up (each flip is ~0.3 s). */
const CYCLE_MS = 1600

/** "LOADING MAP…" over a map area (the map's parent is position: relative). */
export const MAP_LOADING =
  'pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-base font-semibold text-board-muted uppercase'

const ROW =
  'flex min-h-14 items-center border-b border-board-line px-4 font-mono text-base font-semibold text-board-muted uppercase'

/**
 * True once `active` has lasted showAfter ms; once true, it stays true until
 * `active` ends and it has been true for at least minVisible ms.
 */
export function useDelayedFlag(active: boolean, showAfter = SHOW_AFTER_MS, minVisible = MIN_VISIBLE_MS): boolean {
  const [shown, setShown] = useState(false)
  const shownAt = useRef(0)

  useEffect(() => {
    if (active === shown) return
    const wait = active ? showAfter : Math.max(0, minVisible - (Date.now() - shownAt.current))
    const timer = window.setTimeout(() => {
      if (active) shownAt.current = Date.now()
      setShown(active)
    }, wait)
    return () => window.clearTimeout(timer)
  }, [active, shown, showAfter, minVisible])

  return shown
}

type RowProps = {
  label?: string
  /** Replaces the board-row classes (e.g. over a map or a pass body). */
  className?: string
  style?: React.CSSProperties
}

/** The row itself; the caller decides when it is up (see useDelayedFlag). */
export function LoadingRow({ label = 'LOADING…', className = ROW, style }: RowProps) {
  const reduced = useReducedMotionConfig() === true
  const [cycle, setCycle] = useState(1)

  useEffect(() => {
    if (reduced) return
    const timer = window.setInterval(() => setCycle((n) => n + 1), CYCLE_MS)
    return () => window.clearInterval(timer)
  }, [reduced])

  // The status text is said once; the flipping copy is hidden from assistive
  // tech so each new flip is not read out again.
  return (
    <p role="status" className={className} style={style}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">
        <SplitFlap text={label} play={reduced ? false : cycle} />
      </span>
    </p>
  )
}

/** The row while `loading`, after 300 ms and for at least 400 ms. */
export function DelayedLoadingRow({ loading, ...row }: RowProps & { loading: boolean }) {
  const shown = useDelayedFlag(loading)
  return shown ? <LoadingRow {...row} /> : null
}

/**
 * Inside a <Link>: the LOADING row while that link's navigation is pending
 * (after 300 ms), e.g. over a tapped pass's body.
 */
export function LinkLoadingRow({ className }: { className?: string }) {
  const { pending } = useLinkStatus()
  const shown = useDelayedFlag(pending)
  return shown ? <LoadingRow className={className} /> : null
}
