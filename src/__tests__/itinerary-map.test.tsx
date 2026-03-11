import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('react-map-gl/maplibre', () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  Marker: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  NavigationControl: () => null,
}))
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

import ItineraryMap from '@/components/itinerary/ItineraryMap'

describe('ItineraryMap (MAP-01)', () => {
  it('renders a map container', () => {
    render(<ItineraryMap pins={[]} activeDay={null} activeActivityId={null} onPinClick={() => {}} />)
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })
})
