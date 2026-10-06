// Inline status lines (UI-SPEC Interaction States, D-32, D-33). Never a pop-up.
// DELAYED: accent chip + ink sentence + optional "Retry" text button.
// LOADING: a static board row here; the split-flap cycle arrives in 16-20.

interface BoardStatusLineProps {
  message: string
  onRetry?: () => void
  retryLabel?: string
  /** Offline (D-34): Retry stays visible but aria-disabled and inert. */
  retryDisabled?: boolean
  className?: string
}

export function BoardStatusLine({
  message,
  onRetry,
  retryLabel = 'Retry',
  retryDisabled = false,
  className,
}: BoardStatusLineProps) {
  return (
    <p
      role="status"
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-ink ${className ?? ''}`}
    >
      <span className="rounded-[4px] bg-accent px-2 py-1 font-label text-xs leading-none font-semibold tracking-[0.16em] text-on-accent uppercase">
        Delayed
      </span>
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          aria-disabled={retryDisabled || undefined}
          onClick={retryDisabled ? undefined : onRetry}
          className={`-my-2 min-h-11 px-1 font-semibold text-ink underline underline-offset-[3px] ${
            retryDisabled ? 'cursor-not-allowed opacity-40' : ''
          }`}
        >
          {retryLabel}
        </button>
      )}
    </p>
  )
}

export function BoardLoadingRow({ label = 'Loading…' }: { label?: string }) {
  return (
    <p
      role="status"
      className="flex min-h-14 items-center border-b border-board-line px-4 font-mono text-base font-semibold text-board-muted uppercase"
    >
      {label}
    </p>
  )
}
