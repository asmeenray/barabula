// "Barabula." wordmark. Text for now; 16-06 swaps in the traced SVG with the
// same props (role img, aria-label Barabula, navy token).

interface WordmarkProps {
  className?: string
}

export function Wordmark({ className }: WordmarkProps) {
  return (
    <span
      role="img"
      aria-label="Barabula"
      className={`font-label text-[22px] leading-none font-semibold tracking-[-0.01em] text-navy select-none ${className ?? ''}`}
    >
      Barabula.
    </span>
  )
}
