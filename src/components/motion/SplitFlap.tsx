'use client'

// Split-flap text (UI-SPEC Motion Contract, "Split-flap rules", D-30). Each
// character steps through the drum (A–Z and space) toward its target, 9 frames
// × 34 ms by default, then the text settles as plain text again. Only for the
// signature moments, the Now/Next title once per visit and the LOADING row;
// never on body text, lists in general or anything typed.
//
// Screen readers get the real string as text: plain text at rest, and one
// sr-only copy while flipping (no aria-label: ARIA 1.2 prohibits it on a plain
// span, axe 16-24). While flipping, each
// glyph is aria-hidden and sized by its final character (an invisible copy),
// so nothing reflows; the frames are written straight into the glyph faces
// from one requestAnimationFrame loop (no React state per frame). Each glyph
// also turns in (opacity + rotateX) through the CSS keyframe flap-glyph: the
// plan route uses this, and Motion's runtime would cost it ~50 KB (Q63). Under
// reduced motion (MotionConfig reducedMotion="user") the final text shows at
// once. A flip runs when `play` is truthy on mount, when it changes to another
// truthy value, or when the text changes while it is truthy. `play` must be
// falsy on the server render (flips start on the client only).
//
// Tiles mode (quick 261007-wms, laptop only): given `tiles` (the text as at
// most two rows, src/lib/pass/tiles.ts), each character sits in its own
// see-through flap tile at rest and while flipping, on the same boxes. Every
// tile style is behind lg:; below it rows, words and resting tiles are
// display: contents, so the phone shows today's plain text (and today's
// glyphs while flipping). Spaces stay real text, so the text reads the same.

import { Fragment, useEffect, useRef, useState } from 'react'
import { useReducedMotionConfig } from 'motion/react'

export const DRUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ '

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
export function flapFrame(text: string, frame: number, frames: number, cascade = 0): string {
  if (frame >= flapLength(text, frames, cascade) - 1) return text
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    // With a cascade, character i lands `cascade` frames after the one before
    // it, so the text settles left to right like an arrival board.
    const left = frames + i * cascade - 1 - frame
    if (ch === ' ' || left <= 0) {
      out += ch
      continue
    }
    const at = DRUM.indexOf(ch.toUpperCase())
    const n = DRUM.length
    out += at >= 0 ? DRUM[(((at - left) % n) + n) % n] : DRUM[(i * 7 + frame) % 26]
  }
  return out
}

/** Frames until the last character lands. */
export function flapLength(text: string, frames: number, cascade = 0): number {
  return frames + Math.max(0, text.length - 1) * cascade
}

type Props = {
  text: string
  /** Truthy flips (see above); a new truthy value (e.g. a counter) flips again. */
  play?: unknown
  /** Wait before the first frame (staggers). */
  delayMs?: number
  frameMs?: number
  frames?: number
  /** Extra frames per character: the text settles left to right (arrival board). */
  cascade?: number
  className?: string
  title?: string
  /** Tiles mode: the text as rows (joined by single spaces they must equal the text). */
  tiles?: readonly string[] | null
}

// One flap tile at lg (Asmeen's option A): 46 × 64, 4 px radius, dark glass
// with a 6 px backdrop blur, a 1 px light border and a dark hairline across
// the middle (rgba(5,8,12,.6), the tile colour at a stronger alpha);
// Geist Mono 600 50 px white.
const TILE_LG =
  "lg:relative lg:inline-flex lg:h-16 lg:w-[46px] lg:shrink-0 lg:items-center lg:justify-center lg:rounded-[4px] lg:border lg:border-[rgba(255,255,255,.12)] lg:bg-[rgba(5,8,12,.42)] lg:font-mono lg:text-[50px] lg:leading-none lg:font-semibold lg:tracking-normal lg:text-white lg:backdrop-blur-[6px] lg:after:pointer-events-none lg:after:absolute lg:after:inset-x-0 lg:after:top-1/2 lg:after:h-px lg:after:bg-[rgba(5,8,12,.6)] lg:after:content-['']"
const ROW_LG = 'contents lg:flex lg:gap-[18px]'
const WORD_LG = 'lg:inline-flex lg:gap-1'

/** Rows of words, each word with the index of its first character in the text. */
function tileWords(rows: readonly string[]): { word: string; start: number }[][] {
  let at = 0
  return rows.map((row) =>
    row.split(' ').map((word) => {
      const start = at
      at += word.length + 1
      return { word, start }
    })
  )
}

