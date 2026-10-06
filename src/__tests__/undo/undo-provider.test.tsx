import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { UndoProvider, useUndo, UNDO_TIMEOUT_MS, type UndoOp } from '@/components/undo/UndoProvider'

// The single Undo toast (Research Pattern 7, T-16-25): one pending op, commit
// once on close / next op / pagehide, Undo never commits.

function op(id: string, extra: Partial<UndoOp> = {}): UndoOp & { commit: ReturnType<typeof vi.fn>; undo: ReturnType<typeof vi.fn> } {
  return {
    id,
    label: `Moved ${id} to day 2`,
    commit: vi.fn(),
    undo: vi.fn(),
    ...extra,
  } as UndoOp & { commit: ReturnType<typeof vi.fn>; undo: ReturnType<typeof vi.fn> }
}

let api: ReturnType<typeof useUndo>

function Probe() {
  const value = useUndo()
  useEffect(() => {
    api = value
  })
  return <span data-testid="pending">{[...value.pendingIds].join(',')}</span>
}

function setup() {
  render(
    <UndoProvider>
      <button type="button">Elsewhere</button>
      <Probe />
    </UndoProvider>
  )
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('UndoProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('shows one toast with the label and an Undo button', async () => {
    setup()
    act(() => api.run(op('Time Out Market')))
    await flush()
    expect(screen.getByText('Moved Time Out Market to day 2')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy()
  })

  it('commits once after the 10 s toast closes', async () => {
    setup()
    const a = op('A')
    act(() => api.run(a))
    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS - 1))
    await flush()
    expect(a.commit).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    await flush()
    expect(a.commit).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS))
    await flush()
    expect(a.commit).toHaveBeenCalledTimes(1)
    expect(a.undo).not.toHaveBeenCalled()
  })

  it('Undo runs undo and never commit', async () => {
    setup()
    const a = op('A')
    act(() => api.run(a))
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS * 2))
    await flush()
    expect(a.undo).toHaveBeenCalledTimes(1)
    expect(a.commit).not.toHaveBeenCalled()
  })

  it('a second op commits the first at once', async () => {
    setup()
    const a = op('A')
    const b = op('B')
    act(() => api.run(a))
    act(() => api.run(b))
    await flush()
    expect(a.commit).toHaveBeenCalledTimes(1)
    expect(b.commit).not.toHaveBeenCalled()
    expect(screen.getByText('Moved B to day 2')).toBeTruthy()
  })

  it('pagehide commits the pending op; a deferred op goes out with fetch keepalive', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    setup()
    const a = op('act-1', {
      deferred: true,
      keepaliveRequest: { url: '/api/activities/act-1', method: 'DELETE' },
    })
    act(() => api.run(a))
    expect(screen.getByTestId('pending').textContent).toBe('act-1')

    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    await flush()
    expect(fetchMock).toHaveBeenCalledWith('/api/activities/act-1', { method: 'DELETE', keepalive: true })
    expect(screen.getByTestId('pending').textContent).toBe('')

    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS))
    await flush()
    // Committed once, by the keepalive request; commit() itself is not run again.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(a.commit).not.toHaveBeenCalled()
  })

  it('pagehide runs commit for an op without a keepalive request', async () => {
    setup()
    const a = op('A')
    act(() => api.run(a))
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    await flush()
    expect(a.commit).toHaveBeenCalledTimes(1)
  })

  it('never moves focus to the toast', async () => {
    setup()
    const elsewhere = screen.getByRole('button', { name: 'Elsewhere' })
    elsewhere.focus()
    act(() => api.run(op('A')))
    await flush()
    expect(document.activeElement).toBe(elsewhere)
  })
})
