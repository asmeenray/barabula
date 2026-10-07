import { StrictMode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PENDING_PASS_KEY, savePending } from '@/lib/pass/pending'
import type { PassAnswers } from '@/lib/pass/types'

const replace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn() }),
  usePathname: () => '/',
}))

import { ResumePendingTrip } from '@/components/pass/ResumePendingTrip'

const REF = '3b241101-e2bb-4255-8caf-4136c566a962'
const TRIP = '9a7b6c5d-4e3f-4a1b-8c2d-1e0f9a8b7c6d'
const answers: PassAnswers = {
  stops: ['Lisbon'],
  when: { kind: 'length', days: 2 },
  adults: null,
  kids: null,
  interests: [],
  note: null,
}

const ok = () => new Response(JSON.stringify({ id: TRIP }), { status: 201 })

describe('ResumePendingTrip', () => {
  beforeEach(() => {
    localStorage.clear()
    replace.mockReset()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('does nothing when no pass is kept', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(<ResumePendingTrip />)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(container).toBeEmptyDOMElement()
  })

  it('creates the trip once (StrictMode), clears the kept pass and opens the plan', async () => {
    savePending(answers, REF)
    const fetchMock = vi.fn().mockResolvedValue(ok())
    vi.stubGlobal('fetch', fetchMock)
    render(
      <StrictMode>
        <ResumePendingTrip />
      </StrictMode>
    )
    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/itinerary/${TRIP}`))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/itineraries')
    expect(JSON.parse(init.body)).toEqual({ ...answers, client_ref: REF })
    expect(localStorage.getItem(PENDING_PASS_KEY)).toBeNull()
  })

  it('keeps the pass on failure and Retry posts the same client_ref', async () => {
    savePending(answers, REF)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockResolvedValueOnce(ok())
    vi.stubGlobal('fetch', fetchMock)
    render(<ResumePendingTrip />)

    expect(await screen.findByText("Couldn't create the trip. Your answers are kept.")).toBeInTheDocument()
    expect(localStorage.getItem(PENDING_PASS_KEY)).not.toBeNull()
    expect(replace).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/itinerary/${TRIP}`))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).client_ref).toBe(REF)
    expect(localStorage.getItem(PENDING_PASS_KEY)).toBeNull()
  })

  it('never navigates to anything but a trip id from the API', async () => {
    savePending(answers, REF)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: '//evil.example' }), { status: 201 }))
    )
    render(<ResumePendingTrip />)
    expect(await screen.findByText(/Couldn't create the trip/)).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
    expect(localStorage.getItem(PENDING_PASS_KEY)).not.toBeNull()
  })
})
