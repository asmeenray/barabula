'use client'

// The trip "⋯" menu in the plan's top bar (UI-SPEC §7 top bar, §9 Delete trip,
// D-27): trigger "Trip actions", one item "Delete trip" in the danger colour.
// Like the row menu, the trigger is a plain button until first use; pressing
// it loads TripMenuPopup (Base UI Menu), so the menu stays out of the plan
// route's first-load JS. Choosing Delete trip goes back to Trips at once and
// starts the 10 s Undo; there is no confirm dialog.

import { lazy, Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUndo } from '@/components/undo/UndoProvider'
import { useCanEdit } from '@/lib/client/use-online'
import { deleteTrip } from '@/lib/plan/delete-trip'
import { MoreHorizontalIcon } from '@/components/icons'
import { ROW_MENU_TRIGGER } from './RowMenu'

const loadPopup = () => import('./TripMenuPopup')
const TripMenuPopup = lazy(loadPopup)

function preload() {
  void loadPopup().catch(() => {})
}

const OPEN_KEYS = new Set(['Enter', ' ', 'ArrowDown', 'ArrowUp'])

export function TripMenu({ tripId, city }: { tripId: string; city: string }) {
  const canEdit = useCanEdit()
  const [active, setActive] = useState(false)
  const { run } = useUndo()
  const router = useRouter()

  function onDelete() {
    // Hide and hold first, then leave: the home never shows the pass.
    deleteTrip({ id: tripId, city, run, refresh: () => router.refresh() })
    router.push('/')
  }

  const placeholder = (
    <button
      type="button"
      aria-label="Trip actions"
      aria-haspopup="menu"
      aria-expanded={false}
      aria-disabled={!canEdit || undefined}
      data-disabled={!canEdit ? '' : undefined}
      className={ROW_MENU_TRIGGER}
      onPointerEnter={preload}
      onFocus={preload}
      onClick={() => {
        if (canEdit) setActive(true)
      }}
      onKeyDown={(e) => {
        if (!canEdit || !OPEN_KEYS.has(e.key)) return
        e.preventDefault()
        setActive(true)
      }}
    >
      <MoreHorizontalIcon />
    </button>
  )

  if (!active) return placeholder
  return (
    <Suspense fallback={placeholder}>
      <TripMenuPopup onDelete={onDelete} defaultOpen />
    </Suspense>
  )
}
