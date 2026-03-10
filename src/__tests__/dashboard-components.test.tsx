import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ItineraryCard } from '@/components/dashboard/ItineraryCard'
import { EmptyState } from '@/components/dashboard/EmptyState'
import type { Itinerary } from '@/lib/types'

const mockItinerary: Itinerary = {
  id: '1',
  user_id: 'u1',
  title: 'Tokyo Adventure',
  destination: 'Tokyo, Japan',
  start_date: '2024-04-01',
  end_date: '2024-04-07',
  description: 'An amazing trip to Japan',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('ItineraryCard', () => {
  it('renders title, destination, date range, and description', () => {
    render(
      <ItineraryCard
        itinerary={mockItinerary}
        onDelete={vi.fn()}
        isDeleting={false}
      />
    )
    expect(screen.getByText('Tokyo Adventure')).toBeInTheDocument()
    expect(screen.getByText('Tokyo, Japan')).toBeInTheDocument()
    expect(screen.getByText('2024-04-01 – 2024-04-07')).toBeInTheDocument()
    expect(screen.getByText('An amazing trip to Japan')).toBeInTheDocument()
  })

  it('renders a delete button', () => {
    render(
      <ItineraryCard
        itinerary={mockItinerary}
        onDelete={vi.fn()}
        isDeleting={false}
      />
    )
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('calls onDelete when delete button is clicked and confirmed', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    window.confirm = vi.fn(() => true)
    render(
      <ItineraryCard
        itinerary={mockItinerary}
        onDelete={onDelete}
        isDeleting={false}
      />
    )
    fireEvent.click(screen.getByText('Delete'))
    expect(onDelete).toHaveBeenCalledWith('1')
  })

  it('does not call onDelete when confirm is cancelled', () => {
    const onDelete = vi.fn()
    window.confirm = vi.fn(() => false)
    render(
      <ItineraryCard
        itinerary={mockItinerary}
        onDelete={onDelete}
        isDeleting={false}
      />
    )
    fireEvent.click(screen.getByText('Delete'))
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('shows Deleting... when isDeleting is true', () => {
    render(
      <ItineraryCard
        itinerary={mockItinerary}
        onDelete={vi.fn()}
        isDeleting={true}
      />
    )
    expect(screen.getByText('Deleting...')).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('renders No trips yet heading', () => {
    render(<EmptyState />)
    expect(screen.getByText(/No trips yet/i)).toBeInTheDocument()
  })

  it('renders Start a trip in Chat CTA link', () => {
    render(<EmptyState />)
    expect(screen.getByText(/Start a trip in Chat/i)).toBeInTheDocument()
  })

  it('renders Create manually CTA link', () => {
    render(<EmptyState />)
    expect(screen.getByText(/Create manually/i)).toBeInTheDocument()
  })
})
