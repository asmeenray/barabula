import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TabBar, activeTab } from '@/components/shell/TabBar'

let pathname = '/places'
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

describe('TabBar', () => {
  beforeEach(() => {
    pathname = '/places'
  })

  it('marks only the current tab with aria-current="page"', () => {
    render(<TabBar signedIn />)
    expect(screen.getByRole('link', { name: 'Places' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Trips' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'You' })).not.toHaveAttribute('aria-current')
  })

  it('links the three tabs to their roots', () => {
    render(<TabBar signedIn />)
    expect(screen.getByRole('link', { name: 'Trips' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Places' })).toHaveAttribute('href', '/places')
    expect(screen.getByRole('link', { name: 'You' })).toHaveAttribute('href', '/you')
  })

  it('keeps Trips active on a trip plan', () => {
    pathname = '/itinerary/00000000-0000-4000-8000-000000000000'
    render(<TabBar signedIn />)
    expect(screen.getByRole('link', { name: 'Trips' })).toHaveAttribute('aria-current', 'page')
  })

  it('renders nothing when signed out', () => {
    const { container } = render(<TabBar signedIn={false} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('navigation')).toBeNull()
  })
})

describe('activeTab', () => {
  it('maps paths to tabs', () => {
    expect(activeTab('/')).toBe('trips')
    expect(activeTab('/you/credits')).toBe('you')
    expect(activeTab('/placesx')).toBe('trips')
    expect(activeTab(null)).toBe('trips')
  })
})
