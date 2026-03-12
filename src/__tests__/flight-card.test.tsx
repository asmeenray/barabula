import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FlightCard } from '@/components/itinerary/FlightCard'
import type { Flight } from '@/lib/types'

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...p}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const outboundFlight: Flight = {
  direction: 'outbound',
  airline: 'Japan Airlines',
  flight_number: 'JL417',
  from_airport: 'LHR',
  to_airport: 'NRT',
  departure_time: '10:30 AM',
  arrival_time: '7:00 AM',
  is_suggested: false,
}

const suggestedFlight: Flight = {
  direction: 'return',
  airline: 'ANA',
  flight_number: 'NH212',
  from_airport: 'NRT',
  to_airport: 'LHR',
  departure_time: '1:00 PM',
  arrival_time: '6:30 PM',
  is_suggested: true,
}

describe('FlightCard', () => {
  it('renders airline name', () => {
    render(<FlightCard flight={outboundFlight} onSave={vi.fn()} />)
    expect(screen.getByText('Japan Airlines')).toBeInTheDocument()
  })

  it('renders from and to airports', () => {
    render(<FlightCard flight={outboundFlight} onSave={vi.fn()} />)
    expect(screen.getByText('LHR')).toBeInTheDocument()
    expect(screen.getByText('NRT')).toBeInTheDocument()
  })

  it('renders departure and arrival times', () => {
    render(<FlightCard flight={outboundFlight} onSave={vi.fn()} />)
    expect(screen.getByText('10:30 AM')).toBeInTheDocument()
    expect(screen.getByText('7:00 AM')).toBeInTheDocument()
  })

  it('renders "Outbound" direction label', () => {
    render(<FlightCard flight={outboundFlight} onSave={vi.fn()} />)
    expect(screen.getByText('Outbound')).toBeInTheDocument()
  })

  it('renders "Return" direction label', () => {
    render(<FlightCard flight={suggestedFlight} onSave={vi.fn()} />)
    expect(screen.getByText('Return')).toBeInTheDocument()
  })

  it('renders "Suggested — tap to edit" badge when is_suggested is true', () => {
    render(<FlightCard flight={suggestedFlight} onSave={vi.fn()} />)
    expect(screen.getByText('Suggested — tap to edit')).toBeInTheDocument()
  })

  it('does not render suggested badge when is_suggested is false', () => {
    render(<FlightCard flight={outboundFlight} onSave={vi.fn()} />)
    expect(screen.queryByText('Suggested — tap to edit')).not.toBeInTheDocument()
  })

  it('clicking "Edit" button reveals input fields (switches to edit mode)', () => {
    render(<FlightCard flight={outboundFlight} onSave={vi.fn()} />)
    const editBtn = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editBtn)
    // In edit mode, inputs should be visible
    expect(screen.getByDisplayValue('Japan Airlines')).toBeInTheDocument()
    expect(screen.getByDisplayValue('LHR')).toBeInTheDocument()
  })

  it('in edit mode shows Save button; clicking calls onSave with updated data', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<FlightCard flight={outboundFlight} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    // Change airline
    const airlineInput = screen.getByDisplayValue('Japan Airlines')
    fireEvent.change(airlineInput, { target: { value: 'British Airways' } })
    // Click Save
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ airline: 'British Airways', direction: 'outbound' })
    )
  })
})
