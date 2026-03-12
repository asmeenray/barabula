import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

import { ItineraryHero } from '@/components/itinerary/ItineraryHero'

describe('ItineraryHero (HERO-01)', () => {
  it('renders the itinerary title as an overlay', () => {
    render(
      <ItineraryHero
        title="Tokyo Adventure"
        coverImageUrl="https://images.unsplash.com/test.jpg"
        destination="Tokyo, Japan"
        onBack={vi.fn()}
        onDelete={vi.fn()}
        onEditTitle={vi.fn()}
        editingTitle={false}
        titleDraft=""
        onTitleDraftChange={vi.fn()}
        onTitleSave={vi.fn()}
        onToggleMap={vi.fn()}
        showMap={false}
      />
    )
    expect(screen.getByText('Tokyo Adventure')).toBeInTheDocument()
  })
})
