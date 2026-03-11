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
})
