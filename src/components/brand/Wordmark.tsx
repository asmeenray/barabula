import { WORDMARK_PATH, WORDMARK_VIEWBOX } from './wordmark-path'

// "Barabula." wordmark: one SVG path traced from Abril Fatface
// (scripts/trace-wordmark.mjs), filled with the navy token. No font file ships.

const [, , VB_W, VB_H] = WORDMARK_VIEWBOX.split(' ').map(Number)

interface WordmarkProps {
  /** Rendered height in px (top bar: 20). */
  height?: number
  className?: string
}

export function Wordmark({ height = 20, className }: WordmarkProps) {
  return (
    <svg
      role="img"
      aria-label="Barabula"
      viewBox={WORDMARK_VIEWBOX}
      height={height}
      width={Math.round((height * VB_W) / VB_H)}
      className={`block shrink-0 fill-navy ${className ?? ''}`}
    >
      <path d={WORDMARK_PATH} />
    </svg>
  )
}
