import { describe, it, expect } from 'vitest'
import { googleMapsUrl } from '@/lib/plan/maps-link'

const BASE = 'https://www.google.com/maps/search/?api=1&query='

describe('googleMapsUrl', () => {
  it('uses "name, location" when a location is set', () => {
    expect(googleMapsUrl({ name: 'Time Out Market', location: 'Cais do Sodré' })).toBe(
      BASE + encodeURIComponent('Time Out Market, Cais do Sodré')
    )
  })

  it('uses "lat,lng" when there are coordinates and no location', () => {
    expect(googleMapsUrl({ name: 'Miradouro', location: null, lat: 38.7139, lng: -9.1334 })).toBe(
      BASE + encodeURIComponent('38.7139,-9.1334')
    )
  })

  it('uses the name alone when there is nothing else', () => {
    expect(googleMapsUrl({ name: 'Belém Tower' })).toBe(BASE + encodeURIComponent('Belém Tower'))
  })

  it('ignores a blank location and non-finite coordinates', () => {
    expect(googleMapsUrl({ name: 'Alfama', location: '   ', lat: Number.NaN, lng: 2 })).toBe(
      BASE + encodeURIComponent('Alfama')
    )
  })

  it('encodes characters that would break the query string', () => {
    const url = googleMapsUrl({ name: 'A&B #1', location: 'Rua X?' })
    expect(url).toBe(BASE + encodeURIComponent('A&B #1, Rua X?'))
    expect(new URL(url).searchParams.get('query')).toBe('A&B #1, Rua X?')
  })
})
