import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchCityImage, fetchActivityImage } from '@/lib/unsplash'

describe('fetchCityImage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('calls api.unsplash.com (not source.unsplash.com) with correct query', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ urls: { regular: 'https://images.unsplash.com/photo-paris' } }),
    } as Response)

    await fetchCityImage('Paris')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url] = mockFetch.mock.calls[0] as [string, ...unknown[]]
    expect(url).toContain('api.unsplash.com/photos/random')
    expect(url).not.toContain('source.unsplash.com')
    expect(url).toContain('Paris')
  })

  it('returns urls.regular from successful response', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ urls: { regular: 'https://images.unsplash.com/photo-paris' } }),
    } as Response)

    const result = await fetchCityImage('Paris')
    expect(result).toBe('https://images.unsplash.com/photo-paris')
  })

  it('returns null when UNSPLASH_ACCESS_KEY is not set', async () => {
    const original = process.env.UNSPLASH_ACCESS_KEY
    delete process.env.UNSPLASH_ACCESS_KEY

    const result = await fetchCityImage('Paris')
    expect(result).toBeNull()
    expect(fetch).not.toHaveBeenCalled()

    if (original !== undefined) process.env.UNSPLASH_ACCESS_KEY = original
  })

  it('returns null when API returns non-ok response', async () => {
    process.env.UNSPLASH_ACCESS_KEY = 'test-key'
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    } as Response)

    const result = await fetchCityImage('Paris')
    expect(result).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    process.env.UNSPLASH_ACCESS_KEY = 'test-key'
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await fetchCityImage('Paris')
    expect(result).toBeNull()
  })
})

describe('fetchActivityImage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.UNSPLASH_ACCESS_KEY = 'test-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('uses primary query combining activityName and destination', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ urls: { regular: 'https://images.unsplash.com/photo-eiffel' } }),
    } as Response)

    await fetchActivityImage('Eiffel Tower', 'Paris')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url] = mockFetch.mock.calls[0] as [string, ...unknown[]]
    expect(url).toContain('api.unsplash.com/photos/random')
    expect(url).toContain('Eiffel')
    expect(url).toContain('Paris')
  })

  it('returns urls.regular for a known query', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ urls: { regular: 'https://images.unsplash.com/photo-eiffel' } }),
    } as Response)

    const result = await fetchActivityImage('Eiffel Tower', 'Paris')
    expect(result).toBe('https://images.unsplash.com/photo-eiffel')
  })

  it('falls back to destination-only query when primary returns non-ok', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 404 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ urls: { regular: 'https://images.unsplash.com/photo-paris-fallback' } }),
      } as Response)

    const result = await fetchActivityImage('XYZ Activity', 'Paris')

    expect(mockFetch).toHaveBeenCalledTimes(2)
    const [secondUrl] = mockFetch.mock.calls[1] as [string, ...unknown[]]
    expect(secondUrl).toContain('Paris')
    expect(result).toBe('https://images.unsplash.com/photo-paris-fallback')
  })

  it('returns null when both primary and fallback queries fail', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 404 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 404 } as Response)

    const result = await fetchActivityImage('XYZ Activity', 'Paris')
    expect(result).toBeNull()
  })

  it('returns null when UNSPLASH_ACCESS_KEY is not set', async () => {
    delete process.env.UNSPLASH_ACCESS_KEY

    const result = await fetchActivityImage('Eiffel Tower', 'Paris')
    expect(result).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})
