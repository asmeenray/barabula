import type { Chip } from '@/lib/plan/board'

// Board status chip (UI-SPEC §7, Typography "Label"). Words stay in sentence
// case in the DOM; CSS sets them uppercase. NEXT is the board's one accent.

const LABEL: Record<Chip, string> = {
  NEXT: 'Next',
  LATER: 'Later',
  VISITED: 'Visited',
  MAYBE: 'Maybe',
}

const STYLE: Record<Chip, string> = {
  NEXT: 'border-accent bg-accent text-on-accent',
  LATER: 'border-board-line text-board-muted',
  VISITED: 'border-transparent text-visited',
  MAYBE: 'border-board-muted text-board-muted',
}

export function StatusChip({ chip }: { chip: Chip }) {
  return (
    <span
      data-chip={chip}
      className={`inline-flex h-6 items-center rounded-[4px] border px-1.5 font-label text-xs leading-none font-semibold tracking-[0.16em] whitespace-nowrap uppercase ${STYLE[chip]}`}
    >
      {LABEL[chip]}
    </span>
  )
}
