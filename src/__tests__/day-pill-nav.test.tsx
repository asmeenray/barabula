import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DayPillNav } from '@/components/itinerary/DayPillNav'

describe('DayPillNav (MAP-02)', () => {
  it('renders a pill for each day', () => {
    render(<DayPillNav days={[1, 2, 3]} activeDay={1} onDayChange={() => {}} />)
    expect(screen.getByText('Day 1')).toBeInTheDocument()
    expect(screen.getByText('Day 2')).toBeInTheDocument()
  })
  it('calls onDayChange when a pill is clicked', () => {
    const onDayChange = vi.fn()
    render(<DayPillNav days={[1, 2]} activeDay={1} onDayChange={onDayChange} />)
    fireEvent.click(screen.getByText('Day 2'))
    expect(onDayChange).toHaveBeenCalledWith(2)
  })
})
