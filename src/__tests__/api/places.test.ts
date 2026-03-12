import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchPlacesData } from '@/lib/places'

describe('fetchPlacesData', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.FOURSQUARE_API_KEY = 'test-fsq-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('calls Foursquare v3 places search API with correct parameters', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ rating: 9.2, price: 1 }] }),
    } as Response)

    await fetchPlacesData('Eiffel Tower', 'Paris')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('api.foursquare.com/v3/places/search')
    expect(url).toContain('limit=1')
    expect(url).toContain('fields=rating')
    expect(url).toContain('fields=rating,price')
    // Authorization header uses raw key without Bearer prefix
    const headers = options.headers as Record<string, string>
    expect(headers['Authorization']).toBe('test-fsq-key')
    expect(headers['Authorization']).not.toMatch(/^Bearer /)
  })

  it('returns rating and priceLevel for a recognized place', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ rating: 9.2, price: 1 }] }),
    } as Response)

    const result = await fetchPlacesData('Eiffel Tower', 'Paris')
    expect(result.rating).toBe(9.2)
    expect(result.priceLevel).toBe(1)
  })

  it('returns rating on 0-10 scale (native Foursquare scale)', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ rating: 8.5, price: 2 }] }),
    } as Response)

    const result = await fetchPlacesData('Some Restaurant', 'Tokyo')
    // Foursquare native scale is 0-10, not 0-5
    expect(result.rating).toBeGreaterThan(5)
    expect(result.rating).toBe(8.5)
  })

  it('maps results[0].rating to rating and results[0].price to priceLevel', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ rating: 7.8, price: 3 }] }),
    } as Response)

    const result = await fetchPlacesData('Museum', 'London')
    expect(result.rating).toBe(7.8)
    expect(result.priceLevel).toBe(3)
  })

  it('returns all-null object when FOURSQUARE_API_KEY is not set', async () => {
    delete process.env.FOURSQUARE_API_KEY

    const result = await fetchPlacesData('Eiffel Tower', 'Paris')
    expect(result).toEqual({ rating: null, priceLevel: null })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns all-null object when API returns non-ok response', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as Response)

    const result = await fetchPlacesData('Eiffel Tower', 'Paris')
    expect(result).toEqual({ rating: null, priceLevel: null })
  })

  it('returns all-null object when results array is empty', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response)

    const result = await fetchPlacesData('NonExistentPlace', 'Mars')
    expect(result).toEqual({ rating: null, priceLevel: null })
  })

  it('returns all-null object (does not throw) when fetch throws', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await fetchPlacesData('Eiffel Tower', 'Paris')
    expect(result).toEqual({ rating: null, priceLevel: null })
  })
})
