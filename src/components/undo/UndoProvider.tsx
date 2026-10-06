'use client'

// The single Undo toast (UI-SPEC Interaction States "Undo toast", D-27 pattern,
// Research Pattern 7). One pending op at a time:
// - run(op) shows one toast for 10 s; a new op first commits the previous one;
// - the op commits when its toast closes (Base UI pauses the timer while the
//   toast is hovered or focused, so commit hangs off onClose, not a setTimeout);
// - Undo runs op.undo and the op never commits;
// - leaving the page (pagehide) commits a pending op; a deferred delete is sent
//   with fetch keepalive so it survives the unload.
// Focus is never moved to the toast; the toast text is the announcement.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Toast } from '@base-ui/react/toast'

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

const EMPTY: ReadonlySet<string> = new Set()

// Outside the provider there is no toast: the change commits at once.
const UndoContext = createContext<UndoApi>({
  run: (op) => {
    void Promise.resolve()
      .then(op.commit)
      .catch(() => {})
  },
  pendingIds: EMPTY,
})

export function useUndo(): UndoApi {
  return useContext(UndoContext)
}

export function UndoProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider limit={1} timeout={UNDO_TIMEOUT_MS}>
      <UndoManager>{children}</UndoManager>
      <Toast.Portal>
        <Toast.Viewport
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-50 lg:inset-x-auto lg:bottom-6 lg:left-1/2 lg:w-[calc(100vw-48px)] lg:max-w-[480px] lg:-translate-x-1/2"
        >
          <UndoToasts />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

interface Entry {
  op: UndoOp
  toastId: string | null
  settled: boolean
}

function UndoManager({ children }: { children: React.ReactNode }) {
  const toasts = Toast.useToastManager()
  const pending = useRef<Entry | null>(null)
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(EMPTY)

  const forget = useCallback((entry: Entry) => {
    if (pending.current === entry) pending.current = null
    if (!entry.op.deferred) return
    setPendingIds((prev) => {
      if (!prev.has(entry.op.id)) return prev
      const next = new Set(prev)
      next.delete(entry.op.id)
      return next
    })
  }, [])

  /** Commits or undoes an entry exactly once (T-16-25). */
  const settle = useCallback(
    (entry: Entry, how: 'commit' | 'undo' | 'unload') => {
      if (entry.settled) return
      entry.settled = true
      forget(entry)
      const { op } = entry
      if (how === 'undo') {
        op.undo()
        return
      }
      if (how === 'unload' && op.keepaliveRequest) {
        const { url, method } = op.keepaliveRequest
        void fetch(url, { method, keepalive: true }).catch(() => {})
        return
      }
      void Promise.resolve()
        .then(op.commit)
        .catch(() => {})
    },
    [forget]
  )

  const run = useCallback(
    (op: UndoOp) => {
      const previous = pending.current
      if (previous) {
        settle(previous, 'commit')
        if (previous.toastId) toasts.close(previous.toastId)
      }

      const entry: Entry = { op, toastId: null, settled: false }
      pending.current = entry
      if (op.deferred) setPendingIds((prev) => new Set(prev).add(op.id))

      entry.toastId = toasts.add({
        title: op.label,
        timeout: UNDO_TIMEOUT_MS,
        actionProps: {
          children: 'Undo',
          onClick: () => {
            settle(entry, 'undo')
            if (entry.toastId) toasts.close(entry.toastId)
          },
        },
        onClose: () => settle(entry, 'commit'),
      })
    },
    [settle, toasts]
  )

  // Leaving the page commits what is pending, so a held delete is not lost.
  useEffect(() => {
    function onPageHide() {
      const entry = pending.current
      if (!entry) return
      settle(entry, 'unload')
      if (entry.toastId) toasts.close(entry.toastId)
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [settle, toasts])

  const api = useMemo<UndoApi>(() => ({ run, pendingIds }), [run, pendingIds])
  return <UndoContext.Provider value={api}>{children}</UndoContext.Provider>
}

function UndoToasts() {
  const { toasts } = Toast.useToastManager()
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      swipeDirection="down"
      className="absolute inset-x-0 bottom-0 rounded-xl bg-ink text-bg shadow-[0_8px_24px_rgb(11_16_20/0.24)] transition-[opacity,translate] duration-200 ease-out data-ending-style:translate-y-2 data-ending-style:opacity-0 data-limited:hidden data-starting-style:translate-y-2 data-starting-style:opacity-0 motion-reduce:transition-none"
    >
      <Toast.Content className="flex min-h-14 items-center gap-2 py-1 pr-1 pl-4">
        <Toast.Title className="min-w-0 flex-1 truncate text-base leading-normal" />
        <Toast.Action className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-3 text-base font-semibold underline decoration-[1.5px] underline-offset-4 outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-bg" />
      </Toast.Content>
    </Toast.Root>
  ))
}
