import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Chip } from '@/components/ui/Chip'

describe('Chip', () => {
  it('renders as a button', () => {
    render(<Chip label="Going solo" onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Going solo' })).toBeTruthy()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Chip label="Going solo" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies active styles when active=true', () => {
    render(<Chip label="Solo" onClick={() => {}} active />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-white')
    expect(btn.className).toContain('text-gray-900')
  })

  it('applies inactive styles when active=false (default)', () => {
    render(<Chip label="Solo" onClick={() => {}} />)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-white/10')
    expect(btn.className).toContain('text-white/90')
  })
})
