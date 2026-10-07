'use client'

// The single Undo manager (UI-SPEC Interaction States "Undo toast", D-27
// pattern, Research Pattern 7). One pending op at a time:
// - run(op) shows one toast for 10 s; a new op first commits the previous one;
// - the op commits when its toast closes (Base UI pauses the timer while the
//   toast is hovered or focused, so commit hangs off onClose, not a setTimeout);
// - Undo runs op.undo and the op never commits;
// - leaving the page (pagehide) commits a pending op; a deferred delete is sent
//   with fetch keepalive so it survives the unload.
// The toast itself (Base UI Toast, UndoToaster) loads on the first op, so it
// stays out of the plan route's first-load JS (Q46 budget). Focus is never
// moved to the toast; the toast text is the announcement.

import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

/** Every Undo lasts 10 s (UI-SPEC, discretion). */
export const UNDO_TIMEOUT_MS = 10000

export interface UndoOp {
  /** The thing the op acts on (an activity or trip id); listed in pendingIds while a deferred op waits. */
  id: string
  /** Toast text, e.g. "Moved {Place} to day {n}". */
  label: string
  /** Runs once when the Undo window ends without Undo. */
  commit: () => Promise<void> | void
  /** Runs once when Undo is pressed; commit then never runs. */
  undo: () => void
  /** The change is held on the client until commit (e.g. a delete). */
  deferred?: boolean
  /** Sent with fetch keepalive instead of commit() when the page is being unloaded. */
  keepaliveRequest?: { url: string; method: string }
}

interface UndoApi {
  run: (op: UndoOp) => void
  /** Ids of deferred ops not yet committed or undone. */
  pendingIds: ReadonlySet<string>
}

/** What the toaster shows: one toast per key; a new key replaces the old toast. */
export interface UndoToastState {
  key: number
  label: string
}

const EMPTY: ReadonlySet<string> = new Set()

function runCommit(op: UndoOp) {
  void Promise.resolve()
    .then(op.commit)
    .catch(() => {})
}

// Outside the provider there is no toast: the change commits at once.
const UndoContext = createContext<UndoApi>({ run: runCommit, pendingIds: EMPTY })

export function useUndo(): UndoApi {
  return useContext(UndoContext)
}

const UndoToaster = lazy(() => import('./UndoToaster'))

interface Entry {
  key: number
  op: UndoOp
  settled: boolean
}

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const pending = useRef<Entry | null>(null)
  const nextKey = useRef(1)
  const [toast, setToast] = useState<UndoToastState | null>(null)
  const [used, setUsed] = useState(false)
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(EMPTY)

  /** Commits or undoes an entry exactly once (T-16-25). */
  const settle = useCallback((entry: Entry, how: 'commit' | 'undo' | 'unload') => {
    if (entry.settled) return
    entry.settled = true
    if (pending.current === entry) {
      pending.current = null
      setToast((t) => (t?.key === entry.key ? null : t))
    }
    const { op } = entry
    if (op.deferred) {
      setPendingIds((prev) => {
        if (!prev.has(op.id)) return prev
        const next = new Set(prev)
        next.delete(op.id)
        return next
      })
    }
    if (how === 'undo') {
      op.undo()
    } else if (how === 'unload' && op.keepaliveRequest) {
      const { url, method } = op.keepaliveRequest
      void fetch(url, { method, keepalive: true }).catch(() => {})
    } else {
      runCommit(op)
    }
  }, [])

  const run = useCallback(
    (op: UndoOp) => {
      if (pending.current) settle(pending.current, 'commit')
      const entry: Entry = { key: nextKey.current++, op, settled: false }
      pending.current = entry
      if (op.deferred) setPendingIds((prev) => new Set(prev).add(op.id))
      setUsed(true)
      setToast({ key: entry.key, label: op.label })
    },
    [settle]
  )

  /** The toast with this key closed (timeout, swipe or replaced). */
  const onClosed = useCallback(
    (key: number) => {
      const entry = pending.current
      if (entry && entry.key === key) settle(entry, 'commit')
    },
    [settle]
  )

  const onUndo = useCallback(
    (key: number) => {
      const entry = pending.current
      if (entry && entry.key === key) settle(entry, 'undo')
    },
    [settle]
  )

  // Leaving the page commits what is pending, so a held delete is not lost.
  useEffect(() => {
    function onPageHide() {
      if (pending.current) settle(pending.current, 'unload')
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [settle])

  const api = useMemo<UndoApi>(() => ({ run, pendingIds }), [run, pendingIds])
  return (
    <UndoContext.Provider value={api}>
      {children}
      {used && (
        <Suspense fallback={null}>
          <UndoToaster toast={toast} timeout={UNDO_TIMEOUT_MS} onClosed={onClosed} onUndo={onUndo} />
        </Suspense>
      )}
    </UndoContext.Provider>
  )
}
