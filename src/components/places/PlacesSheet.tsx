'use client'

// The phone list sheet on the Places tab (UI-SPEC §10, Pitfall 14): a Base UI
// Drawer that is always open and non-modal, so the map stays usable under it.
// Snap points 148 px · 50% · 92% of the map area (the sheet is portalled into
// it, above the tab bar). It cannot be swiped or escaped away: any close
// request snaps it back to 148 px.

import { Drawer } from '@base-ui/react/drawer'

export const SNAP_PEEK = '148px'
export const SNAP_HALF = 0.5
export const SNAP_FULL = 0.92
export const SNAP_POINTS: Drawer.Root.SnapPoint[] = [SNAP_PEEK, SNAP_HALF, SNAP_FULL]

interface PlacesSheetProps {
  /** The map area the sheet lives in (snap points are fractions of its height). */
  container: React.RefObject<HTMLElement | null>
  snap: Drawer.Root.SnapPoint | null
  onSnapChange: (snap: Drawer.Root.SnapPoint) => void
  /** The heading that names the sheet (the list's), else a plain label (the open card's place). */
  labelledBy?: string
  label?: string
  children: React.ReactNode
}

export function PlacesSheet({ container, snap, onSnapChange, labelledBy, label, children }: PlacesSheetProps) {
  return (
    <Drawer.Root
      open
      modal={false}
      disablePointerDismissal
      snapPoints={SNAP_POINTS}
      snapPoint={snap}
      onSnapPointChange={(next) => onSnapChange(next ?? SNAP_PEEK)}
      // Swipe down past the lowest point, Escape: the sheet stays, at its peek.
      onOpenChange={(open) => {
        if (!open) onSnapChange(SNAP_PEEK)
      }}
    >
      <Drawer.Portal container={container}>
        <Drawer.Viewport className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center">
          <Drawer.Popup
            aria-labelledby={labelledBy}
            aria-label={labelledBy ? undefined : label}
            initialFocus={false}
            className="pointer-events-auto flex h-[92%] w-full flex-col rounded-t-2xl bg-board text-board-ink shadow-[0_-12px_40px_-12px_rgba(10,20,30,.4)] outline-none [padding-bottom:max(0px,calc(var(--drawer-snap-point-offset)+var(--drawer-swipe-movement-y)))] [transform:translateY(calc(var(--drawer-snap-point-offset)+var(--drawer-swipe-movement-y)))] transition-[transform,padding-bottom] duration-[400ms] ease-[var(--ease-sheet)] data-swiping:select-none data-swiping:duration-0 dark:border-t dark:border-line dark:shadow-none motion-reduce:transition-none"
          >
            <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line" />
            <Drawer.Content className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
