import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { HomeTrip } from '@/lib/home/data'
import { NowNextPass } from '@/components/pass/NowNextPass'
import { UpcomingList, UpcomingPass } from '@/components/pass/UpcomingPass'

function trip(over: Partial<HomeTrip> = {}): HomeTrip {
  return {
    id: 'trip-1',
    title: 'Madrid',
    city: 'Madrid',
    photo: null,
    dates: '6–8 Oct',
    when: '6–8 Oct',
    who: null,
    into: null,
    dayCount: 3,
    placeCount: 2,
    status: 'Day 2 of 3',
    nextPlace: 'Museo del Prado',
    ...over,
  }
}

describe('NowNextPass', () => {
  it('is one link to the plan with the status line and Next place', () => {
    render(<NowNextPass trip={trip()} state="now" />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/itinerary/trip-1')
    expect(links[0]).toHaveAccessibleName('Madrid, Now, Day 2 of 3, Next: Museo del Prado')
    expect(screen.getByText('Day 2 of 3')).toBeInTheDocument()
    expect(screen.getByText('Museo del Prado')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('prints only the answered stamp lines', () => {
    render(<NowNextPass trip={trip({ when: null, dates: null, status: 'Dates not set', nextPlace: null, into: 'Food' })} state="next" />)
    expect(screen.getByText('To')).toBeInTheDocument()
    expect(screen.queryByText('When')).toBeNull()
    expect(screen.queryByText('Who')).toBeNull()
    expect(screen.getByText('Into')).toBeInTheDocument()
    expect(screen.getByText('Dates not set')).toBeInTheDocument()
    expect(screen.getByText('Next trip')).toBeInTheDocument()
  })
})

describe('UpcomingPass', () => {
  it('is one link with WHEN · DAYS · PLACES · STATUS; undated shows Open', () => {
    render(<UpcomingPass trip={trip({ id: 'porto', title: 'Porto', city: 'Porto', dates: null, when: null, dayCount: 2 })} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/itinerary/porto')
    expect(link).toHaveAttribute('title', 'Porto')
    expect(link.querySelector('[data-field="when"] dd')).toHaveTextContent('Open')
    expect(link.querySelector('[data-field="days"] dd')).toHaveTextContent('2')
    expect(link.querySelector('[data-field="places"] dd')).toHaveTextContent('2')
  })
})

describe('UpcomingList', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => trip({ id: `t${i}`, title: `City ${i}` }))

  it('0 trips: nothing', () => {
    const { container } = render(<UpcomingList trips={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('1–3 trips: all shown, no All upcoming button', () => {
    render(<UpcomingList trips={many(3)} />)
    expect(screen.getAllByRole('link')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /all upcoming/i })).toBeNull()
  })

  it('more than 3: first 3, then All upcoming (n) reveals the rest in place', () => {
    render(<UpcomingList trips={many(5)} />)
    expect(screen.getAllByRole('link')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'All upcoming (5)' }))
    expect(screen.getAllByRole('link')).toHaveLength(5)
    expect(screen.getByRole('link', { name: /^City 4,/ })).toBeInTheDocument()
  })
})
