'use client'

// The trip plan's Add place opener (UI-SPEC §7 item 8, §8, accent item 5).
// Phone: an accent FAB, 48 high, 16 px from the panel's right and bottom
// (the board keeps 96 px of bottom padding so it never covers the last row).
// Laptop: an accent bar sticky at the bottom of the list column. Pressing it
// opens the place form, which loads on first use (hover and focus warm it).

import { forwardRef, lazy } from 'react'
import { useCanEdit } from '@/lib/client/use-online'
import { PlusIcon } from '@/components/icons'

const loadForm = () => import('./PlaceForm')
/** The place form (Drawer, Select, Switch, Field), loaded on first use (Q46 JS budget). */
export const LazyPlaceForm = lazy(loadForm)

export function preloadPlaceForm() {
  void loadForm().catch(() => {})
}

const ACCENT =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-accent px-4 font-label text-base font-semibold tracking-[0.08em] text-on-accent uppercase transition-[background-color,transform] duration-150 ease-out'
const ENABLED = 'hover:bg-[color-mix(in_oklab,var(--accent)_88%,#000)] active:scale-[0.97]'
const DISABLED = 'cursor-not-allowed opacity-40'

interface AddPlaceButtonProps {
  variant: 'fab' | 'bar'
  onOpen: () => void
  className?: string
}

export const AddPlaceButton = forwardRef<HTMLButtonElement, AddPlaceButtonProps>(function AddPlaceButton(
  { variant, onOpen, className = '' },
  ref
) {
  const canEdit = useCanEdit()
  const shape =
    variant === 'fab' ? 'shadow-[0_8px_20px_-6px_rgba(10,20,30,.35)]' : 'w-full'
  return (
    <button
      ref={ref}
      type="button"
      aria-disabled={!canEdit || undefined}
      onPointerEnter={preloadPlaceForm}
      onFocus={preloadPlaceForm}
      onClick={() => {
        // Offline (D-34): stays focusable, explained by the banner, does nothing.
        if (canEdit) onOpen()
      }}
      className={`${ACCENT} ${canEdit ? ENABLED : DISABLED} ${shape} ${className}`}
    >
      <PlusIcon />
      Add place
    </button>
  )
})
