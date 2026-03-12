import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuickActionChips } from '@/components/chat/QuickActionChips'

describe('QuickActionChips', () => {
  it('renders 3 chips when not disabled', () => {
    render(<QuickActionChips onSend={vi.fn()} />)
    expect(screen.getByText('Looks good')).toBeTruthy()
    expect(screen.getByText('Change dates')).toBeTruthy()
    expect(screen.getByText('Add a budget')).toBeTruthy()
  })

  it('renders nothing when disabled=true', () => {
    const { container } = render(<QuickActionChips onSend={vi.fn()} disabled />)
    expect(container.firstChild).toBeNull()
  })

  it('calls onSend with "Looks good" message when Looks good chip clicked', () => {
    const onSend = vi.fn()
    render(<QuickActionChips onSend={onSend} />)
    fireEvent.click(screen.getByText('Looks good'))
    expect(onSend).toHaveBeenCalledWith(expect.stringContaining('Looks good'))
  })

  it('calls onSend with change dates message when Change dates chip clicked', () => {
    const onSend = vi.fn()
    render(<QuickActionChips onSend={onSend} />)
    fireEvent.click(screen.getByText('Change dates'))
    expect(onSend).toHaveBeenCalledWith(expect.stringContaining('dates'))
  })

  it('renders nothing when conversationPhase is gathering_destination', () => {
    const { container } = render(<QuickActionChips onSend={vi.fn()} conversationPhase="gathering_destination" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders Getting around chip when conversationPhase is gathering_details', () => {
    render(<QuickActionChips onSend={vi.fn()} conversationPhase="gathering_details" />)
    expect(screen.getByText('Getting around')).toBeTruthy()
  })

  it('renders 5 chips when conversationPhase is ready_for_summary', () => {
    render(<QuickActionChips onSend={vi.fn()} conversationPhase="ready_for_summary" />)
    expect(screen.getByText('Looks good')).toBeTruthy()
    expect(screen.getByText('Change dates')).toBeTruthy()
    expect(screen.getByText('Add budget')).toBeTruthy()
    expect(screen.getByText('More relaxed')).toBeTruthy()
    expect(screen.getByText('Add hidden gems')).toBeTruthy()
  })

  it('renders Plan a new trip chip when itinerary_complete', () => {
    render(<QuickActionChips onSend={vi.fn()} conversationPhase="itinerary_complete" />)
    expect(screen.getByText('Plan a new trip')).toBeTruthy()
  })

  it('renders nothing when conversationPhase is generating_itinerary', () => {
    const { container } = render(<QuickActionChips onSend={vi.fn()} conversationPhase="generating_itinerary" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when disabled=true regardless of phase', () => {
    const { container } = render(<QuickActionChips onSend={vi.fn()} disabled conversationPhase="ready_for_summary" />)
    expect(container.firstChild).toBeNull()
  })

  it('calls onSend with generate message when Looks good chip clicked in ready_for_summary', () => {
    const onSend = vi.fn()
    render(<QuickActionChips onSend={onSend} conversationPhase="ready_for_summary" />)
    fireEvent.click(screen.getByText('Looks good'))
    expect(onSend).toHaveBeenCalledWith('Looks good! Generate my full itinerary.')
  })
})
