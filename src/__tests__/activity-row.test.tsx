import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ActivityRow } from '@/components/itinerary/ActivityRow'
import type { Activity } from '@/lib/types'

const testActivity: Activity = {
  id: 'act-1',
  itinerary_id: 'itin-1',
  day_number: 1,
  name: 'Senso-ji Temple',
  time: '09:00',
  description: 'Ancient Buddhist temple',
  location: 'Asakusa, Tokyo',
  activity_type: null,
}

describe('ActivityRow', () => {
  it('renders activity name', () => {
    render(<ActivityRow activity={testActivity} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Senso-ji Temple')).toBeInTheDocument()
  })

  it('renders time label', () => {
    render(<ActivityRow activity={testActivity} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('09:00')).toBeInTheDocument()
  })

  it('renders location with pin icon', () => {
    render(<ActivityRow activity={testActivity} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/Asakusa, Tokyo/)).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<ActivityRow activity={testActivity} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Ancient Buddhist temple')).toBeInTheDocument()
  })

  it('does not render time if null', () => {
    render(<ActivityRow activity={{ ...testActivity, time: null }} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByText('09:00')).not.toBeInTheDocument()
  })
})
