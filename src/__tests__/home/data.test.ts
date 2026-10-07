import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getHomeData, isFirstVisit } from '@/lib/home/data'
import { CITY_PHOTOS } from '@/lib/photos/manifest'

function client(result: { count: number | null; error: unknown }) {
  const chain = { select: vi.fn(), eq: vi.fn().mockResolvedValue(result) }
  chain.select.mockReturnValue(chain)
  const from = vi.fn(() => chain)
  return { supabase: { from } as unknown as SupabaseClient, from, chain }
}

const user = { id: 'user-1' } as User

describe('getHomeData', () => {
  it('logged out: a curated cover city and no trip count, no query', async () => {
    const { supabase, from } = client({ count: 0, error: null })
    const data = await getHomeData(supabase, null)
    expect(CITY_PHOTOS).toContain(data.coverCity)
    expect(data.cities).toBe(CITY_PHOTOS)
    expect(data.tripCount).toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it("signed in: counts the user's own trips", async () => {
    const { supabase, chain } = client({ count: 2, error: null })
    const data = await getHomeData(supabase, user)
    expect(data.tripCount).toBe(2)
    expect(chain.select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('a failed count is null, not zero', async () => {
    const { supabase } = client({ count: null, error: { message: 'down' } })
    expect((await getHomeData(supabase, user)).tripCount).toBeNull()
  })
})

describe('isFirstVisit', () => {
  it('logged out or no trips', () => {
    expect(isFirstVisit(false, null)).toBe(true)
    expect(isFirstVisit(true, 0)).toBe(true)
    expect(isFirstVisit(true, 3)).toBe(false)
    expect(isFirstVisit(true, null)).toBe(false)
  })
})
