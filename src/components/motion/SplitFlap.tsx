'use client'

// Split-flap text (UI-SPEC Motion Contract, "Split-flap rules", D-30). Each
// character steps through the drum (A–Z and space) toward its target, 9 frames
// × 34 ms by default, then the text settles as plain text again. Only for the
// signature moments, the Now/Next title once per visit and the LOADING row;
// never on body text, lists in general or anything typed.
//
// The container carries the real string in aria-label. While flipping, each
// glyph is aria-hidden and sized by its final character (an invisible copy),
// so nothing reflows; the frames are written straight into the glyph faces
// from one requestAnimationFrame loop (no React state per frame). Under
// reduced motion (MotionConfig reducedMotion="user") the final text shows at
// once. A flip runs when `play` is truthy on mount, when it changes to another
// truthy value, or when the text changes while it is truthy. `play` must be
// falsy on the server render (flips start on the client only).

import { useEffect, useRef, useState } from 'react'
import { m, useReducedMotionConfig } from 'motion/react'

export const DRUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ '

const EASE_OUT = [0.23, 1, 0.32, 1] as const

/**
 * Moment 3 "day switch board flip" (D-30): the board head and the first 6
 * row names flip in 240 ms each (9 × 26 ms) with a 40 ms stagger; walk and
 * status cells flip in over 260 ms. The last row ends by 240 + 260 = 500 ms.
 */
export const BOARD_FLIP = { frames: 9, frameMs: 26, staggerMs: 40, rows: 6, cellMs: 260 } as const

/** Delay of board row i (0-based) in a day flip; null for rows that do not flip. */
export function boardFlipDelay(i: number): number | null {
  return i < BOARD_FLIP.rows ? (i + 1) * BOARD_FLIP.staggerMs : null
}

/**
 * The text shown at one frame. Letters step one drum place per frame and land
 * on the last frame; spaces stay put; other characters (digits, arrows,
 * accents) show drum letters until they land.
 */
export function flapFrame(text: string, frame: number, frames: number): string {
  const left = frames - 1 - frame
  if (left <= 0) return text
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === ' ') {
      out += ' '
      continue
    }
    const at = DRUM.indexOf(ch.toUpperCase())
    const n = DRUM.length
    out += at >= 0 ? DRUM[(((at - left) % n) + n) % n] : DRUM[(i * 7 + frame) % 26]
  }
  return out
}

type Props = {
  text: string
  /** Truthy flips (see above); a new truthy value (e.g. a counter) flips again. */
  play?: unknown
  /** Wait before the first frame (staggers). */
  delayMs?: number
  frameMs?: number
  frames?: number
  className?: string
  title?: string
}

export function SplitFlap({ text, play = true, delayMs = 0, frameMs = 34, frames = 9, className, title }: Props) {
  const reduced = useReducedMotionConfig() === true
  // Derived from the props of the last render (React's "adjust state when a
  // prop changes" pattern), so a flip starts in the same paint as the change.
  const [seen, setSeen] = useState(() => ({ text, play, run: 0, flipping: !!play }))
  if (seen.text !== text || seen.play !== play) {
    setSeen({ text, play, run: seen.run + 1, flipping: !!play })
  }
  const flipping = seen.flipping && !reduced
  const faces = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    if (!flipping) return
    let raf = 0
    let start = -1
    const run = seen.run
    const tick = (now: number) => {
      if (start < 0) start = now + delayMs
      const frame = Math.floor((now - start) / frameMs)
      if (frame >= frames - 1) {
        setSeen((s) => (s.run === run ? { ...s, flipping: false } : s))
        return
      }
      if (frame >= 0) {
        const chars = flapFrame(text, frame, frames)
        faces.current.forEach((el, i) => {
          if (el && el.textContent !== chars[i]) el.textContent = chars[i]
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // Hidden tabs get no frames, so the loop also stops while hidden (T-16-57).
    return () => cancelAnimationFrame(raf)
  }, [flipping, seen.run, text, delayMs, frameMs, frames])

  if (!flipping) {
    return (
      <span aria-label={text} title={title} className={className}>
        {text}
      </span>
    )
  }

  const first = flapFrame(text, 0, frames)
  const total = (frames * frameMs) / 1000
  // Each word with the index of its first character in the text.
  const words: { word: string; start: number }[] = []
  for (let at = 0; at <= text.length; ) {
    const end = text.indexOf(' ', at)
    const stop = end < 0 ? text.length : end
    words.push({ word: text.slice(at, stop), start: at })
    at = stop + 1
  }
  return (
    <span aria-label={text} title={title} className={className}>
      <span className="sr-only">{text}</span>
      {words.map(({ word, start }, w) => {
        return (
          <span key={w}>
            {w > 0 && ' '}
            {/* Words never break inside while flipping; lines still wrap at spaces. */}
            <span aria-hidden="true" className="whitespace-nowrap">
              {word.split('').map((ch, k) => {
                const i = start + k
                return (
                  <m.span
                    key={k}
                    data-glyph=""
                    aria-hidden="true"
                    className="relative inline-block"
                    initial={{ opacity: 0.4, rotateX: 70 }}
                    animate={{ opacity: 1, rotateX: 0 }}
                    transition={{ duration: total, delay: delayMs / 1000, ease: EASE_OUT }}
                  >
                    <span className="invisible">{ch}</span>
                    <span
                      ref={(el) => {
                        faces.current[i] = el
                      }}
                      className="absolute inset-0 text-center whitespace-pre"
                    >
                      {first[i]}
                    </span>
                  </m.span>
                )
              })}
            </span>
          </span>
        )
      })}
    </span>
  )
}

/**
 * A board cell that flips in (rotateX 80° → 0, 260 ms) each time `flip`
 * changes to a new truthy value; plain children otherwise and under reduced
 * motion.
 */
export function FlipIn({ flip, delayMs = 0, children }: { flip: unknown; delayMs?: number; children: React.ReactNode }) {
  const reduced = useReducedMotionConfig() === true
  if (!flip || reduced) return <>{children}</>
  return (
    <m.span
      key={String(flip)}
      className="inline-block"
      initial={{ rotateX: 80, opacity: 0.4 }}
      animate={{ rotateX: 0, opacity: 1 }}
      transition={{ duration: BOARD_FLIP.cellMs / 1000, delay: delayMs / 1000, ease: EASE_OUT }}
    >
      {children}
    </m.span>
  )
}
