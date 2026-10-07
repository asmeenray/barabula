// One printed line on a pass (UI-SPEC §3 "Stamp lines"): Label (TO / WHEN /
// WHO / INTO) + Mono 16 value + an "Edit" text button, 44 px high, dashed
// separator underneath. The Edit button's hit area covers the whole line, so
// "Tap any line to change it." holds, while its accessible name stays specific
// ("Edit dates"). Values are sentence case; CSS sets the uppercase.

type Props = {
  label: string
  value: string
  /** Accessible name of the Edit button, e.g. "Edit destination". */
  editName: string
  onEdit?: () => void
}

export function StampLine({ label, value, editName, onEdit }: Props) {
  return (
    <div className="relative grid min-h-11 grid-cols-[56px_1fr_auto] items-center gap-2 border-b-[1.5px] border-dashed border-perf transition-colors duration-[120ms] has-[button:hover]:bg-surface-2 motion-safe:animate-[ticket-in_240ms_var(--ease-out)]">
      <span className="font-label text-xs leading-[1.33] font-semibold tracking-[0.16em] text-muted uppercase">
        {label}
      </span>
      <span className="min-w-0 truncate font-mono text-base leading-tight font-semibold uppercase tabular-nums" title={value}>
        {value}
      </span>
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
    </div>
  )
}
