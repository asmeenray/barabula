'use client'

// One printed line on a pass (UI-SPEC §3 "Stamp lines"): Label (TO / WHEN /
// WHO / INTO) + Mono 16 value + an "Edit" text button, 44 px high, dashed
// separator underneath. The Edit button's hit area covers the whole line, so
// "Tap any line to change it." holds, while its accessible name stays specific
// ("Edit dates"). Values are sentence case; CSS sets the uppercase.
// Moment 1 "pass prints itself" (D-30): with `print`, a new line rises 8 px
// and fades in (240 ms, ease-out) and its value split-flaps, again whenever
// the value changes. Reduced motion: the line and value appear at once.
// Read-only lines (Now/Next) do not move.

import { m, useReducedMotionConfig } from 'motion/react'
import { SplitFlap } from '@/components/motion/SplitFlap'

type Props = {
  label: string
  value: string
  /** Accessible name of the Edit button, e.g. "Edit destination". */
  editName: string
  onEdit?: () => void
  /** The blank pass prints this line (moment 1). */
  print?: boolean
}

const LINE =
  'relative grid min-h-11 grid-cols-[56px_1fr_auto] items-center gap-2 border-b-[1.5px] border-dashed border-perf transition-colors duration-[120ms] has-[button:hover]:bg-surface-2'
const VALUE = 'min-w-0 truncate font-mono text-base leading-tight font-semibold uppercase tabular-nums'
const EASE_OUT = [0.23, 1, 0.32, 1] as const

export function StampLine({ label, value, editName, onEdit, print = false }: Props) {
  const reduced = useReducedMotionConfig() === true
  const body = (
    <>
      <span className="font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-muted uppercase">
        {label}
      </span>
      {print ? (
        <SplitFlap text={value} title={value} className={VALUE} />
      ) : (
        <span className={VALUE} title={value}>
          {value}
        </span>
      )}
      {onEdit && (
        <button
          type="button"
          aria-label={editName}
          onClick={onEdit}
          className="min-h-11 px-1 font-semibold text-ink underline underline-offset-[3px] after:absolute after:inset-0 after:content-['']"
        >
          Edit
        </button>
      )}
    </>
  )

  if (!print || reduced) return <div className={LINE}>{body}</div>
  return (
    <m.div
      className={LINE}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT }}
    >
      {body}
    </m.div>
  )
}
