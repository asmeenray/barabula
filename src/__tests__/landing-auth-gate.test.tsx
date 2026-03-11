import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HeroInput } from '@/components/landing/HeroInput'

const mockPush = vi.fn()
const mockSignInWithOAuth = vi.fn().mockResolvedValue({ data: {}, error: null })

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}))

vi.mock('@/lib/landing/prompt-store', () => ({
  savePrompt: vi.fn(),
  getPrompt: vi.fn(),
  clearPrompt: vi.fn(),
}))

beforeEach(() => {
  mockPush.mockReset()
  mockSignInWithOAuth.mockReset()
  mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null })
})

describe('HeroInput auth gate', () => {
  it('renders the input and Plan trip button', () => {
    render(<HeroInput value="" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /plan trip/i })).toBeTruthy()
  })

  it('Plan trip button is disabled when input is empty', () => {
    render(<HeroInput value="" onChange={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /plan trip/i }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('calls signInWithOAuth for unauthenticated user with correct redirectTo', async () => {
    render(<HeroInput value="Paris trip" onChange={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /plan trip/i })
    fireEvent.click(btn)
    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
          options: expect.objectContaining({
            redirectTo: expect.stringContaining('/auth/callback?next=/chat?q='),
          }),
        })
      )
    })
  })
})
