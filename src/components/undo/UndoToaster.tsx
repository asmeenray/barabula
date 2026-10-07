'use client'

// The Undo toast view (UI-SPEC Interaction States "Undo toast"), loaded by
// UndoProvider on the first undoable action. Base UI Toast, one at a time:
// ink fill, bg-coloured 16 px text, an underlined "Undo" with a 44 px hit area.
// Phone: 16 px in from each side, 16 above the tab bar. Laptop: 24 from the
// bottom, centred, max 480 wide. Polite live region; focus is never moved here.
// A toast with announce: false (a drag) is shown with the live region off, so
// it is not read out a second time (Pitfall 11).
// The timer pauses while the toast is hovered or focused (Base UI).

import { useEffect, useRef } from 'react'
import { Toast } from '@base-ui/react/toast'
import type { UndoToastState } from './UndoProvider'

interface UndoToasterProps {
  toast: UndoToastState | null
  timeout: number
  onClosed: (key: number) => void
  onUndo: (key: number) => void
}

export default function UndoToaster(props: UndoToasterProps) {
  const silent = props.toast?.announce === false
  return (
    <Toast.Provider limit={1} timeout={props.timeout}>
      <ToastSync {...props} />
      <Toast.Portal>
        <Toast.Viewport
          role={silent ? 'region' : 'status'}
          aria-live={silent ? 'off' : 'polite'}
          className="fixed inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-50 lg:inset-x-auto lg:bottom-6 lg:left-1/2 lg:w-[calc(100vw-48px)] lg:max-w-[480px] lg:-translate-x-1/2"
        >
          <UndoToasts />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

/** Mirrors the provider's single toast into the Base UI toast manager. */
function ToastSync({ toast, timeout, onClosed, onUndo }: UndoToasterProps) {
  const manager = Toast.useToastManager()
  // Base UI toast id per provider key, for toasts still on screen.
  const shown = useRef(new Map<number, string>())
  const callbacks = useRef({ onClosed, onUndo })
  useEffect(() => {
    callbacks.current = { onClosed, onUndo }
  })

  useEffect(() => {
    // Anything that is not the current toast goes away (replaced or undone).
    for (const [key, id] of shown.current) {
      if (key !== toast?.key) {
        shown.current.delete(key)
        manager.close(id)
      }
    }
    if (!toast || shown.current.has(toast.key)) return
    const { key } = toast
    const id = manager.add({
      title: toast.label,
      timeout,
      actionProps: {
        children: 'Undo',
        onClick: () => callbacks.current.onUndo(key),
      },
      onClose: () => {
        shown.current.delete(key)
        callbacks.current.onClosed(key)
      },
    })
    shown.current.set(key, id)
  }, [toast, timeout, manager])

  return null
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
