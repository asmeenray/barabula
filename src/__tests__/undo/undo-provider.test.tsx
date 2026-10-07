import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
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
    for (let i = 0; i < 5; i++) await Promise.resolve()
  })
}

/** run(op), then let the lazily loaded toaster mount and show the toast. */
async function runOp(o: UndoOp) {
  act(() => api.run(o))
  await flush()
}

describe('UndoProvider', () => {
  beforeAll(async () => {
    // The toaster is loaded on first use; warm the module so tests stay synchronous.
    await import('@/components/undo/UndoToaster')
  })
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('shows one toast with the label and an Undo button', async () => {
    setup()
    await runOp(op('Time Out Market'))
    expect(screen.getByText('Moved Time Out Market to day 2')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy()
  })

  it('reads the toast out politely by default', async () => {
    setup()
    await runOp(op('A'))
    const viewport = screen.getByLabelText('Notifications')
    expect(viewport.getAttribute('role')).toBe('status')
    expect(viewport.getAttribute('aria-live')).toBe('polite')
  })

  it('keeps a toast silent with announce: false, then reads the next one again (Pitfall 11)', async () => {
    setup()
    await runOp(op('A', { announce: false }))
    expect(screen.getByText('Moved A to day 2')).toBeTruthy()
    const viewport = screen.getByLabelText('Notifications')
    expect(viewport.getAttribute('aria-live')).toBe('off')
    expect(viewport.getAttribute('role')).toBe('region')

    await runOp(op('B'))
    expect(screen.getByLabelText('Notifications').getAttribute('aria-live')).toBe('polite')
    expect(screen.getByLabelText('Notifications').getAttribute('role')).toBe('status')
  })

  it('commits once after the 10 s toast closes', async () => {
    setup()
    const a = op('A')
    await runOp(a)
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
    await runOp(a)
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
    await runOp(a)
    await runOp(b)
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
    await runOp(a)
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
    await runOp(a)
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
    await runOp(op('A'))
    expect(document.activeElement).toBe(elsewhere)
  })
})
