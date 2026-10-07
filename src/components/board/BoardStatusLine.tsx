// Inline status lines (UI-SPEC Interaction States, D-32, D-33). Never a pop-up.
// DELAYED: accent chip + ink sentence + optional "Retry" text button.
// LOADING: the split-flap board row (LoadingRow, 16-20); callers show it
// through useDelayedFlag / DelayedLoadingRow (after 300 ms, at least 400 ms).

import { LoadingRow } from '@/components/motion/LoadingRow'

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

/** The LOADING variant: a board row that split-flaps (static under reduced motion). */
export function BoardLoadingRow({ label = 'LOADING…' }: { label?: string }) {
  return <LoadingRow label={label} />
}
