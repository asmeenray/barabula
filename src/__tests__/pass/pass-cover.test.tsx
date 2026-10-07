import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PassCover, PhotoCredit } from '@/components/pass/PassCover'
import { cityMapArt } from '@/components/pass/CityMapCover'
import { PlanHeader } from '@/components/board/PlanHeader'
import { photoFor } from '@/lib/photos/match'
import type { PlanTrip } from '@/lib/plan/types'

const lisbon = photoFor('Lisbon')!

function trip(destination: string): PlanTrip {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    user_id: '00000000-0000-4000-8000-000000000002',
    title: destination,
    description: null,
    destination,
    start_date: null,
    end_date: null,
    cover_image_url: null,
    extra_data: null,
    is_public: false,
    created_at: null,
    updated_at: null,
  }
}

describe('PassCover', () => {
  it('renders a curated photo as <picture> with an AVIF source and an img', () => {
    const { container } = render(<PassCover variant="nownext" photo={lisbon} cityName="Lisbon" title="Lisbon" />)
    const sources = [...container.querySelectorAll('picture > source')]
    // Laptop AVIF first (media query), then the phone AVIF; the phone WebP is the
    // img for everything else (no laptop WebP, 16-21 option E).
    expect(sources.map((s) => [s.getAttribute('type'), s.getAttribute('media'), s.getAttribute('srcset')])).toEqual([
      ['image/avif', '(min-width: 1024px)', lisbon.files.lAvif],
      ['image/avif', null, lisbon.files.mAvif],
    ])
    const img = screen.getByRole('img', { name: lisbon.alt })
    expect(img).toHaveAttribute('src', lisbon.files.mWebp)
    expect(container.querySelector('[data-cover="photo"]')).not.toBeNull()
  })

  it('uses only the phone crop on the small header strip', () => {
    const { container } = render(<PassCover variant="header" photo={lisbon} cityName="Lisbon" title="Lisbon" />)
    const sources = [...container.querySelectorAll('picture > source')]
    expect(sources).toHaveLength(1)
    expect(sources[0]).toHaveAttribute('type', 'image/avif')
    expect(sources[0]).toHaveAttribute('srcset', lisbon.files.mAvif)
    expect(container.innerHTML).not.toContain(lisbon.files.lAvif)
  })

  it('sets fetchpriority high and eager loading only on the priority pass', () => {
    const { container, rerender } = render(
      <PassCover variant="blank" photo={lisbon} cityName="Lisbon" title="Lisbon" priority />
    )
    let img = container.querySelector('img')!
    expect(img).toHaveAttribute('fetchpriority', 'high')
    expect(img).toHaveAttribute('loading', 'eager')

    rerender(<PassCover variant="blank" photo={lisbon} cityName="Lisbon" title="Lisbon" />)
    img = container.querySelector('img')!
    expect(img).not.toHaveAttribute('fetchpriority')
    expect(img).toHaveAttribute('loading', 'lazy')
  })

  it('uses the styled city-map cover for a city outside the set, with no image', () => {
    const kyoto = photoFor('Kyoto')
    expect(kyoto).toBeNull()
    const { container } = render(<PassCover variant="upcoming" photo={kyoto} cityName="Kyoto" title="Kyoto" />)
    expect(container.querySelector('[data-cover="map"]')).not.toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('picture')).toBeNull()
    expect(container.querySelector('[src], [href]')).toBeNull()
  })

  it('draws the same map for the same city and a different one for another city', () => {
    expect(cityMapArt('Porto')).toEqual(cityMapArt('Porto'))
    expect(cityMapArt('Porto')).not.toEqual(cityMapArt('Kyoto'))
  })

  it('shows the IATA code and state label only when given', () => {
    const { rerender } = render(
      <PassCover
        variant="nownext"
        photo={lisbon}
        cityName="Lisbon"
        title="Lisbon"
        stateLabel="Next trip"
        code={lisbon.iata}
      />
    )
    expect(screen.getByText('Next trip')).toBeInTheDocument()
    expect(screen.getByText(lisbon.iata!)).toBeInTheDocument()
    rerender(<PassCover variant="nownext" photo={null} cityName="Kyoto" title="Kyoto" />)
    expect(screen.queryByText(lisbon.iata!)).toBeNull()
  })

  it('holds the download and shows only the blur while holdPhoto is set', () => {
    const { container } = render(
      <PassCover variant="header" photo={lisbon} cityName="Lisbon" title="Lisbon" holdPhoto />
    )
    const cover = container.querySelector<HTMLElement>('[data-cover="photo"]')!
    expect(cover.style.backgroundImage).toContain(lisbon.blur)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('picture')).toBeNull()
  })

  it('falls back to the map cover when the photo fails to load', () => {
    let fellBack = 0
    const { container } = render(
      <PassCover variant="nownext" photo={lisbon} cityName="Lisbon" title="Lisbon" onFallback={() => fellBack++} />
    )
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('[data-cover="map"]')).not.toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(fellBack).toBe(1)
  })
})

describe('PhotoCredit', () => {
  it('reads photographer and licence from the manifest', () => {
    render(<PhotoCredit photo={lisbon} />)
    expect(screen.getByText(`Photo: ${lisbon.photographer}, ${lisbon.licence}`)).toBeInTheDocument()
  })
})

describe('PlanHeader cover', () => {
  const credit = `Photo: ${lisbon.photographer}, ${lisbon.licence}`

  it('shows the Lisbon photo with its credit and the city as the page heading', () => {
    const { container } = render(<PlanHeader trip={trip('Lisbon')} photo={lisbon} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Lisbon' })).toHaveAttribute('elementtiming', 'board')
    expect(container.querySelector('picture')).not.toBeNull()
    expect(screen.getByText(credit)).toBeInTheDocument()
  })

  it('shows the map cover and no credit for a city outside the set', () => {
    const { container } = render(<PlanHeader trip={trip('Porto')} photo={photoFor('Porto')} />)
    expect(container.querySelector('[data-cover="map"]')).not.toBeNull()
    expect(screen.queryByText(/^Photo:/)).toBeNull()
  })

  it('hides the credit after the photo fails', () => {
    const { container } = render(<PlanHeader trip={trip('Lisbon')} photo={lisbon} />)
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('[data-cover="map"]')).not.toBeNull()
    expect(screen.queryByText(credit)).toBeNull()
  })
})
