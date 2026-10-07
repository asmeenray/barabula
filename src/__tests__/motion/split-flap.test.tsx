import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { MotionConfig } from 'motion/react'
import { DRUM, SplitFlap, flapFrame, flapLength } from '@/components/motion/SplitFlap'

// Split-flap text (16-20, D-30, UI-SPEC "Split-flap rules"): the real string
// as text (sr-only copy while flipping), flipping glyphs aria-hidden, final text at once under
// reduced motion.

describe('flapFrame', () => {
  it('lands on the target on the last frame', () => {
    expect(flapFrame('LISBON', 8, 9)).toBe('LISBON')
    expect(flapFrame('Lisbon → Porto', 8, 9)).toBe('Lisbon → Porto')
  })

  it('shows other drum letters before the last frame and keeps spaces in place', () => {
    const first = flapFrame('LIS BON', 0, 9)
    expect(first).toHaveLength(7)
    expect(first).not.toBe('LIS BON')
    expect(first[3]).toBe(' ')
    for (const ch of first) expect(DRUM).toContain(ch)
  })

  it('steps each letter one drum place per frame toward its target', () => {
    // 'C' is 2 places after 'A'; one frame before the end it shows 'B'.
    expect(flapFrame('C', 7, 9)).toBe('B')
    expect(flapFrame('C', 6, 9)).toBe('A')
  })
})

/** The flap's container (data-flap). */
function flapIn(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>('[data-flap]')
  if (!el) throw new Error('no [data-flap] element')
  return el
}

describe('SplitFlap', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the final text at once under reduced motion, as plain text', () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <SplitFlap text="LISBON" play />
      </MotionConfig>
    )
    const flap = flapIn(container)
    expect(flap).not.toHaveAttribute('aria-label')
    expect(flap).toHaveTextContent(/^LISBON$/)
    expect(flap.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
  })

  it('flips aria-hidden glyphs, then settles on the plain text', () => {
    const { container } = render(
      <MotionConfig reducedMotion="never">
        <SplitFlap text="LISBON" play />
      </MotionConfig>
    )
    const flap = flapIn(container)
    // While flipping, screen readers get one sr-only copy of the real text.
    const copy = flap.querySelector('.sr-only')
    expect(copy).toHaveTextContent(/^LISBON$/)
    expect(copy).not.toHaveAttribute('aria-hidden')
    expect(flap).not.toHaveAttribute('aria-label')
    const glyphs = flap.querySelectorAll('[data-glyph]')
    expect(glyphs).toHaveLength(6)
    glyphs.forEach((g) => expect(g).toHaveAttribute('aria-hidden', 'true'))

    // 9 frames × 34 ms, plus a frame to start and one to finish.
    act(() => {
      vi.advanceTimersByTime(9 * 34 + 64)
    })
    expect(flap.querySelectorAll('[data-glyph]')).toHaveLength(0)
    expect(flapIn(container)).toHaveTextContent(/^LISBON$/)
    expect(flapIn(container).querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
  })

  it('does not flip without play, and flips when the text changes while playing', () => {
    const { container, rerender } = render(
      <MotionConfig reducedMotion="never">
        <SplitFlap text="WHERE TO NEXT?" play={false} />
      </MotionConfig>
    )
    expect(flapIn(container)).toHaveTextContent(/^WHERE TO NEXT\?$/)
    expect(flapIn(container).querySelectorAll('[data-glyph]')).toHaveLength(0)

    rerender(
      <MotionConfig reducedMotion="never">
        <SplitFlap text="PORTO" play />
      </MotionConfig>
    )
    expect(flapIn(container).querySelectorAll('[data-glyph]')).toHaveLength(5)
  })
})

