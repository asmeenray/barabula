import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchCityImage, fetchActivityImage } from '@/lib/unsplash'

describe('fetchCityImage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.UNSPLASH_ACCESS_KEY = 'test-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
    delete process.env.UNSPLASH_ACCESS_KEY
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

describe('image lookups count external calls (D-15)', () => {
  const notOk = { ok: false, status: 404 } as Response
  const unsplashOk = (url: string) =>
    ({ ok: true, json: async () => ({ urls: { regular: url } }) }) as Response
  const pexelsOk = (url: string) =>
    ({ ok: true, json: async () => ({ photos: [{ src: { large2x: url } }] }) }) as Response

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.UNSPLASH_ACCESS_KEY = 'test-key'
    process.env.PEXELS_API_KEY = 'test-pexels-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
    delete process.env.UNSPLASH_ACCESS_KEY
    delete process.env.PEXELS_API_KEY
  })

  it('fetchCityImage counts unsplash 1 and pexels 1 when Unsplash fails and Pexels answers', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(notOk)
      .mockResolvedValueOnce(pexelsOk('https://images.pexels.com/paris.jpg'))
    const tracker = { count: vi.fn() }

    const result = await fetchCityImage('Paris', tracker)

    expect(result).toBe('https://images.pexels.com/paris.jpg')
    expect(tracker.count).toHaveBeenCalledTimes(2)
    expect(tracker.count).toHaveBeenNthCalledWith(1, 'unsplash')
    expect(tracker.count).toHaveBeenNthCalledWith(2, 'pexels')
  })

  it('counts only unsplash when Unsplash answers', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(unsplashOk('https://images.unsplash.com/paris'))
    const tracker = { count: vi.fn() }

    await fetchCityImage('Paris', tracker)

    expect(tracker.count).toHaveBeenCalledTimes(1)
    expect(tracker.count).toHaveBeenCalledWith('unsplash')
  })

  it('counts a failed (thrown) Unsplash request too', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(notOk)
    const tracker = { count: vi.fn() }

    const result = await fetchCityImage('Paris', tracker)

    expect(result).toBeNull()
    expect(tracker.count.mock.calls).toEqual([['unsplash'], ['pexels']])
  })

  it('records no unsplash count when UNSPLASH_ACCESS_KEY is missing', async () => {
    delete process.env.UNSPLASH_ACCESS_KEY
    vi.mocked(fetch).mockResolvedValueOnce(pexelsOk('https://images.pexels.com/paris.jpg'))
    const tracker = { count: vi.fn() }

    await fetchCityImage('Paris', tracker)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(tracker.count.mock.calls).toEqual([['pexels']])
  })

  it('records no pexels count when PEXELS_API_KEY is missing', async () => {
    delete process.env.PEXELS_API_KEY
    vi.mocked(fetch).mockResolvedValueOnce(notOk)
    const tracker = { count: vi.fn() }

    const result = await fetchCityImage('Paris', tracker)

    expect(result).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(tracker.count.mock.calls).toEqual([['unsplash']])
  })

  it('records nothing when both keys are missing', async () => {
    delete process.env.UNSPLASH_ACCESS_KEY
    delete process.env.PEXELS_API_KEY
    const tracker = { count: vi.fn() }

    expect(await fetchCityImage('Paris', tracker)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
    expect(tracker.count).not.toHaveBeenCalled()
  })

  it('fetchActivityImage counts both queries when the first query fails on both providers', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(notOk) // unsplash, primary query
      .mockResolvedValueOnce(notOk) // pexels, primary query
      .mockResolvedValueOnce(unsplashOk('https://images.unsplash.com/paris-fallback')) // unsplash, destination query
    const tracker = { count: vi.fn() }

    const result = await fetchActivityImage('XYZ Activity', 'Paris', tracker)

    expect(result).toBe('https://images.unsplash.com/paris-fallback')
    expect(tracker.count.mock.calls).toEqual([['unsplash'], ['pexels'], ['unsplash']])
  })

  it('fetchActivityImage counts only the first query when it succeeds', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(unsplashOk('https://images.unsplash.com/eiffel'))
    const tracker = { count: vi.fn() }

    await fetchActivityImage('Eiffel Tower', 'Paris', tracker)

    expect(tracker.count.mock.calls).toEqual([['unsplash']])
  })
})
