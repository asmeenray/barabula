import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getHomeData, isFirstVisit } from '@/lib/home/data'
import { CITY_PHOTOS } from '@/lib/photos/manifest'

function client(result: { data: unknown; error: unknown }) {
  const chain = { select: vi.fn(), eq: vi.fn().mockResolvedValue(result) }
  chain.select.mockReturnValue(chain)
  const from = vi.fn(() => chain)
  return { supabase: { from } as unknown as SupabaseClient, from, chain }
}

const user = { id: 'user-1' } as User
// 11:00 UTC on 13 May 2026 (test instant, not a real trip).
const NOW = new Date('2026-05-13T11:00:00Z')

function row(over: Record<string, unknown>) {
  return {
    id: 'id',
    title: 'Trip',
    destination: null,
    start_date: null,
    end_date: null,
    updated_at: '2026-05-01T00:00:00Z',
    extra_data: null,
    activities: [],
    ...over,
  }
}

describe('getHomeData', () => {
  it('logged out: a curated cover city, no trips, no query', async () => {
    const { supabase, from } = client({ data: [], error: null })
    const data = await getHomeData(supabase, null, 'Europe/Lisbon', NOW)
    expect(CITY_PHOTOS).toContain(data.coverCity)
    expect(data.cities).toBe(CITY_PHOTOS)
    expect(data.tripCount).toBeNull()
    expect(data.now).toBeNull()
    expect(data.upcoming).toEqual([])
    expect(from).not.toHaveBeenCalled()
  })

  it("signed in: reads only the user's own trips and sections them for their today", async () => {
    const { supabase, chain } = client({
      data: [
        row({
          id: 'lis',
          title: 'Lisbon',
          destination: 'Lisbon',
          start_date: '2026-05-12',
          end_date: '2026-05-14',
          activities: [
            { id: 'a', day_number: 2, position: 1, name: 'Castelo de São Jorge', extra_data: null },
            { id: 'b', day_number: 1, position: 1, name: 'Praça do Comércio', extra_data: null },
          ],
        }),
        row({ id: 'por', title: 'Porto', destination: 'Porto', extra_data: { day_count: 2 } }),
        row({ id: 'prg', title: 'Prague', destination: 'Prague', start_date: '2026-04-01', end_date: '2026-04-04' }),
      ],
      error: null,
    })
    const data = await getHomeData(supabase, user, 'Europe/Lisbon', NOW)
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(data.today).toBe('2026-05-13')
    expect(data.tripCount).toBe(3)

    expect(data.now).toMatchObject({
      id: 'lis',
      title: 'Lisbon',
      status: 'Day 2 of 3',
      nextPlace: 'Castelo de São Jorge',
      dates: '12–14 May',
      when: '12–14 May',
      dayCount: 3,
      placeCount: 2,
      code: 'LIS',
    })
    expect(data.now?.photo?.city).toBe('Lisbon')
    expect(data.next).toBeNull()
    expect(data.upcoming.map((t) => t.id)).toEqual(['por'])
    expect(data.upcoming[0]).toMatchObject({ when: null, dates: null, dayCount: 2, status: 'Dates not set', photo: null })
    expect(data.past.map((t) => t.id)).toEqual(['prg'])
  })

  it('a multi-stop pass prints its stops as the title', async () => {
    const { supabase } = client({
      data: [
        row({
          id: 'x',
          title: 'Lisbon → Prague',
          destination: 'Lisbon',
          extra_data: { pass: { stops: ['Lisbon', 'Prague'], when: { kind: 'length', days: 4 } } },
        }),
      ],
      error: null,
    })
    const data = await getHomeData(supabase, user, 'UTC', NOW)
    expect(data.next).toMatchObject({ title: 'Lisbon → Prague', when: '4 days', code: undefined })
  })

  it('an invalid zone falls back to UTC', async () => {
    const { supabase } = client({ data: [], error: null })
    // 23:30 UTC on 12 May; Tokyo is already 13 May.
    const late = new Date('2026-05-12T23:30:00Z')
    expect((await getHomeData(supabase, user, 'Asia/Tokyo', late)).today).toBe('2026-05-13')
    expect((await getHomeData(supabase, user, 'Nowhere/Land', late)).today).toBe('2026-05-12')
    expect((await getHomeData(supabase, user, undefined, late)).today).toBe('2026-05-12')
  })

  it('a failed read is a null count and no trips, not zero', async () => {
    const { supabase } = client({ data: null, error: { message: 'down' } })
    const data = await getHomeData(supabase, user, 'UTC', NOW)
    expect(data.tripCount).toBeNull()
    expect(data.now).toBeNull()
    expect(data.past).toEqual([])
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
