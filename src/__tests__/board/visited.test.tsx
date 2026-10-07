import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PlanClient } from '@/components/board/PlanClient'
import { LiveRegionProvider } from '@/components/a11y/LiveRegion'
import type { PlanActivity, TripPlan } from '@/lib/plan/types'

// Mark visited end to end on the board (D-26, D-33): optimistic flip, honest
// failure ("Not saved yet" + DELAYED line), Retry clears both.

vi.mock('@/components/map/TripMapLazy', () => ({ TripMapLazy: () => null }))

const TRIP_ID = '11111111-1111-4111-8111-111111111111'
const A1 = '22222222-2222-4222-8222-222222222222'
const A2 = '33333333-3333-4333-8333-333333333333'

function activity(id: string, name: string, position: number, extra: Record<string, unknown> = {}): PlanActivity {
  return {
    id,
    itinerary_id: TRIP_ID,
    day_number: 1,
    position,
    name,
    time: null,
    description: null,
    location: 'Cais do Sodré',
    activity_type: null,
    extra_data: extra,
    duration: null,
    tips: null,
  }
}

function plan(): TripPlan {
  return {
    trip: {
      id: TRIP_ID,
      user_id: 'user-1',
      title: 'Lisbon',
      description: null,
      destination: 'Lisbon',
      start_date: null,
      end_date: null,
      cover_image_url: null,
      extra_data: { day_count: 1 },
      is_public: false,
      created_at: null,
      updated_at: null,
    },
    activities: [activity(A1, 'Time Out Market', 1), activity(A2, 'Belém Tower', 2)],
    dayCount: 1,
  }
}

function row(id: string): HTMLElement {
  return document.querySelector(`li[data-activity-id="${id}"]`) as HTMLElement
}

function renderBoard() {
  return render(
    <LiveRegionProvider>
      <PlanClient plan={plan()} />
    </LiveRegionProvider>
  )
}

function openTicket(id: string) {
  fireEvent.click(within(row(id)).getAllByRole('button')[0])
}

const fetchMock = vi.fn()

describe('Mark visited', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens one ticket at a time with aria-expanded', () => {
    renderBoard()
    const first = within(row(A1)).getAllByRole('button')[0]
    const second = within(row(A2)).getAllByRole('button')[0]
    expect(first).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(first)
    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: 'Time Out Market' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open in Google Maps' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Time Out Market, Cais do Sodré')
    )

    fireEvent.click(second)
    expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(second).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('region')).toHaveLength(1)
  })

  it('Escape closes the ticket and returns focus to the row', () => {
    renderBoard()
    openTicket(A1)
    const markBtn = screen.getByRole('button', { name: 'Mark visited' })
    markBtn.focus()
    fireEvent.keyDown(markBtn, { key: 'Escape' })
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(within(row(A1)).getAllByRole('button')[0])
  })

  it('sends a JSON PATCH with only extra_data.visited and announces it', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
    renderBoard()
    openTicket(A1)
    fireEvent.click(screen.getByRole('button', { name: 'Mark visited' }))

    expect(row(A1)).toHaveAttribute('data-chip', 'VISITED')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`/api/activities/${A1}`)
    expect(init.method).toBe('PATCH')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({ extra_data: { visited: true } })

    await waitFor(() =>
      expect(screen.getByTestId('live-region')).toHaveTextContent('Time Out Market marked visited.')
    )
    expect(screen.queryByText('Not saved yet')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark not visited' })).toBeInTheDocument()
  })

  it('keeps the change on failure, shows Not saved yet and DELAYED; Retry clears both', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    renderBoard()
    openTicket(A1)
    fireEvent.click(screen.getByRole('button', { name: 'Mark visited' }))

    // Optimistic: flips at once and stays flipped after the failure.
    expect(row(A1)).toHaveAttribute('data-chip', 'VISITED')
    await screen.findByText('Not saved yet')
    expect(row(A1)).toHaveAttribute('data-chip', 'VISITED')
    expect(within(row(A1)).getByText('Not saved yet')).toBeInTheDocument()
    expect(screen.getByText('Delayed')).toBeInTheDocument()
    expect(screen.getByText("Couldn't save.")).toBeInTheDocument()

    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    })

    await waitFor(() => expect(screen.queryByText('Not saved yet')).not.toBeInTheDocument())
    expect(screen.queryByText('Delayed')).not.toBeInTheDocument()
    expect(row(A1)).toHaveAttribute('data-chip', 'VISITED')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ extra_data: { visited: true } })
  })

  it('a non-OK response counts as a failure', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Couldn't save" }), { status: 500 }))
    renderBoard()
    openTicket(A2)
    fireEvent.click(screen.getByRole('button', { name: 'Mark visited' }))
    await screen.findByText('Not saved yet')
    expect(within(row(A2)).getByText('Not saved yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('Mark not visited flips back and sends visited false', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
    renderBoard()
    openTicket(A1)
    fireEvent.click(screen.getByRole('button', { name: 'Mark visited' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mark not visited' }))
    expect(row(A1)).toHaveAttribute('data-chip', 'NEXT')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ extra_data: { visited: false } })
  })

  it('offline: Mark visited is aria-disabled and does nothing', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    try {
      renderBoard()
      act(() => {
        window.dispatchEvent(new Event('offline'))
      })
      openTicket(A1)
      const btn = screen.getByRole('button', { name: 'Mark visited' })
      expect(btn).toHaveAttribute('aria-disabled', 'true')
      fireEvent.click(btn)
      expect(fetchMock).not.toHaveBeenCalled()
      expect(row(A1)).toHaveAttribute('data-chip', 'NEXT')

      onLine.mockReturnValue(true)
      act(() => {
        window.dispatchEvent(new Event('online'))
      })
      expect(screen.getByRole('button', { name: 'Mark visited' })).not.toHaveAttribute('aria-disabled')
    } finally {
      onLine.mockRestore()
    }
  })
})
