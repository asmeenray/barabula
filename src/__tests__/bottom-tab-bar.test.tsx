import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FlightsTabPanel } from '@/components/chat/FlightsTabPanel'
import { HotelsTabPanel } from '@/components/chat/HotelsTabPanel'
import { BottomTabBar } from '@/components/chat/BottomTabBar'

// ─── FlightsTabPanel ──────────────────────────────────────────────────────────

describe('FlightsTabPanel', () => {
  const baseProps = {
    tripState: {},
    initialData: null,
    onSave: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders outbound airline field', () => {
    render(<FlightsTabPanel {...baseProps} />)
    expect(screen.getByPlaceholderText(/airline/i)).toBeTruthy()
  })

  it('renders outbound from airport field', () => {
    render(<FlightsTabPanel {...baseProps} />)
    // should have at least one from/airport field
    const fromFields = screen.getAllByPlaceholderText(/e\.g\. LHR|from/i)
    expect(fromFields.length).toBeGreaterThan(0)
  })

  it('renders return airline field', () => {
    render(<FlightsTabPanel {...baseProps} />)
    const airlineFields = screen.getAllByPlaceholderText(/airline/i)
    expect(airlineFields.length).toBeGreaterThanOrEqual(2)
  })

  it('renders departure time fields', () => {
    render(<FlightsTabPanel {...baseProps} />)
    const depFields = screen.getAllByPlaceholderText(/departure/i)
    expect(depFields.length).toBeGreaterThanOrEqual(1)
  })

  it('pre-fills outbound from field from tripState.origin when provided', () => {
    render(<FlightsTabPanel {...baseProps} tripState={{ origin: 'London' }} />)
    const inputs = screen.getAllByDisplayValue('London')
    expect(inputs.length).toBeGreaterThanOrEqual(1)
  })

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn()
    render(<FlightsTabPanel {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close|×|✕/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onSave and onClose when Save flight details button is clicked', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<FlightsTabPanel {...baseProps} onSave={onSave} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /save flight/i }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

// ─── HotelsTabPanel ───────────────────────────────────────────────────────────

describe('HotelsTabPanel', () => {
  const baseProps = {
    tripState: {},
    hotelPreference: null,
    onSave: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders a text input for hotel name/area override', () => {
    render(<HotelsTabPanel {...baseProps} />)
    expect(screen.getByPlaceholderText(/boutique hotel|hotel preference/i)).toBeTruthy()
  })

  it('shows 5-star inferred text when travel_style contains luxury', () => {
    render(<HotelsTabPanel {...baseProps} tripState={{ travel_style: 'luxury traveller' }} />)
    expect(screen.getByText(/5-star/i)).toBeTruthy()
  })

  it('shows 3-star inferred text when budget contains budget', () => {
    render(<HotelsTabPanel {...baseProps} tripState={{ budget: 'budget-friendly' }} />)
    expect(screen.getByText(/3-star/i)).toBeTruthy()
  })

  it('shows 4-star inferred text when no travel_style or budget indicator', () => {
    render(<HotelsTabPanel {...baseProps} tripState={{}} />)
    expect(screen.getByText(/4-star/i)).toBeTruthy()
  })

  it('pre-fills from hotelPreference prop when provided', () => {
    render(<HotelsTabPanel {...baseProps} hotelPreference="Ritz Carlton Tokyo" />)
    expect(screen.getByDisplayValue('Ritz Carlton Tokyo')).toBeTruthy()
  })

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn()
    render(<HotelsTabPanel {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close|×|✕/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onSave and onClose when Save preference button is clicked', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<HotelsTabPanel {...baseProps} onSave={onSave} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /save preference/i }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

// ─── BottomTabBar ─────────────────────────────────────────────────────────────

describe('BottomTabBar', () => {
  const baseProps = {
    conversationPhase: 'gathering_details' as const,
    activeTab: null as 'flights' | 'hotels' | null,
    onTabChange: vi.fn(),
  }

  it('renders Flights tab when phase is gathering_details', () => {
    render(<BottomTabBar {...baseProps} />)
    expect(screen.getByRole('button', { name: /flights/i })).toBeTruthy()
  })

  it('renders Hotels tab when phase is gathering_details', () => {
    render(<BottomTabBar {...baseProps} />)
    expect(screen.getByRole('button', { name: /hotels/i })).toBeTruthy()
  })

  it('renders Flights tab when phase is ready_for_summary', () => {
    render(<BottomTabBar {...baseProps} conversationPhase="ready_for_summary" />)
    expect(screen.getByRole('button', { name: /flights/i })).toBeTruthy()
  })

  it('does NOT render Flights or Hotels tabs when phase is itinerary_complete', () => {
    render(<BottomTabBar {...baseProps} conversationPhase="itinerary_complete" />)
    expect(screen.queryByRole('button', { name: /flights/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /hotels/i })).toBeNull()
  })

  it('calls onTabChange with "flights" when Flights tab is clicked and activeTab is null', () => {
    const onTabChange = vi.fn()
    render(<BottomTabBar {...baseProps} onTabChange={onTabChange} />)
    fireEvent.click(screen.getByRole('button', { name: /flights/i }))
    expect(onTabChange).toHaveBeenCalledWith('flights')
  })

  it('calls onTabChange with null when active tab is clicked again (toggle off)', () => {
    const onTabChange = vi.fn()
    render(<BottomTabBar {...baseProps} activeTab="flights" onTabChange={onTabChange} />)
    fireEvent.click(screen.getByRole('button', { name: /flights/i }))
    expect(onTabChange).toHaveBeenCalledWith(null)
  })

  it('calls onTabChange with "hotels" when Hotels tab is clicked', () => {
    const onTabChange = vi.fn()
    render(<BottomTabBar {...baseProps} onTabChange={onTabChange} />)
    fireEvent.click(screen.getByRole('button', { name: /hotels/i }))
    expect(onTabChange).toHaveBeenCalledWith('hotels')
  })
})
