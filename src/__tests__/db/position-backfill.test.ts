// Local-DB parity and RLS check for supabase/migrations/20261006000000_activities_position_maybe.sql.
// Skipped unless LOCAL_DB_URL is set. It only ever connects to LOCAL_DB_URL (a local
// `npx supabase start` database after `npx supabase db reset --local`) and only deletes
// its own fixture itinerary by a fixed uuid.
//
//   export LOCAL_DB_URL="$(npx supabase status -o env | sed -n 's/^DB_URL="\(.*\)"$/\1/p')"
//   npx vitest run src/__tests__/db/position-backfill.test.ts
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { legacyOrder } from '@/lib/plan/legacy-order'

const DB_URL = process.env.LOCAL_DB_URL ?? ''
// Vitest runs from the repo root; under jsdom import.meta.url is not a file: URL.
const MIGRATION = path.resolve(
  process.cwd(),
  'supabase/migrations/20261006000000_activities_position_maybe.sql'
)

const FIXTURE_ITINERARY = '16021602-0000-4000-8000-000000000001'
const FIXTURE_USER = '16021602-0000-4000-8000-0000000000ff'

// Ids count DOWN as rows are inserted, so where ranks tie, the physical (ctid) order
// and the id order disagree. Parity therefore proves ties follow physical order.
const act = (n: number) => `16021602-0000-4000-8000-0000000001${String(99 - n).padStart(2, '0')}`

// [day_number, time] in insertion (physical) order.
const FIXTURE: [number, string | null][] = [
  [1, '9:00 AM'],
  [1, 'Evening'],
  [1, 'morning'],
  [1, '12:30 PM'],
  [1, '12:00 AM'],
  [2, '14:00'],
  [2, '10am'],
  [2, '9:30'],
  [2, 'Lunch'], // rank 10
  [2, ''], //      rank 10
  [2, null], //    rank 10
  [3, 'Afternoon'],
  [3, '13:00 PM'], // old quirk: 25h
  [3, 'Coffee'], // equal rank pair, insertion order must decide
  [3, 'Coffee'],
]

type Row = { id: string; day_number: number; time: string | null; position: number | null }

function psql(sql: string): string {
  return execFileSync('psql', [DB_URL, '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-f', '-'], {
    input: sql,
    encoding: 'utf8',
  }).trim()
}

function applyMigration(): void {
  execFileSync('psql', [DB_URL, '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f', MIGRATION], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

const sqlText = (v: string | null) => (v === null ? 'null' : `'${v.replace(/'/g, "''")}'`)

function cleanup(): void {
  // Normal session (not replica) so the activities FK cascade runs.
  psql(`
    delete from public.activities where itinerary_id = '${FIXTURE_ITINERARY}';
    delete from public.itineraries where id = '${FIXTURE_ITINERARY}';
  `)
}

function fixtureRows(): Row[] {
  const json = psql(`
    select coalesce(json_agg(json_build_object(
      'id', id, 'day_number', day_number, 'time', time, 'position', position
    ) order by ctid), '[]')
    from public.activities where itinerary_id = '${FIXTURE_ITINERARY}';
  `)
  return JSON.parse(json) as Row[]
}

describe.skipIf(!DB_URL)('activities position backfill on local Supabase', () => {
  beforeAll(() => {
    if (/supabase\.co/i.test(DB_URL)) throw new Error('LOCAL_DB_URL must point at a local database')
    cleanup()
    const values = FIXTURE.map(
      ([day, time], i) => `('${act(i)}', '${FIXTURE_ITINERARY}', ${day}, 'Fixture ${i}', ${sqlText(time)}, null)`
    ).join(',\n      ')
    // Replica mode skips FK triggers, so the fixture itinerary needs no auth user.
    psql(`
      set session_replication_role = replica;
      insert into public.itineraries (id, user_id, title) values ('${FIXTURE_ITINERARY}', '${FIXTURE_USER}', 'P16-02 fixture');
      insert into public.activities (id, itinerary_id, day_number, name, time, position) values
      ${values};
      reset session_replication_role;
    `)
    applyMigration()
  })

  afterAll(() => {
    cleanup()
  })

  it('fills a position for every fixture row', () => {
    const rows = fixtureRows()
    expect(rows).toHaveLength(FIXTURE.length)
    expect(rows.every((r) => r.position !== null)).toBe(true)
  })

  it('orders each day exactly as the old itinerary page did (legacyOrder)', () => {
    const rows = fixtureRows() // ctid order = the old unordered fetch
    const expected = legacyOrder(rows)
    const actual = new Map<number, string[]>()
    for (const day of expected.keys()) {
      actual.set(
        day,
        rows
          .filter((r) => r.day_number === day)
          .sort((a, b) => (a.position as number) - (b.position as number))
          .map((r) => r.id)
      )
    }
    expect(actual).toEqual(expected)
    // Sanity: day 2's three rank-10 rows (Lunch, '', null) come first and keep
    // physical order even though their ids count down.
    expect(actual.get(2)!.slice(0, 3)).toEqual([act(8), act(9), act(10)])
    // Day 3's equal pair ('Coffee', 'Coffee') also keeps physical order.
    expect(actual.get(3)).toEqual([act(11), act(13), act(14), act(12)])
  })

  it('is idempotent: re-applying the migration changes no position', () => {
    const before = fixtureRows().map((r) => [r.id, r.position])
    applyMigration()
    const after = fixtureRows().map((r) => [r.id, r.position])
    expect(after).toEqual(before)
  })

  it('makes day_number nullable and position double precision, with the index', () => {
    const out = psql(`
      select column_name || '=' || is_nullable || '/' || data_type
      from information_schema.columns
      where table_schema = 'public' and table_name = 'activities'
        and column_name in ('day_number', 'position')
      order by column_name;
      select count(*) from pg_indexes
      where schemaname = 'public' and tablename = 'activities'
        and indexname = 'activities_itinerary_day_position_idx';
    `)
    expect(out.split('\n')).toEqual([
      'day_number=YES/integer',
      'position=YES/double precision',
      '1',
    ])
  })

  it('accepts a Maybe row (day_number null)', () => {
    const out = psql(`
      begin;
      set local session_replication_role = replica;
      insert into public.activities (itinerary_id, day_number, name) values ('${FIXTURE_ITINERARY}', null, 'Maybe fixture');
      select count(*) from public.activities where itinerary_id = '${FIXTURE_ITINERARY}' and day_number is null;
      rollback;
    `)
    expect(out).toBe('1')
  })

  it('keeps RLS on and both activities policies unchanged', () => {
    const out = psql(`
      select relrowsecurity from pg_class where oid = 'public.activities'::regclass;
      select policyname || '|' || cmd || '|' || array_to_string(roles, ',')
      from pg_policies where schemaname = 'public' and tablename = 'activities'
      order by policyname;
    `)
    expect(out.split('\n')).toEqual([
      't',
      'Activities of public itineraries are viewable by anyone|SELECT|anon',
      'Users can manage own activities|ALL|authenticated',
    ])
  })
})
