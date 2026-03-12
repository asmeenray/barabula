import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EatDrinkTab } from '@/components/itinerary/EatDrinkTab'
import type { DailyFood } from '@/lib/types'

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...p}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const dailyFoodData: DailyFood[] = [
  {
    day_number: 1,
    dinner_restaurant: 'Sukiyabashi Jiro',
    dinner_area: 'Ginza',
    dinner_cuisine: 'Sushi',
    local_tip: 'Reserve months in advance',
  },
  {
    day_number: 2,
    dinner_restaurant: 'Ichiran Ramen',
    dinner_area: 'Shinjuku',
    dinner_cuisine: 'Ramen',
    local_tip: 'Solo dining booths available',
  },
]

describe('EatDrinkTab', () => {
  it('renders one card per day_number in daily_food array', () => {
    render(
      <EatDrinkTab
        dailyFood={dailyFoodData}
        itineraryId="itin-1"
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText(/Day 1/)).toBeInTheDocument()
    expect(screen.getByText(/Day 2/)).toBeInTheDocument()
  })

  it('renders dinner_restaurant for each card', () => {
    render(
      <EatDrinkTab
        dailyFood={dailyFoodData}
        itineraryId="itin-1"
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('Sukiyabashi Jiro')).toBeInTheDocument()
    expect(screen.getByText('Ichiran Ramen')).toBeInTheDocument()
  })

  it('renders dinner_cuisine and dinner_area', () => {
    render(
      <EatDrinkTab
        dailyFood={dailyFoodData}
        itineraryId="itin-1"
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText(/Sushi/)).toBeInTheDocument()
    expect(screen.getByText(/Ginza/)).toBeInTheDocument()
  })

  it('renders local_tip', () => {
    render(
      <EatDrinkTab
        dailyFood={dailyFoodData}
        itineraryId="itin-1"
        onSave={vi.fn()}
      />
    )
    expect(screen.getByText('Reserve months in advance')).toBeInTheDocument()
  })

  it('clicking edit on a card makes fields editable (controlled inputs)', () => {
    render(
      <EatDrinkTab
        dailyFood={dailyFoodData}
        itineraryId="itin-1"
        onSave={vi.fn()}
      />
    )
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    fireEvent.click(editButtons[0])
    // After clicking edit on day 1, the restaurant name should be in an input
    expect(screen.getByDisplayValue('Sukiyabashi Jiro')).toBeInTheDocument()
  })

  it('"Save" calls onSave with updated DailyFood array', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <EatDrinkTab
        dailyFood={dailyFoodData}
        itineraryId="itin-1"
        onSave={onSave}
      />
    )
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    fireEvent.click(editButtons[0])
    // Change restaurant name
    const input = screen.getByDisplayValue('Sukiyabashi Jiro')
    fireEvent.change(input, { target: { value: 'Narisawa' } })
    // Click Save
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ day_number: 1, dinner_restaurant: 'Narisawa' }),
      ])
    )
  })
})
