import { describe, it, expect, vi, beforeEach } from 'vitest'

// POST /api/activities (16-11, D-18): JSON only, strict zod body, explicit
// ownership check on the itinerary (T-16-31), server-computed position at the
// end of the target bucket (a day, or Maybe when day_number is null).

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSupabase = { auth: { getUser: mockGetUser }, from: mockFrom }
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

const ITIN = '3f2b8c1e-4d5a-4b6c-9d7e-1a2b3c4d5e6f'
const USER = { id: 'user-1' }

type Result = { data: unknown; error: unknown }

interface Calls {
  ownerEq: Array<[string, unknown]>
  bucketEq: Array<[string, unknown]>
  bucketIs: Array<[string, unknown]>
  inserted: Record<string, unknown> | null
}

let calls: Calls

/**
 * itineraries: select → eq → eq → maybeSingle (owner check)
 * activities (read): select → eq → eq|is → order → limit → maybeSingle (max position)
 * activities (write): insert → select → single
 */
function mockDb(opts: {
  owned?: boolean
  ownerError?: unknown
  maxPosition?: number | null
  insertResult?: Result
}) {
  const { owned = true, ownerError = null, maxPosition = null } = opts
  mockFrom.mockImplementation((table: string) => {
    if (table === 'itineraries') {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn((col: string, val: unknown) => {
          calls.ownerEq.push([col, val])
          return chain
        }),
        maybeSingle: vi.fn().mockResolvedValue({ data: owned ? { id: ITIN } : null, error: ownerError }),
      }
      return chain
    }
    if (table === 'activities') {
      const read = {
        eq: vi.fn((col: string, val: unknown) => {
          calls.bucketEq.push([col, val])
          return read
        }),
        is: vi.fn((col: string, val: unknown) => {
          calls.bucketIs.push([col, val])
          return read
        }),
        not: vi.fn(() => read),
        order: vi.fn(() => read),
        limit: vi.fn(() => read),
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: maxPosition === null ? null : { position: maxPosition }, error: null }),
      }
      return {
        select: vi.fn(() => read),
        insert: vi.fn((row: Record<string, unknown>) => {
          calls.inserted = row
          const write = {
            select: vi.fn(() => write),
            single: vi
              .fn()
              .mockResolvedValue(opts.insertResult ?? { data: { id: 'new-id', ...row }, error: null }),
          }
          return write
        }),
      }
    }
    throw new Error(`unexpected table ${table}`)
  })
}

async function post(body: unknown, contentType = 'application/json') {
  const { POST } = await import('@/app/api/activities/route')
  const req = new Request('http://localhost/api/activities', {
    method: 'POST',
    headers: contentType ? { 'Content-Type': contentType } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
  return POST(req)
}

function valid(extra: Record<string, unknown> = {}) {
  return { itinerary_id: ITIN, day_number: 2, name: 'Test place', ...extra }
}

describe('POST /api/activities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    calls = { ownerEq: [], bucketEq: [], bucketIs: [], inserted: null }
    mockGetUser.mockResolvedValue({ data: { user: USER }, error: null })
  })

  it('returns 401 without a user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await post(valid())
    expect(res.status).toBe(401)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 415 for a non-JSON body', async () => {
    const res = await post('name=X', 'application/x-www-form-urlencoded')
    expect(res.status).toBe(415)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it.each([
    ['missing name', { itinerary_id: ITIN, day_number: 1 }],
    ['blank name', valid({ name: '   ' })],
    ['name of 201 characters', valid({ name: 'x'.repeat(201) })],
    ['day_number 31', valid({ day_number: 31 })],
    ['day_number 0', valid({ day_number: 0 })],
    ['non-uuid itinerary', valid({ itinerary_id: 'nope' })],
    ['unknown extra_data key', valid({ extra_data: { lat: 1 } })],
    ['unknown top-level key', valid({ position: 5 })],
    ['time over 20 characters', valid({ time: 'x'.repeat(21) })],
  ])('returns 400 for %s', async (_label, body) => {
    mockDb({})
    const res = await post(body)
    expect(res.status).toBe(400)
    expect(calls.inserted).toBeNull()
  })

  it('returns 404 and inserts nothing when the itinerary is not the user’s', async () => {
    mockDb({ owned: false })
    const res = await post(valid())
    expect(res.status).toBe(404)
    expect(calls.inserted).toBeNull()
    expect(calls.ownerEq).toContainEqual(['id', ITIN])
    expect(calls.ownerEq).toContainEqual(['user_id', USER.id])
  })

  it('appends to the end of the day: max position + 1', async () => {
    mockDb({ maxPosition: 4 })
    const res = await post(valid({ day_number: 2 }))
    expect(res.status).toBe(201)
    expect(calls.bucketEq).toContainEqual(['itinerary_id', ITIN])
    expect(calls.bucketEq).toContainEqual(['day_number', 2])
    expect(calls.inserted).toMatchObject({ itinerary_id: ITIN, day_number: 2, name: 'Test place', position: 5 })
  })

  it('uses position 1 when the day is empty', async () => {
    mockDb({ maxPosition: null })
    await post(valid({ day_number: 3 }))
    expect(calls.inserted).toMatchObject({ day_number: 3, position: 1 })
  })

  it('reads the Maybe bucket (day_number is null) for a Maybe place', async () => {
    mockDb({ maxPosition: 1.5 })
    const res = await post(valid({ day_number: null }))
    expect(res.status).toBe(201)
    expect(calls.bucketIs).toContainEqual(['day_number', null])
    expect(calls.inserted).toMatchObject({ day_number: null, position: 2.5 })
  })

  it('stores a fixed time and returns the row with 201', async () => {
    mockDb({})
    const res = await post(valid({ time: '19:30', extra_data: { fixed_time: true } }))
    expect(res.status).toBe(201)
    expect(calls.inserted).toMatchObject({ time: '19:30', extra_data: { fixed_time: true } })
    const row = await res.json()
    expect(row).toMatchObject({ id: 'new-id', name: 'Test place' })
  })

  it('trims text and stores blank optional text as null', async () => {
    mockDb({})
    await post(valid({ name: '  Café  ', location: '  ', description: '', time: null }))
    expect(calls.inserted).toMatchObject({ name: 'Café', location: null, description: null, time: null })
  })

  it('returns a generic 500 on a database error', async () => {
    mockDb({ insertResult: { data: null, error: { message: 'secret db detail', code: '23505' } } })
    const res = await post(valid())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain('secret')
  })

  it('returns a generic 500 when the ownership read fails', async () => {
    mockDb({ ownerError: { message: 'boom' } })
    const res = await post(valid())
    expect(res.status).toBe(500)
    expect(calls.inserted).toBeNull()
  })
})
