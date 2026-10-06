import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { test as setup, expect } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { assertLocalUrl, localSupabaseEnv } from './helpers/local-env'
import {
  E2E_PASSWORD,
  FIXTURES_PATH,
  OTHER_EMAIL,
  OWNER_EMAIL,
  type E2EFixtures,
} from './helpers/fixtures'

// LOCAL ONLY (T-16-06). localSupabaseEnv() refuses any non-local host and the
// reset below always passes --local. Never point this at the live project.

type Place = { name: string; location: string; kind: string; ll?: [number, number] }

// Real Lisbon places with OpenStreetMap coordinates ([lng, lat]), from the
// phase 16 directions sketch.
const LISBON = {
  comercio: { name: 'Praça do Comércio', kind: 'Square', location: 'Baixa', ll: [-9.1365238, 38.7077151] },
  justa: { name: 'Elevador de Santa Justa', kind: 'Lift', location: 'Baixa', ll: [-9.1393753, 38.7121169] },
  bertrand: { name: 'Livraria Bertrand', kind: 'Bookshop', location: 'Chiado', ll: [-9.1411539, 38.7106621] },
  timeout: { name: 'Time Out Market', kind: 'Food hall', location: 'Cais do Sodré', ll: [-9.1458973, 38.7070934] },
  luzia: { name: 'Miradouro de Santa Luzia', kind: 'Viewpoint', location: 'Alfama', ll: [-9.130216, 38.7117413] },
  castelo: { name: 'Castelo de São Jorge', kind: 'Castle', location: 'Alfama', ll: [-9.133483, 38.7139258] },
  graca: { name: 'Miradouro da Graça', kind: 'Viewpoint', location: 'Graça', ll: [-9.1315673, 38.7163749] },
  alcantara: { name: 'Miradouro de São Pedro de Alcântara', kind: 'Viewpoint', location: 'Bairro Alto', ll: [-9.1440371, 38.7154576] },
  lx: { name: 'LX Factory', kind: 'Market', location: 'Alcântara', ll: [-9.1786619, 38.7026001] },
  maat: { name: 'MAAT', kind: 'Museum', location: 'Belém', ll: [-9.1936238, 38.695934] },
  pasteis: { name: 'Pastéis de Belém', kind: 'Bakery', location: 'Belém', ll: [-9.2033202, 38.6974795] },
  jeronimos: { name: 'Mosteiro dos Jerónimos', kind: 'Monastery', location: 'Belém', ll: [-9.2066239, 38.6977577] },
  torre: { name: 'Torre de Belém', kind: 'Fort', location: 'Belém', ll: [-9.2159288, 38.691586] },
} satisfies Record<string, Place>