describe('flapFrame with a cascade (arrival board)', () => {
  it('lands characters left to right, one cascade step apart', () => {
    const text = 'ABC'
    // frames 3, cascade 2: A lands at frame 2, B at 4, C at 6 (flapLength 7).
    expect(flapLength(text, 3, 2)).toBe(7)
    expect(flapFrame(text, 2, 3, 2)[0]).toBe('A')
    expect(flapFrame(text, 2, 3, 2)[1]).not.toBe('B')
    expect(flapFrame(text, 4, 3, 2).slice(0, 2)).toBe('AB')
    expect(flapFrame(text, 4, 3, 2)[2]).not.toBe('C')
    expect(flapFrame(text, 6, 3, 2)).toBe('ABC')
  })

  it('keeps spaces in place and matches the old behaviour without a cascade', () => {
    expect(flapFrame('A B', 0, 5, 1)[1]).toBe(' ')
    expect(flapFrame('WHERE TO', 3, 9)).toBe(flapFrame('WHERE TO', 3, 9, 0))
    expect(flapLength('WHERE TO', 9)).toBe(9)
  })
})

// Tiles mode (quick 261007-wms, A-1/A-2): the laptop blank-pass title in rows
// of flap tiles, at rest and while flipping; plain text below lg.
describe('SplitFlap tiles', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const ROWS = ['Where to', 'next?'] as const

  it('at rest: one tile per character in one row per row, the text as text', () => {
    const { container } = render(
      <MotionConfig reducedMotion="never">
        <SplitFlap text="Where to next?" tiles={ROWS} play={false} />
      </MotionConfig>
    )
    const flap = flapIn(container)
    expect(flap.querySelectorAll('[data-tile]')).toHaveLength(12)
    expect(flap.querySelectorAll('[data-glyph]')).toHaveLength(0)
    expect(flap.querySelectorAll('[data-tile-row]')).toHaveLength(2)
    expect(flap.textContent).toBe('Where to next?')
    // Every tile style is laptop only; below lg the tiles are plain text.
    const tile = flap.querySelector('[data-tile]')!
    expect(tile).toHaveClass('contents')
    for (const c of tile.className.split(/\s+/).filter((c) => c && c !== 'contents')) expect(c).toMatch(/^lg:/)
  })

  it('under reduced motion shows the resting tiles at once', () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <SplitFlap text="Where to next?" tiles={ROWS} play frames={10} frameMs={40} cascade={2} />
      </MotionConfig>
    )
    const flap = flapIn(container)
    expect(flap.querySelectorAll('[data-tile]')).toHaveLength(12)
    expect(flap.querySelectorAll('[data-glyph]')).toHaveLength(0)
    expect(flap.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
  })

  it('while flipping: aria-hidden glyph tiles and an sr-only copy, then the resting tiles', () => {
    const { container } = render(
      <MotionConfig reducedMotion="never">
        <SplitFlap text="Where to next?" tiles={ROWS} play frames={10} frameMs={40} cascade={2} />
      </MotionConfig>
    )
    const flap = flapIn(container)
    expect(flap.querySelector('.sr-only')).toHaveTextContent(/^Where to next\?$/)
    const glyphs = flap.querySelectorAll('[data-glyph]')
    expect(glyphs).toHaveLength(12)
    glyphs.forEach((g) => {
      expect(g).toHaveAttribute('data-tile')
      expect(g.closest('[aria-hidden="true"]')).not.toBeNull()
    })
    expect(flap.querySelectorAll('[data-tile-row]')).toHaveLength(2)

    // 10 frames + 13 × 2 cascade frames, × 40 ms, plus a frame to start and one to finish.
    act(() => {
      vi.advanceTimersByTime((10 + 13 * 2) * 40 + 100)
    })
    const rest = flapIn(container)
    expect(rest.querySelectorAll('[data-glyph]')).toHaveLength(0)
    expect(rest.querySelectorAll('[data-tile]')).toHaveLength(12)
    expect(rest.textContent).toBe('Where to next?')
  })

  it('ignores rows that do not spell the text (plain flap)', () => {
    const { container } = render(
      <MotionConfig reducedMotion="never">
        <SplitFlap text="Lisbon" tiles={['Porto']} play={false} />
      </MotionConfig>
    )
    expect(flapIn(container).querySelectorAll('[data-tile]')).toHaveLength(0)
    expect(flapIn(container)).toHaveTextContent(/^Lisbon$/)
  })
})
