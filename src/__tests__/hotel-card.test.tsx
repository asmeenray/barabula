import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { HotelCard } from '@/components/itinerary/HotelCard'

const mockHotelActivity = {
  id: 'hotel-1',
  itinerary_id: 'itin-1',
  day_number: 1,
  name: 'Park Hyatt Tokyo',
  time: null,
  description: 'Luxury hotel in Shinjuku',
  location: 'Shinjuku, Tokyo',
  activity_type: 'hotel',
  extra_data: { hotel_name: 'Park Hyatt Tokyo', star_rating: 5, check_in: '2024-04-01', check_out: '2024-04-03' },
}

describe('HotelCard (HOTEL-01)', () => {
  it('renders hotel name', () => {
    render(<HotelCard activity={mockHotelActivity as any} />)
    expect(screen.getByText('Park Hyatt Tokyo')).toBeInTheDocument()
  })
  it('renders star rating', () => {
    render(<HotelCard activity={mockHotelActivity as any} />)
    expect(screen.getByText(/5/)).toBeInTheDocument()
  })
})
