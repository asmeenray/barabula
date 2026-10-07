import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { MotionConfig } from 'motion/react'
import { DRUM, SplitFlap, flapFrame } from '@/components/motion/SplitFlap'

// Split-flap text (16-20, D-30, UI-SPEC "Split-flap rules"): the real string
// in aria-label, flipping glyphs aria-hidden, final text at once under
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

describe('SplitFlap', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the final text at once under reduced motion, labelled with the text', () => {
    const { getByLabelText } = render(
      <MotionConfig reducedMotion="always">
        <SplitFlap text="LISBON" play />
      </MotionConfig>
    )
    const flap = getByLabelText('LISBON')
    expect(flap).toHaveTextContent(/^LISBON$/)
    expect(flap.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
  })

  it('flips aria-hidden glyphs, then settles on the plain text', () => {
    const { getByLabelText } = render(
      <MotionConfig reducedMotion="never">
        <SplitFlap text="LISBON" play />
      </MotionConfig>
    )
    const flap = getByLabelText('LISBON')
    const glyphs = flap.querySelectorAll('[data-glyph]')
    expect(glyphs).toHaveLength(6)
    glyphs.forEach((g) => expect(g).toHaveAttribute('aria-hidden', 'true'))

    // 9 frames × 34 ms, plus a frame to start and one to finish.
    act(() => {
      vi.advanceTimersByTime(9 * 34 + 64)
    })
    expect(flap.querySelectorAll('[data-glyph]')).toHaveLength(0)
    expect(flap).toHaveTextContent(/^LISBON$/)
    expect(flap).toHaveAttribute('aria-label', 'LISBON')
  })

  it('does not flip without play, and flips when the text changes while playing', () => {
    const { getByLabelText, rerender } = render(
      <MotionConfig reducedMotion="never">
        <SplitFlap text="WHERE TO NEXT?" play={false} />
      </MotionConfig>
    )
    expect(getByLabelText('WHERE TO NEXT?').querySelectorAll('[data-glyph]')).toHaveLength(0)

    rerender(
      <MotionConfig reducedMotion="never">
        <SplitFlap text="PORTO" play />
      </MotionConfig>
    )
    expect(getByLabelText('PORTO').querySelectorAll('[data-glyph]')).toHaveLength(5)
  })
})