/** ISO YYYY-MM-DD for today + offset days, in local time. */
function isoDay(offset: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

type Geo = 'coords' | 'none' | 'not_found'

function activityRow(
  itineraryId: string,
  day: number | null,
  position: number,
  place: Place,
  geo: Geo
) {
  let extra: Record<string, unknown> = {}
  if (geo === 'coords' && place.ll) {
    extra = { lat: place.ll[1], lng: place.ll[0], geo_source: 'osm_nominatim' }
  } else if (geo === 'not_found') {
    extra = { geo_status: 'not_found', geocoded_at: new Date().toISOString() }
  }
  return {
    itinerary_id: itineraryId,
    day_number: day,
    position,
    name: place.name,
    location: place.location,
    description: place.kind,
    activity_type: 'activity',
    extra_data: extra,
  }
}

async function waitForAuth(admin: SupabaseClient) {
  // db reset restarts services; poll until the auth admin API answers.
  const deadline = Date.now() + 60_000
  let lastError: unknown = null
  while (Date.now() < deadline) {
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (!error) return
    lastError = error
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`Local auth did not come back after db reset: ${String(lastError)}`)
}

async function createUser(admin: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: E2E_PASSWORD,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`)
  return data.user.id
}

async function insertTrip(admin: SupabaseClient, row: Record<string, unknown>): Promise<string> {
  const { data, error } = await admin.from('itineraries').insert(row).select('id').single()
  if (error || !data) throw new Error(`insert itinerary ${String(row.title)}: ${error?.message}`)
  return data.id as string
}

async function insertActivities(
  admin: SupabaseClient,
  rows: ReturnType<typeof activityRow>[]
): Promise<{ id: string; day_number: number | null; position: number }[]> {
  const { data, error } = await admin
    .from('activities')
    .insert(rows)
    .select('id, day_number, position')
  if (error || !data) throw new Error(`insert activities: ${error?.message}`)
  return data as { id: string; day_number: number | null; position: number }[]
}

setup('reset local database and seed fixtures', async () => {
  setup.setTimeout(240_000)
  const env = localSupabaseEnv()
  assertLocalUrl(env.apiUrl)

  execSync('npx supabase db reset --local', { stdio: 'inherit' })

  const admin = createClient(env.apiUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  await waitForAuth(admin)

  const ownerId = await createUser(admin, OWNER_EMAIL)
  await createUser(admin, OTHER_EMAIL)

  // public.users row comes from the on_auth_user_created trigger.
  const { data: ownerRow } = await admin.from('users').select('id').eq('id', ownerId).single()
  expect(ownerRow?.id).toBe(ownerId)

  // (1) Lisbon: dated 3-day trip, 4 places per day, plus one Maybe place.
  const lisbonId = await insertTrip(admin, {
    user_id: ownerId,
    title: 'Lisbon',
    destination: 'Lisbon',
    start_date: isoDay(10),
    end_date: isoDay(12),
  })
  const L = LISBON
  const lisbonRows = await insertActivities(admin, [
    activityRow(lisbonId, 1, 1, L.comercio, 'coords'),
    activityRow(lisbonId, 1, 2, L.justa, 'coords'),
    activityRow(lisbonId, 1, 3, L.bertrand, 'coords'),
    activityRow(lisbonId, 1, 4, L.timeout, 'coords'),
    // Day 2: two places with a location but no coordinates.
    activityRow(lisbonId, 2, 1, L.luzia, 'coords'),
    activityRow(lisbonId, 2, 2, L.castelo, 'none'),
    activityRow(lisbonId, 2, 3, L.graca, 'none'),
    activityRow(lisbonId, 2, 4, L.alcantara, 'coords'),
    // Day 3: one place the geocoder could not find.
    activityRow(lisbonId, 3, 1, L.lx, 'not_found'),
    activityRow(lisbonId, 3, 2, L.pasteis, 'coords'),
    activityRow(lisbonId, 3, 3, L.jeronimos, 'coords'),
    activityRow(lisbonId, 3, 4, L.torre, 'coords'),
    // Maybe bucket: day_number null.
    activityRow(lisbonId, null, 1, L.maat, 'coords'),
  ])

  // (2) Porto: undated, 2 days, places by name and location only.
  const portoId = await insertTrip(admin, {
    user_id: ownerId,
    title: 'Porto',
    destination: 'Porto',
    start_date: null,
    end_date: null,
    extra_data: { day_count: 2 },
  })
  await insertActivities(admin, [
    activityRow(portoId, 1, 1, { name: 'Livraria Lello', location: 'Vitória', kind: 'Bookshop' }, 'none'),
    activityRow(portoId, 2, 1, { name: 'Ponte Luís I', location: 'Ribeira', kind: 'Bridge' }, 'none'),
  ])

  // (3) Prague: past trip, two places, no coordinates.
  const pragueId = await insertTrip(admin, {
    user_id: ownerId,
    title: 'Prague',
    destination: 'Prague',
    start_date: isoDay(-40),
    end_date: isoDay(-37),
  })
  await insertActivities(admin, [
    activityRow(pragueId, 1, 1, { name: 'Karlův most', location: 'Staré Město', kind: 'Bridge' }, 'none'),
    activityRow(pragueId, 2, 1, { name: 'Pražský hrad', location: 'Hradčany', kind: 'Castle' }, 'none'),
  ])

  const activityIds: Record<string, string[]> = {}
  for (const row of [...lisbonRows].sort((a, b) => a.position - b.position)) {
    const key = row.day_number === null ? 'maybe' : String(row.day_number)
    ;(activityIds[key] ??= []).push(row.id)
  }

  const fixtures: E2EFixtures = {
    ownerEmail: OWNER_EMAIL,
    otherEmail: OTHER_EMAIL,
    lisbonId,
    portoId,
    pragueId,
    activityIds,
  }
  mkdirSync(path.dirname(FIXTURES_PATH), { recursive: true })
  writeFileSync(FIXTURES_PATH, JSON.stringify(fixtures, null, 2))
})
