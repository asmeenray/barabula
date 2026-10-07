import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { HomeTrip } from '@/lib/home/data'
import { PastPile } from '@/components/pass/PastPile'
import { CreateTripTile } from '@/components/pass/CreateTripTile'

function past(i: number): HomeTrip {
  return {
    id: `p${i}`,
    title: `City ${i}`,
    city: `City ${i}`,
    photo: null,
    dates: `${i + 1}–${i + 3} Apr`,
    when: `${i + 1}–${i + 3} Apr`,
    who: null,
    into: null,
    dayCount: 3,
    placeCount: 2,
    status: null,
    nextPlace: null,
  }
}
const many = (n: number) => Array.from({ length: n }, (_, i) => past(i))

describe('PastPile', () => {
  it('0 trips: nothing', () => {
    const { container } = render(<PastPile trips={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('collapsed: one button with aria-expanded, a pile of up to 3 stubs, the list inert', () => {
    const { container } = render(<PastPile trips={many(5)} />)
    const button = screen.getByRole('button', { name: /^Past trips · 5$/ })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    // Front stub + 2 behind (aria-hidden) = 3 pile layers.
    expect(button.querySelectorAll(':scope > span')).toHaveLength(3)
    expect(button.querySelectorAll(':scope > span[aria-hidden="true"]')).toHaveLength(2)
    const list = container.querySelector('#home-past-list')!
    expect(list).toHaveAttribute('inert')
    expect(list).toHaveAttribute('hidden')
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('1 trip: a pile of 1', () => {
    render(<PastPile trips={many(1)} />)
    expect(screen.getByRole('button', { name: 'Past trips · 1' }).querySelectorAll(':scope > span')).toHaveLength(1)
  })

  it('expanded: a real list of the latest 6, then Show all past trips reveals the rest', () => {
    const { container } = render(<PastPile trips={many(8)} />)
    fireEvent.click(screen.getByRole('button', { name: /Past trips · 8/ }))
    expect(screen.getByRole('button', { name: /Past trips · 8/ })).toHaveAttribute('aria-expanded', 'true')
    expect(container.querySelector('#home-past-list')).not.toHaveAttribute('inert')
    expect(screen.getAllByRole('link')).toHaveLength(6)
    expect(screen.getByRole('link', { name: 'City 0, 1–3 Apr, 2 places' })).toHaveAttribute('href', '/itinerary/p0')
    fireEvent.click(screen.getByRole('button', { name: 'Show all past trips' }))
    expect(screen.getAllByRole('link')).toHaveLength(8)
    expect(screen.queryByRole('button', { name: 'Show all past trips' })).toBeNull()
  })

  it('6 or fewer: no Show all button', () => {
    render(<PastPile trips={many(6)} />)
    fireEvent.click(screen.getByRole('button', { name: /Past trips/ }))
    expect(screen.queryByRole('button', { name: 'Show all past trips' })).toBeNull()
  })
})

describe('CreateTripTile', () => {
  it('renders nothing with no trips (or an unknown count)', () => {
    expect(render(<CreateTripTile tripCount={0} />).container).toBeEmptyDOMElement()
    expect(render(<CreateTripTile tripCount={null} />).container).toBeEmptyDOMElement()
  })

  it('Fill the pass focuses Where to? on the blank pass', () => {
    render(
      <>
        <section id="next-trip-pass">
          <input id="pass-where-to" aria-label="Where to?" />
        </section>
        <CreateTripTile tripCount={2} />
      </>
    )
    expect(screen.getByRole('heading', { name: 'Create a new trip' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Fill the pass/ }))
    expect(screen.getByLabelText('Where to?')).toHaveFocus()
  })
})
