'use client'

// Day tabs (UI-SPEC §7 item 3, Accessibility "Keyboard"). A tablist with a
// roving tabindex and manual activation: ArrowLeft/ArrowRight/Home/End move
// focus, Enter/Space select (native button click). "D{n}" + "TUE 12" when
// dated; MAYBE last with its count. Scrolls with snap past 5 tabs.

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { dayDate } from '@/lib/plan/board'
import type { DayKey } from '@/components/map/TripMap'

export type { DayKey }

export function dayKeyId(key: DayKey): string {
  return key === 'maybe' ? 'maybe' : String(key)
}

interface DayTabsProps {
  dayCount: number
  maybeCount: number
  startDate: string | null
  selected: DayKey
  onSelect: (key: DayKey) => void
  /** Prefix for tab ids, so a second (floating) tablist never repeats ids. */
  idPrefix?: string
  /** Panel id per tab; defaults to the board's day panels. */
  controls?: (key: DayKey) => string
  className?: string
}

export function DayTabs({
  dayCount,
  maybeCount,
  startDate,
  selected,
  onSelect,
  idPrefix = 'day-tab',
  controls = (key) => `day-panel-${dayKeyId(key)}`,
  className,
}: DayTabsProps) {
  const keys: DayKey[] = [...Array.from({ length: dayCount }, (_, i) => i + 1), 'maybe']
  const refs = useRef(new Map<string, HTMLButtonElement>())
  // Roving tabindex follows focus; it snaps back to the selected tab on change.
  const [focusKey, setFocusKey] = useState<DayKey>(selected)
  const [lastSelected, setLastSelected] = useState<DayKey>(selected)
  if (lastSelected !== selected) {
    setLastSelected(selected)
    setFocusKey(selected)
  }

  // Keep the selected tab in view when the strip scrolls (more than 5 days).
  useEffect(() => {
    refs.current.get(dayKeyId(selected))?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [selected])

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = Math.max(0, keys.findIndex((k) => k === focusKey))
    let next: number
    if (e.key === 'ArrowRight') next = (index + 1) % keys.length
    else if (e.key === 'ArrowLeft') next = (index - 1 + keys.length) % keys.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = keys.length - 1
    else return
    e.preventDefault()
    const key = keys[next]
    setFocusKey(key)
    const el = refs.current.get(dayKeyId(key))
    el?.focus()
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  return (
    <div
      role="tablist"
      aria-label="Days"
      onKeyDown={onKeyDown}
      className={`flex snap-x snap-mandatory scroll-px-4 gap-1.5 overflow-x-auto ${className ?? ''}`}
    >
      {keys.map((key) => {
        const id = dayKeyId(key)
        const isSelected = key === selected
        const date = key === 'maybe' ? null : dayDate(startDate, key)
        return (
          <button
            key={id}
            ref={(el) => {
              if (el) refs.current.set(id, el)
              else refs.current.delete(id)
            }}
            id={`${idPrefix}-${id}`}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={controls(key)}
            tabIndex={key === focusKey ? 0 : -1}
            onFocus={() => setFocusKey(key)}
            onClick={() => onSelect(key)}
            className={`flex h-12 min-w-16 flex-1 shrink-0 snap-start flex-col items-start justify-center rounded-[4px] border px-2 text-left transition-colors duration-150 ease-out ${
              isSelected ? 'border-board-ink bg-board-ink text-board' : 'border-board-line text-board-muted'
            }`}
          >
            {key === 'maybe' ? (
              <>
                <span className="font-label text-xs leading-none font-semibold tracking-[0.16em] uppercase">Maybe</span>
                <span className="mt-1 font-mono text-xs leading-none tabular-nums">{maybeCount}</span>
              </>
            ) : (
              <>
                <span className="font-mono text-base leading-none font-semibold tabular-nums">D{key}</span>
                {date && (
                  <span className="mt-1 font-label text-xs leading-none font-semibold tracking-[0.16em] whitespace-nowrap uppercase">
                    {date.weekday} {date.day}
                  </span>
                )}
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}
