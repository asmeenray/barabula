import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

type CookieToSet = { name: string; value: string; options: Record<string, unknown> }
type CookieMethods = {
  getAll: () => { name: string; value: string }[]
  setAll: (cookies: CookieToSet[], headers: Record<string, string>) => void
}

// Captures the cookie methods the proxy hands to createServerClient, so a test
// can play the part of @supabase/ssr refreshing the session.
let capturedCookies: CookieMethods | undefined
const mockGetUser = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(
    (_url: string, _key: string, options: { cookies: CookieMethods }) => {
      capturedCookies = options.cookies
      return { auth: { getUser: mockGetUser } }
    }
  ),
}))

import { proxy, config } from '../proxy'

const signedOut = { data: { user: null }, error: null }
const signedIn = { data: { user: { id: 'user-1' } }, error: null }

function request(path: string) {
  return new NextRequest(new URL(path, 'http://localhost:3000'))
}

function redirectPath(res: Response) {
  const location = res.headers.get('location')
  return location ? new URL(location).pathname : null
}

describe('proxy', () => {
  beforeEach(() => {
    capturedCookies = undefined
    mockGetUser.mockReset()
    mockGetUser.mockResolvedValue(signedOut)
  })

  it('redirects an anonymous request for /dashboard to /login', async () => {
    const res = await proxy(request('/dashboard'))
    expect(res.status).toBe(307)
    expect(redirectPath(res)).toBe('/login')
  })

  it('redirects an anonymous request for an itinerary without ?share=true', async () => {
    const res = await proxy(request('/itinerary/abc'))
    expect(redirectPath(res)).toBe('/login')
  })

  it.each(['/', '/login', '/register', '/auth/callback', '/itinerary/abc?share=true'])(
    'lets an anonymous request for %s through',
    async (path) => {
      const res = await proxy(request(path))
      expect(res.headers.get('location')).toBeNull()
      expect(res.headers.get('x-middleware-next')).toBe('1')
    }
  )

  it('lets a signed-in request for /dashboard through', async () => {
    mockGetUser.mockResolvedValue(signedIn)
    const res = await proxy(request('/dashboard'))
    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('validates the session with getUser() on every request', async () => {
    await proxy(request('/dashboard'))
    expect(mockGetUser).toHaveBeenCalledTimes(1)
  })

  it('copies refreshed cookies and cache headers from setAll onto the response', async () => {
    mockGetUser.mockImplementation(async () => {
      capturedCookies!.setAll(
        [{ name: 'sb-test-auth-token', value: 'refreshed', options: { path: '/' } }],
        { 'Cache-Control': 'private, no-store, test-value' }
      )
      return signedIn
    })

    const res = await proxy(request('/dashboard'))

    expect(res.headers.get('location')).toBeNull()
    expect(res.cookies.get('sb-test-auth-token')?.value).toBe('refreshed')
    expect(res.headers.get('cache-control')).toBe('private, no-store, test-value')
  })

  it('keeps the matcher that skips static assets', () => {
    expect(config.matcher).toEqual([
      '/((?!_next/static|_next/image|favicon.ico|maplibre/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mjs)$).*)',
    ])
  })

  // D-38: static files (AVIF photos, the MapLibre worker) skip the proxy so
  // logged-out visitors can load them; every page and API route still runs it.
  describe('matcher', () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`)

    it.each([
      '/images/cities/lisbon-l.avif',
      '/maplibre/maplibre-gl-worker.mjs',
      '/maplibre/maplibre-gl-shared.mjs',
    ])('skips the static file %s', (path) => {
      expect(matcher.test(path)).toBe(false)
    })

    it.each([
      '/places',
      '/you',
      '/itinerary/0b6c6a59-6d6a-4b8a-9a8e-1f2d3c4b5a69',
      '/api/activities',
    ])('still runs the proxy for %s', (path) => {
      expect(matcher.test(path)).toBe(true)
    })
  })
})
