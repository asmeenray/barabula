'use client'

// The trip "⋯" menu popup (Base UI Menu), loaded on first use by TripMenu.
// One item: Delete trip (danger text + icon, UI-SPEC colour rule 6). Offline
// (D-34) the menu is off.

import { useId } from 'react'
import { Menu } from '@base-ui/react/menu'
import { useCanEdit } from '@/lib/client/use-online'
import { MoreHorizontalIcon, Trash2Icon } from '@/components/icons'
import { ROW_MENU_TRIGGER } from './RowMenu'

const POPUP =
  'min-w-56 max-w-[min(320px,calc(100vw-32px))] origin-[var(--transform-origin)] rounded-xl border border-line bg-surface py-1 text-ink shadow-[0_8px_24px_rgb(11_16_20/0.16)] outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none'

const ITEM =
  'flex min-h-11 cursor-default items-center gap-3 px-4 text-base outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-40 data-highlighted:bg-surface-2'

export default function TripMenuPopup({ onDelete, defaultOpen = false }: { onDelete: () => void; defaultOpen?: boolean }) {
  const canEdit = useCanEdit()
  const triggerId = useId()
  return (
    <Menu.Root disabled={!canEdit} defaultOpen={defaultOpen && canEdit} defaultTriggerId={triggerId}>
      <Menu.Trigger id={triggerId} aria-label="Trip actions" className={ROW_MENU_TRIGGER}>
        <MoreHorizontalIcon />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50 outline-none" side="bottom" align="end" sideOffset={4} collisionPadding={16}>
          <Menu.Popup className={POPUP}>
            <Menu.Item className={`${ITEM} text-danger`} onClick={onDelete}>
              <Trash2Icon className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">Delete trip</span>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
