import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import { MotionConfig } from 'motion/react'
import { LoadingRow, useDelayedFlag } from '@/components/motion/LoadingRow'

// The LOADING board row (16-20, D-32): shown only after 300 ms, then kept for
// at least 400 ms so it never flashes.

describe('useDelayedFlag', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('stays false for the first 300 ms, then turns true', () => {
    const { result } = renderHook(({ active }) => useDelayedFlag(active), { initialProps: { active: true } })
    expect(result.current).toBe(false)
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current).toBe(false)
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe(true)
  })

  it('never shows when loading ends before 300 ms', () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active), { initialProps: { active: true } })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    rerender({ active: false })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBe(false)
  })

  it('once shown, stays at least 400 ms after loading ends', () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active), { initialProps: { active: true } })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe(true)
    rerender({ active: false })
    act(() => {
      vi.advanceTimersByTime(399)
    })
    expect(result.current).toBe(true)
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe(false)
  })

  it('hides at once when it has already been shown for 400 ms', () => {
    const { result, rerender } = renderHook(({ active }) => useDelayedFlag(active), { initialProps: { active: true } })
    act(() => {
      vi.advanceTimersByTime(300 + 500)
    })
    rerender({ active: false })
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toBe(false)
  })
})

describe('LoadingRow', () => {
  it('is a status row with static text under reduced motion', () => {
    render(
      <MotionConfig reducedMotion="always">
        <LoadingRow label="LOADING MAP…" />
      </MotionConfig>
    )
    const row = screen.getByRole('status')
    expect(row).toHaveTextContent('LOADING MAP…')
    expect(row.querySelectorAll('[data-glyph]')).toHaveLength(0)
  })

  it('defaults to LOADING…', () => {
    render(
      <MotionConfig reducedMotion="always">
        <LoadingRow />
      </MotionConfig>
    )
    expect(screen.getByRole('status')).toHaveTextContent('LOADING…')
  })
})
