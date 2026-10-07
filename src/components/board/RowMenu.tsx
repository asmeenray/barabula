'use client'

// The row "⋯" trigger (UI-SPEC §9, D-22). Until first use it is a plain button
// with the same look and name; pressing it (or Enter / Space / arrow keys)
// loads RowMenuPopup (Base UI Menu) and opens it. Hover and focus warm the
// chunk. This keeps Base UI Menu out of the plan route's first-load JS, which
// the Q46 budget (≤ 200 KB gzip) counts.

import { lazy, Suspense, useState } from 'react'
import { useCanEdit } from '@/lib/client/use-online'
import { MoreHorizontalIcon } from '@/components/icons'

/** What a row's menu can do; handlers left out render their item disabled. */
export interface RowActions {
  /** Number of days on the board (Day 1…n in the submenu). */
  dayCount: number
  move: (toDay: number | null) => void
  moveUp?: () => void
  moveDown?: () => void
  remove?: () => void
  /** The place is not saved yet (just added): the menu is off until it is. */
  locked?: boolean
}

export interface RowMenuProps extends RowActions {
  placeName: string
  /** The row's current day; null = Maybe. */
  day: number | null
  className?: string
}

export const ROW_MENU_TRIGGER =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-surface-2 active:scale-[0.97] data-disabled:cursor-not-allowed data-disabled:opacity-40 data-disabled:hover:bg-transparent data-popup-open:bg-surface-2'

const loadPopup = () => import('./RowMenuPopup')
const RowMenuPopup = lazy(loadPopup)

function preload() {
  void loadPopup().catch(() => {})
}

const OPEN_KEYS = new Set(['Enter', ' ', 'ArrowDown', 'ArrowUp'])

export function RowMenu(props: RowMenuProps) {
  const canEdit = useCanEdit() && !props.locked
  const [active, setActive] = useState(false)
  const label = `Actions for ${props.placeName}`

  const placeholder = (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={false}
      aria-disabled={!canEdit || undefined}
      data-disabled={!canEdit ? '' : undefined}
      className={`${ROW_MENU_TRIGGER} ${props.className ?? ''}`}
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
      <RowMenuPopup {...props} defaultOpen />
    </Suspense>
  )
}
