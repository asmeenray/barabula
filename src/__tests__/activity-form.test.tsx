import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ActivityForm } from '@/components/itinerary/ActivityForm'

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...p}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('ActivityForm', () => {
  it('renders "Duration" label and text input', () => {
    render(
      <ActivityForm
        dayNumber={1}
        itineraryId="itin-1"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('Duration')).toBeInTheDocument()
    // The duration input should be present
    expect(screen.getByPlaceholderText(/2.+hour/i)).toBeInTheDocument()
  })

  it('renders "Tips (optional)" label and textarea', () => {
    render(
      <ActivityForm
        dayNumber={1}
        itineraryId="itin-1"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('Tips (optional)')).toBeInTheDocument()
    // Tips textarea should be present
    expect(screen.getByPlaceholderText(/book tickets/i)).toBeInTheDocument()
  })

  it('onSave is called with duration and tips fields', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <ActivityForm
        dayNumber={1}
        itineraryId="itin-1"
        onSave={onSave}
        onCancel={vi.fn()}
      />
    )
    // Fill in name (required)
    fireEvent.change(screen.getByPlaceholderText(/Senso-ji/i), {
      target: { value: 'Visit Temple' },
    })
    // Fill in duration
    fireEvent.change(screen.getByPlaceholderText(/2.+hour/i), {
      target: { value: '2–3 hours' },
    })
    // Fill in tips
    fireEvent.change(screen.getByPlaceholderText(/book tickets/i), {
      target: { value: 'Go early morning' },
    })
    // Submit
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: '2–3 hours',
          tips: 'Go early morning',
        })
      )
    })
  })

  it('onSave is called with null for empty duration and tips', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <ActivityForm
        dayNumber={1}
        itineraryId="itin-1"
        onSave={onSave}
        onCancel={vi.fn()}
      />
    )
    fireEvent.change(screen.getByPlaceholderText(/Senso-ji/i), {
      target: { value: 'Visit Temple' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ duration: null, tips: null })
      )
    })
  })
})
