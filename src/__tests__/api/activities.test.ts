import { describe, it, expect, vi, beforeEach } from 'vitest'

// PATCH /api/activities/[id] (16-07): JSON only, zod-validated, extra_data
// allow-list merge, geo cache cleared on location change, generic errors.

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSupabase = { auth: { getUser: mockGetUser }, from: mockFrom }
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

const ID = '3f2b8c1e-4d5a-4b6c-9d7e-1a2b3c4d5e6f'
const GEO = {
  lat: 38.7,
  lng: -9.1,
  geo_source: 'osm_nominatim',
  geo_status: 'found',
  geocoded_at: '2026-10-01T00:00:00Z',
}

type Result = { data: unknown; error: unknown }

/** The read of the existing row (select → eq → maybeSingle). */
function readChain(result: Result) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return chain
}

/** The update (update → eq → select → maybeSingle). */
function updateChain(result: Result) {
  const chain = {
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return chain
}

function patchRequest(body: unknown, contentType = 'application/json') {
  return new Request(`http://localhost/api/activities/${ID}`, {
    method: 'PATCH',
    headers: contentType ? { 'Content-Type': contentType } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function patch(body: unknown, opts: { id?: string; contentType?: string } = {}) {
  const { PATCH } = await import('@/app/api/activities/[id]/route')
  const req = patchRequest(body, opts.contentType)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return PATCH(req as any, { params: Promise.resolve({ id: opts.id ?? ID }) })
}

function signedIn() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
}

describe('PATCH /api/activities/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 401 without a user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await patch({ name: 'X' })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 415 when the body is not JSON', async () => {
    signedIn()
    const res = await patch('name=X', { contentType: 'text/plain' })
    expect(res.status).toBe(415)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 415 for a form post (cross-site write)', async () => {
    signedIn()
    const res = await patch('name=X', { contentType: 'application/x-www-form-urlencoded' })
    expect(res.status).toBe(415)
  })

  it('accepts application/json with a charset', async () => {
    signedIn()
    const upd = updateChain({ data: { id: ID, name: 'X' }, error: null })
    mockFrom.mockReturnValueOnce(upd)
    const res = await patch({ name: 'X' }, { contentType: 'application/json; charset=utf-8' })
    expect(res.status).toBe(200)
  })

  it('returns 400 for malformed JSON', async () => {
    signedIn()
    const res = await patch('{"name":', { contentType: 'application/json' })
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 400 when the id is not a uuid', async () => {
    signedIn()
    const res = await patch({ name: 'X' }, { id: 'not-a-uuid' })
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('merges extra_data.visited into the existing extra_data, keeping sibling keys', async () => {
    signedIn()
    const read = readChain({ data: { extra_data: { ...GEO, note_x: 1 }, location: 'Belém' }, error: null })
    const upd = updateChain({ data: { id: ID }, error: null })
    mockFrom.mockReturnValueOnce(read).mockReturnValueOnce(upd)

    const res = await patch({ extra_data: { visited: true } })
    expect(res.status).toBe(200)
    expect(upd.update).toHaveBeenCalledWith({ extra_data: { ...GEO, note_x: 1, visited: true } })
    expect(read.eq).toHaveBeenCalledWith('id', ID)
    expect(upd.eq).toHaveBeenCalledWith('id', ID)
  })

  it('treats a missing extra_data as empty when merging', async () => {
    signedIn()
    mockFrom
      .mockReturnValueOnce(readChain({ data: { extra_data: null, location: null }, error: null }))
      .mockReturnValueOnce(updateChain({ data: { id: ID }, error: null }))
    const upd = mockFrom.mock.results
    const res = await patch({ extra_data: { visited: false, fixed_time: true } })
    expect(res.status).toBe(200)
    const chain = upd[1].value as ReturnType<typeof updateChain>
    expect(chain.update).toHaveBeenCalledWith({ extra_data: { visited: false, fixed_time: true } })
  })

  it('rejects extra_data keys outside the allow-list', async () => {
    signedIn()
    const res = await patch({ extra_data: { lat: 1 } })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid request' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('rejects unknown top-level keys (no mass assignment)', async () => {
    signedIn()
    const res = await patch({ itinerary_id: ID })
    expect(res.status).toBe(400)
  })

  it('rejects an empty patch', async () => {
    signedIn()
    const res = await patch({})
    expect(res.status).toBe(400)
  })

  it('accepts day_number null (Maybe)', async () => {
    signedIn()
    const upd = updateChain({ data: { id: ID, day_number: null }, error: null })
    mockFrom.mockReturnValueOnce(upd)
    const res = await patch({ day_number: null })
    expect(res.status).toBe(200)
    expect(upd.update).toHaveBeenCalledWith({ day_number: null })
  })

  it.each([
    [{ day_number: 31 }],
    [{ day_number: 0 }],
    [{ day_number: 1.5 }],
    [{ position: 'x' }],
    [{ name: '' }],
    [{ name: 'x'.repeat(201) }],
    [{ description: 'x'.repeat(2001) }],
    [{ extra_data: { visited: 'yes' } }],
  ])('rejects %j', async (body) => {
    signedIn()
    const res = await patch(body)
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('accepts a finite position and trims the name', async () => {
    signedIn()
    const upd = updateChain({ data: { id: ID }, error: null })
    mockFrom.mockReturnValueOnce(upd)
    const res = await patch({ position: 1.5, name: '  Belém Tower  ' })
    expect(res.status).toBe(200)
    expect(upd.update).toHaveBeenCalledWith({ position: 1.5, name: 'Belém Tower' })
  })

  it('stores blank optional text as null', async () => {
    signedIn()
    const upd = updateChain({ data: { id: ID }, error: null })
    mockFrom.mockReturnValueOnce(upd)
    const res = await patch({ time: '', description: '  ', tips: null })
    expect(res.status).toBe(200)
    expect(upd.update).toHaveBeenCalledWith({ time: null, description: null, tips: null })
  })

  it('clears the five cached geo keys when the location changes', async () => {
    signedIn()
    const read = readChain({ data: { extra_data: { ...GEO, visited: true }, location: 'Old place' }, error: null })
    const upd = updateChain({ data: { id: ID }, error: null })
    mockFrom.mockReturnValueOnce(read).mockReturnValueOnce(upd)

    const res = await patch({ location: 'New place' })
    expect(res.status).toBe(200)
    expect(upd.update).toHaveBeenCalledWith({ location: 'New place', extra_data: { visited: true } })
  })

  it('keeps the cached geo keys when the location is unchanged', async () => {
    signedIn()
    const read = readChain({ data: { extra_data: { ...GEO }, location: 'Belém' }, error: null })
    const upd = updateChain({ data: { id: ID }, error: null })
    mockFrom.mockReturnValueOnce(read).mockReturnValueOnce(upd)

    const res = await patch({ location: 'Belém', extra_data: { visited: true } })
    expect(res.status).toBe(200)
    expect(upd.update).toHaveBeenCalledWith({ location: 'Belém', extra_data: { ...GEO, visited: true } })
  })

  it('returns 404 when the row is not visible (RLS) on read', async () => {
    signedIn()
    mockFrom.mockReturnValueOnce(readChain({ data: null, error: null }))
    const res = await patch({ extra_data: { visited: true } })
    expect(res.status).toBe(404)
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('returns 404 when the update touches no row (RLS)', async () => {
    signedIn()
    mockFrom.mockReturnValueOnce(updateChain({ data: null, error: null }))
    const res = await patch({ name: 'X' })
    expect(res.status).toBe(404)
  })

  it('returns a generic 500 and never the raw database message', async () => {
    signedIn()
    mockFrom.mockReturnValueOnce(
      updateChain({ data: null, error: { message: 'relation "activities" secret detail', code: '42P01' } })
    )
    const res = await patch({ name: 'X' })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: "Couldn't save" })
    expect(JSON.stringify(body)).not.toContain('secret')
  })

  it('returns a generic 500 when the read fails', async () => {
    signedIn()
    mockFrom.mockReturnValueOnce(readChain({ data: null, error: { message: 'boom detail' } }))
    const res = await patch({ extra_data: { visited: true } })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Couldn't save" })
  })
})

/** The delete (delete → eq → select('id')). */
function deleteChain(result: Result) {
  const chain = {
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    select: vi.fn().mockResolvedValue(result),
  }
  return chain
}

async function del(id = ID) {
  const { DELETE } = await import('@/app/api/activities/[id]/route')
  const req = new Request(`http://localhost/api/activities/${id}`, { method: 'DELETE' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return DELETE(req as any, { params: Promise.resolve({ id }) })
}

describe('DELETE /api/activities/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 401 without a user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await del()
    expect(res.status).toBe(401)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 400 for a non-uuid id without touching the database', async () => {
    signedIn()
    const res = await del('not-a-uuid')
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('deletes through the RLS client and returns 200 { success: true }', async () => {
    signedIn()
    const chain = deleteChain({ data: [{ id: ID }], error: null })
    mockFrom.mockReturnValueOnce(chain)
    const res = await del()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(mockFrom).toHaveBeenCalledWith('activities')
    expect(chain.eq).toHaveBeenCalledWith('id', ID)
    expect(chain.select).toHaveBeenCalledWith('id')
  })

  it("returns 404 when no row matched (another user's place or already gone)", async () => {
    signedIn()
    mockFrom.mockReturnValueOnce(deleteChain({ data: [], error: null }))
    const res = await del()
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found' })
  })

  it('returns 500 with a generic message on a database error', async () => {
    signedIn()
    mockFrom.mockReturnValueOnce(deleteChain({ data: null, error: { message: 'raw detail', code: 'XX000' } }))
    const res = await del()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: "Couldn't save" })
    expect(JSON.stringify(body)).not.toContain('raw detail')
  })
})
