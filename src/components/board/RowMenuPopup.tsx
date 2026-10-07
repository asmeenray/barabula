'use client'

// The row "⋯" menu popup (UI-SPEC §9, D-22), loaded on first use by RowMenu
// so Base UI Menu stays out of the plan route's first-load JS (Q46 budget).
// The full keyboard and screen-reader path for every move. Order: Move to day… (Day 1…n, Maybe; current one
// disabled) · Move up · Move down · Move to Maybe (from Maybe: Move to a day…)
// · Edit place (16-11) · Remove from trip (danger). {Place} appears
// only in the trigger's accessible name. Offline (D-34) the whole menu is off.

import { useId } from 'react'
import { Menu } from '@base-ui/react/menu'
import { useCanEdit } from '@/lib/client/use-online'
import { ChevronRightIcon, MoreHorizontalIcon, Trash2Icon } from '@/components/icons'
import { ROW_MENU_TRIGGER, type RowMenuProps } from './RowMenu'

const POPUP =
  'min-w-56 max-w-[min(320px,calc(100vw-32px))] origin-[var(--transform-origin)] rounded-xl border border-line bg-surface py-1 text-ink shadow-[0_8px_24px_rgb(11_16_20/0.16)] outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none'

const ITEM =
  'flex min-h-11 cursor-default items-center gap-3 px-4 text-base outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-40 data-highlighted:bg-surface-2 data-popup-open:bg-surface-2'

/** One line with ellipsis; the full text stays in the DOM (accessible name). */
const LABEL = 'min-w-0 flex-1 truncate'

function DaySubmenu({
  label,
  dayCount,
  current,
  includeMaybe,
  onPick,
}: {
  label: string
  dayCount: number
  current: number | null
  includeMaybe: boolean
  onPick: (day: number | null) => void
}) {
  const days = Array.from({ length: Math.max(1, dayCount) }, (_, i) => i + 1)
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger className={ITEM}>
        <span className={LABEL}>{label}</span>
        <ChevronRightIcon size={16} className="shrink-0 text-board-muted" />
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50 outline-none" sideOffset={4} collisionPadding={16}>
          {/* Past 8 items the list scrolls inside the menu (UI-SPEC overflow). */}
          <Menu.Popup className={`${POPUP} max-h-[320px] overflow-y-auto overscroll-contain`}>
            {days.map((d) => (
              <Menu.Item key={d} className={ITEM} disabled={d === current} onClick={() => onPick(d)}>
                <span className={LABEL}>Day {d}</span>
              </Menu.Item>
            ))}
            {includeMaybe && (
              <Menu.Item className={ITEM} disabled={current === null} onClick={() => onPick(null)}>
                <span className={LABEL}>Maybe</span>
              </Menu.Item>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  )
}

export default function RowMenuPopup({
  placeName,
  day,
  dayCount,
  move,
  moveUp,
  moveDown,
  remove,
  edit,
  locked = false,
  className = '',
  defaultOpen = false,
}: RowMenuProps & { defaultOpen?: boolean }) {
  const canEdit = useCanEdit() && !locked
  const inMaybe = day === null
  const triggerId = useId()

  return (
    <Menu.Root disabled={!canEdit} defaultOpen={defaultOpen && canEdit} defaultTriggerId={triggerId}>
      <Menu.Trigger id={triggerId} aria-label={`Actions for ${placeName}`} className={`${ROW_MENU_TRIGGER} ${className}`}>
        <MoreHorizontalIcon />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50 outline-none" side="bottom" align="end" sideOffset={4} collisionPadding={16}>
          <Menu.Popup className={POPUP}>
            <DaySubmenu label="Move to day…" dayCount={dayCount} current={day} includeMaybe onPick={move} />
            <Menu.Item className={ITEM} disabled={!moveUp} onClick={moveUp}>
              <span className={LABEL}>Move up</span>
            </Menu.Item>
            <Menu.Item className={ITEM} disabled={!moveDown} onClick={moveDown}>
              <span className={LABEL}>Move down</span>
            </Menu.Item>
            {inMaybe ? (
              <DaySubmenu
                label="Move to a day…"
                dayCount={dayCount}
                current={day}
                includeMaybe={false}
                onPick={move}
              />
            ) : (
              <Menu.Item className={ITEM} onClick={() => move(null)}>
                <span className={LABEL}>Move to Maybe</span>
              </Menu.Item>
            )}
            <Menu.Item className={ITEM} disabled={!edit} onClick={edit}>
              <span className={LABEL}>Edit place</span>
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-line" />
            <Menu.Item className={`${ITEM} text-danger`} disabled={!remove} onClick={remove}>
              <Trash2Icon className="shrink-0" />
              <span className={LABEL}>Remove from trip</span>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
