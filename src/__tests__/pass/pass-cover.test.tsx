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
    const bordeaux = photoFor('Bordeaux')
    expect(bordeaux).toBeNull()
    const { container } = render(<PassCover variant="upcoming" photo={bordeaux} cityName="Bordeaux" title="Bordeaux" />)
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
    const { container } = render(<PlanHeader trip={trip('Bordeaux')} photo={photoFor('Bordeaux')} />)
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

// Laptop flap-tile title (quick 261007-wms, A-1/A-3).
describe('PassCover tiles', () => {
  const scrims = (c: HTMLElement) =>
    [...c.querySelectorAll<HTMLElement>('[aria-hidden="true"].pointer-events-none.absolute.inset-0')].filter((el) =>
      el.style.backgroundImage.includes('linear-gradient')
    )

  it('renders the tile title, a laptop-only light scrim over today\'s phone scrim and the 18 px laptop status line', () => {
    const { container } = render(
      <PassCover
        variant="blank"
        photo={lisbon}
        cityName="Lisbon"
        title="Where to next?"
        statusLine="Pick a city to start"
        titleAs="h1"
        flapTitle={false}
        flapBoard
        tiles={['Where to', 'next?']}
      />
    )
    expect(container.querySelectorAll('[data-tile]')).toHaveLength(12)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Where to next?')
    // The tiles would read letter by letter in Chrome's name computation; the title names itself.
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('aria-label', 'Where to next?')
    const [phone, laptop] = scrims(container)
    expect(phone).toHaveClass('lg:hidden')
    expect(laptop).toHaveClass('hidden', 'lg:block')
    expect(laptop.style.backgroundImage).toContain('rgba(5, 8, 12, 0.55)')
    expect(laptop.style.backgroundImage).toContain('rgba(5, 8, 12, 0.05) 45%')
    expect(laptop.style.backgroundImage).toContain('rgba(5, 8, 12, 0.45)')
    const status = screen.getByText('Pick a city to start').closest('p')!
    expect(status).toHaveClass('text-base', 'lg:text-[18px]')
    // Phone keeps the 36 px title.
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('text-[36px]')
  })

  it('without tiles keeps one scrim, no tiles and the plain status line', () => {
    const { container } = render(
      <PassCover
        variant="blank"
        photo={lisbon}
        cityName="Lisbon"
        title="Where to next?"
        statusLine="Pick a city to start"
        flapTitle={false}
        flapBoard
      />
    )
    expect(container.querySelectorAll('[data-tile]')).toHaveLength(0)
    expect(container.querySelector('[aria-label]')).toBeNull()
    const layers = scrims(container)
    expect(layers).toHaveLength(1)
    expect(layers[0]).not.toHaveClass('lg:hidden')
    expect(screen.getByText('Pick a city to start').closest('p')).not.toHaveClass('lg:text-[18px]')
  })
})
