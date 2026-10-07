import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PlacesClient } from '@/components/places/PlacesClient'
import { LiveRegionProvider } from '@/components/a11y/LiveRegion'
import { UndoProvider } from '@/components/undo/UndoProvider'
import type { PlacePoint, PlaceTrip } from '@/lib/places-tab/filter'

// Places tab states (16-18, D-28; UI-SPEC Copywriting "Places tab", "Places
// empty state", "Places no results").

vi.mock('@/components/map/PlacesMapLazy', () => ({ PlacesMapLazy: () => null }))

const TRIPS: PlaceTrip[] = [
  { id: 'lisbon', title: 'Lisbon', start_date: '2026-10-20', updated_at: null },
  { id: 'porto', title: 'Porto', start_date: null, updated_at: null },
]

function point(id: string, name: string, over: Partial<PlacePoint> = {}): PlacePoint {
  return {
    id,
    name,
    location: 'Baixa',
    type: 'places',
    tripId: 'lisbon',
    tripTitle: 'Lisbon',
    day: 1,
    position: 1,
    visited: false,
    coords: { lat: 38.7, lng: -9.1 },
    ...over,
  }
}

function renderPlaces(points: PlacePoint[]) {
  return render(
    <LiveRegionProvider>
      <UndoProvider>
        <PlacesClient points={points} trips={TRIPS} />
      </UndoProvider>
    </LiveRegionProvider>
  )
}

describe('Places tab states', () => {
  it('shows the empty state when there are no places', () => {
    renderPlaces([])
    expect(screen.getByRole('heading', { name: 'No places yet' })).toBeInTheDocument()
    expect(screen.getByText('Places you add to a trip show up here.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to trips' })).toHaveAttribute('href', '/')
  })

  it('reads "1 place" and "{n} places"', () => {
    const { unmount } = renderPlaces([point('a', 'Time Out Market')])
    expect(screen.getByRole('heading', { name: '1 place' })).toBeInTheDocument()
    unmount()
    renderPlaces([point('a', 'Time Out Market'), point('b', 'Livraria Lello', { tripId: 'porto', tripTitle: 'Porto' })])
    expect(screen.getByRole('heading', { name: '2 places' })).toBeInTheDocument()
  })

  it('groups by trip and marks places without coordinates', () => {
    renderPlaces([
      point('a', 'Time Out Market'),
      point('b', 'Livraria Lello', { tripId: 'porto', tripTitle: 'Porto', coords: null }),
    ])
    expect(screen.getByRole('heading', { name: 'Lisbon' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Porto' })).toBeInTheDocument()
    expect(screen.getAllByText('Not on map')).toHaveLength(1)
  })

  it('shows no results, and Clear filters brings the list back', () => {
    renderPlaces([point('a', 'Time Out Market'), point('b', 'Praça do Comércio')])
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search your places' }), {
      target: { value: 'nothing like this' },
    })
    expect(screen.getByText('No places match these filters.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '0 places' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.queryByText('No places match these filters.')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '2 places' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search your places' })).toHaveValue('')
  })

  it('search narrows the list (accents ignored)', () => {
    renderPlaces([point('a', 'Time Out Market'), point('b', 'Praça do Comércio')])
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search your places' }), { target: { value: 'praca' } })
    expect(screen.getByRole('heading', { name: '1 place' })).toBeInTheDocument()
    expect(screen.queryByText('Time Out Market')).not.toBeInTheDocument()
  })

  it('opens the place card from a row and goes back to the list', () => {
    renderPlaces([point('a', 'Time Out Market', { location: 'Cais do Sodré', day: 1 })])
    fireEvent.click(screen.getByRole('button', { name: /Time Out Market/ }))
    expect(screen.getByRole('heading', { name: 'Time Out Market' })).toBeInTheDocument()
    expect(screen.getByText('Place · Cais do Sodré')).toBeInTheDocument()
    expect(screen.getByText('Lisbon · Day 1')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Visited' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open trip' })).toHaveAttribute('href', '/itinerary/lisbon')
    expect(screen.getByRole('link', { name: 'Open in Google Maps' })).toHaveAttribute('target', '_blank')

    fireEvent.click(screen.getByRole('button', { name: 'Back to places' }))
    expect(screen.getByRole('heading', { name: '1 place' })).toBeInTheDocument()
  })

  it('reads Maybe places as "{Trip} · Maybe"', () => {
    renderPlaces([point('a', 'MAAT', { day: null })])
    fireEvent.click(screen.getByRole('button', { name: /MAAT/ }))
    expect(screen.getByText('Lisbon · Maybe')).toBeInTheDocument()
  })
})
