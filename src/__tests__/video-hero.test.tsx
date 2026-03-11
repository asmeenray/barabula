import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { VideoHero } from '@/components/landing/VideoHero'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  }),
}))

describe('VideoHero', () => {
  it('renders a video element', () => {
    const { container } = render(<VideoHero />)
    const video = container.querySelector('video')
    expect(video).toBeTruthy()
  })

  it('video has autoPlay muted loop playsInline', () => {
    const { container } = render(<VideoHero />)
    const video = container.querySelector('video') as HTMLVideoElement
    expect(video.autoplay).toBe(true)
    expect(video.muted).toBe(true)
    expect(video.loop).toBe(true)
    expect(video.playsInline).toBe(true)
  })

  it('video has preload set to none', () => {
    const { container } = render(<VideoHero />)
    const video = container.querySelector('video') as HTMLVideoElement
    expect(video.preload).toBe('none')
  })

  it('renders both webm and mp4 sources', () => {
    const { container } = render(<VideoHero />)
    const sources = container.querySelectorAll('video source')
    const types = Array.from(sources).map(s => s.getAttribute('type'))
    expect(types).toContain('video/webm')
    expect(types).toContain('video/mp4')
  })

  it('renders the gradient overlay', () => {
    const { container } = render(<VideoHero />)
    const overlay = container.querySelector('[class*="bg-gradient-to-b"]')
    expect(overlay).toBeTruthy()
  })
})