export function SplitFlap({
  text,
  play = true,
  delayMs = 0,
  frameMs = 34,
  frames = 9,
  cascade = 0,
  className,
  title,
  tiles,
}: Props) {
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
      if (frame >= flapLength(text, frames, cascade) - 1) {
        setSeen((s) => (s.run === run ? { ...s, flipping: false } : s))
        return
      }
      if (frame >= 0) {
        const chars = flapFrame(text, frame, frames, cascade)
        faces.current.forEach((el, i) => {
          if (el && el.textContent !== chars[i]) el.textContent = chars[i]
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // Hidden tabs get no frames, so the loop also stops while hidden (T-16-57).
    return () => cancelAnimationFrame(raf)
  }, [flipping, seen.run, text, delayMs, frameMs, frames, cascade])

  const rows = tiles && tiles.length > 0 && tiles.join(' ') === text ? tileWords(tiles) : null

  if (!flipping) {
    if (rows) {
      return (
        <span data-flap="" title={title} className={`${className ?? ''} lg:flex lg:flex-col lg:items-start lg:gap-1`}>
          {rows.map((words, r) => (
            <Fragment key={r}>
              {r > 0 && ' '}
              <span data-tile-row="" className={ROW_LG}>
                {words.map(({ word }, w) => (
                  <Fragment key={w}>
                    {w > 0 && ' '}
                    <span className={`contents ${WORD_LG}`}>
                      {word.split('').map((ch, k) => (
                        <span key={k} data-tile="" className={`contents ${TILE_LG}`}>
                          {ch}
                        </span>
                      ))}
                    </span>
                  </Fragment>
                ))}
              </span>
            </Fragment>
          ))}
        </span>
      )
    }
    return (
      <span data-flap="" title={title} className={className}>
        {text}
      </span>
    )
  }

  const first = flapFrame(text, 0, frames, cascade)
  const total = flapLength(text, frames, cascade) * frameMs

  /** One flipping glyph (sized by its final character); a flap tile at lg in tiles mode. */
  const glyph = (ch: string, i: number, k: number, tile: boolean) => (
    <span
      key={k}
      data-glyph=""
      data-tile={tile ? '' : undefined}
      aria-hidden="true"
      className={`relative inline-block animate-[flap-glyph_var(--ease-out)_both]${tile ? ` ${TILE_LG}` : ''}`}
      style={{ animationDuration: `${total}ms`, animationDelay: `${delayMs}ms` }}
    >
      <span className="invisible">{ch}</span>
      <span
        ref={(el) => {
          faces.current[i] = el
        }}
        className={`absolute inset-0 text-center whitespace-pre${tile ? ' lg:flex lg:items-center lg:justify-center' : ''}`}
      >
        {first[i]}
      </span>
    </span>
  )

  if (rows) {
    return (
      <span data-flap="" title={title} className={`${className ?? ''} lg:flex lg:flex-col lg:items-start lg:gap-1`}>
        <span className="sr-only">{text}</span>
        {rows.map((words, r) => (
          <Fragment key={r}>
            {r > 0 && ' '}
            <span data-tile-row="" aria-hidden="true" className={ROW_LG}>
              {words.map(({ word, start }, w) => (
                <Fragment key={w}>
                  {w > 0 && ' '}
                  <span className={`whitespace-nowrap ${WORD_LG}`}>
                    {word.split('').map((ch, k) => glyph(ch, start + k, k, true))}
                  </span>
                </Fragment>
              ))}
            </span>
          </Fragment>
        ))}
      </span>
    )
  }
  // Each word with the index of its first character in the text.
  const words: { word: string; start: number }[] = []
  for (let at = 0; at <= text.length; ) {
    const end = text.indexOf(' ', at)
    const stop = end < 0 ? text.length : end
    words.push({ word: text.slice(at, stop), start: at })
    at = stop + 1
  }
  return (
    <span data-flap="" title={title} className={className}>
      <span className="sr-only">{text}</span>
      {words.map(({ word, start }, w) => {
        return (
          <span key={w}>
            {w > 0 && ' '}
            {/* Words never break inside while flipping; lines still wrap at spaces. */}
            <span aria-hidden="true" className="whitespace-nowrap">
              {word.split('').map((ch, k) => glyph(ch, start + k, k, false))}
            </span>
          </span>
        )
      })}
    </span>
  )
}

/**
 * A board cell that flips in (rotateX 80° → 0, 260 ms, CSS keyframe flap-cell)
 * each time `flip` changes to a new truthy value; plain children otherwise and
 * under reduced motion.
 */
export function FlipIn({ flip, delayMs = 0, children }: { flip: unknown; delayMs?: number; children: React.ReactNode }) {
  const reduced = useReducedMotionConfig() === true
  if (!flip || reduced) return <>{children}</>
  return (
    <span
      key={String(flip)}
      className="inline-block animate-[flap-cell_var(--ease-out)_both]"
      style={{ animationDuration: `${BOARD_FLIP.cellMs}ms`, animationDelay: `${delayMs}ms` }}
    >
      {children}
    </span>
  )
}
