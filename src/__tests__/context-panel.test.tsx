import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ContextPanel } from '@/components/chat/ContextPanel'
import type { TripState } from '@/lib/types'

describe('ContextPanel', () => {
  it('shows ambient panel when itineraryData is null', () => {
    render(<ContextPanel itineraryData={null} isGenerating={false} />)
    // The ambient panel shows "Understanding your trip..." label text
    expect(screen.getByText('Understanding your trip...')).toBeTruthy()
  })

  it('shows generating state text when isGenerating=true', () => {
    render(<ContextPanel itineraryData={null} isGenerating={true} />)
    // Both "Building your itinerary..." and "Crafting every detail" appear when generating
    expect(screen.getByText('Building your itinerary...')).toBeTruthy()
  })

  it('shows itinerary panel when itineraryData is provided', () => {
    const data = {
      title: 'Tokyo Adventure',
      destination: 'Tokyo, Japan',
      start_date: '2025-04-01',
      end_date: '2025-04-10',
      dayCount: 10,
      activityCount: 25,
    }
    render(<ContextPanel itineraryData={data} isGenerating={false} />)
    expect(screen.getByText('Tokyo Adventure')).toBeTruthy()
    expect(screen.getByText('10')).toBeTruthy()
    expect(screen.getByText('25')).toBeTruthy()
  })

  const mockTripState: Partial<TripState> = {
    destination: 'Tokyo',
    travelers_count: 2,
    travelers_type: 'couple',
    dates_start: '2025-05-01',
    dates_end: '2025-05-10',
    interests: ['food', 'temples'],
  }

  it('shows TripSummaryPanel when conversationPhase is ready_for_summary', () => {
    render(
      <ContextPanel
        itineraryData={null}
        isGenerating={false}
        conversationPhase="ready_for_summary"
        tripState={mockTripState}
      />
    )
    expect(screen.getByText('Tokyo')).toBeTruthy()
    expect(screen.getByTestId('trip-summary-panel')).toBeTruthy()
  })

  it('shows AmbientPanel when conversationPhase is gathering_details', () => {
    render(
      <ContextPanel
        itineraryData={null}
        isGenerating={false}
        conversationPhase="gathering_details"
        tripState={{}}
      />
    )
    expect(screen.getByText('Understanding your trip...')).toBeTruthy()
  })

  it('shows ItineraryPanel (not TripSummaryPanel) when itineraryData is provided even if phase is ready_for_summary', () => {
    const data = {
      title: 'Tokyo Adventure',
      destination: 'Tokyo, Japan',
      start_date: '2025-04-01',
      end_date: '2025-04-10',
      dayCount: 10,
      activityCount: 25,
    }
    render(
      <ContextPanel
        itineraryData={data}
        isGenerating={false}
        conversationPhase="ready_for_summary"
        tripState={mockTripState}
      />
    )
    expect(screen.getByText('Tokyo Adventure')).toBeTruthy()
    // TripSummaryPanel should NOT be visible
    expect(screen.queryByTestId('trip-summary-panel')).toBeNull()
  })
})
