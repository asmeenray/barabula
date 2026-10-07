import { describe, expect, it } from 'vitest'
import {
  applyTripUpdate,
  dayCountAfter,
  inverseTripUpdate,
  mergeTripUpdates,
  movedToMaybeLabel,
  tripAnswers,
  tripUpdateFor,
} from '@/lib/plan/trip-patch'
import type { PlanTrip } from '@/lib/plan/types'

// Trip-details edits (16-17, D-20): answers → PATCH body, local apply and the
// inverse for Undo.

function trip(over: Partial<PlanTrip> = {}): PlanTrip {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    user_id: 'user-1',
    title: 'Lisbon',
    description: null,
    destination: 'Lisbon',
    start_date: '2026-05-12',
    end_date: '2026-05-14',
    cover_image_url: null,
    extra_data: null,
    is_public: false,
    created_at: null,
    updated_at: null,
    ...over,
  }
}

describe('tripAnswers', () => {
  it('uses the trip dates and the city when there is no pass', () => {
    expect(tripAnswers(trip())).toEqual({
      stops: ['Lisbon'],
      when: { kind: 'dates', start: '2026-05-12', end: '2026-05-14' },
      adults: null,
      kids: null,
      interests: [],
      note: null,
    })
  })

  it('reads the stored pass; stored dates the trip no longer has are dropped', () => {
    const t = trip({
      start_date: null,
      end_date: null,
      extra_data: {
        pass: {
          v: 1,
          stops: ['Lisbon', 'Porto'],
          when: { kind: 'dates', start: '2026-05-12', end: '2026-05-14' },
          adults: 2,
          kids: 1,
          interests: ['Views', 'Food', 'Nope'],
          note: 'No early starts',
        },
      },
    })
    expect(tripAnswers(t)).toEqual({
      stops: ['Lisbon', 'Porto'],
      when: null,
      adults: 2,
      kids: 1,
      interests: ['Food', 'Views'],
      note: 'No early starts',
    })
    expect(tripAnswers(trip({ start_date: null, end_date: null, extra_data: { pass: { when: { kind: 'length', days: 4 } } } })).when).toEqual({
      kind: 'length',
      days: 4,
    })
  })
})

describe('tripUpdateFor', () => {
  it('stops set the title and destination', () => {
    expect(tripUpdateFor({ stops: ['Porto', 'Braga'] }, 3)).toEqual({
      title: 'Porto → Braga',
      destination: 'Porto',
      extra_data: { pass: { stops: ['Porto', 'Braga'] } },
    })
  })

  it('dates set both dates and the span as day_count', () => {
    const when = { kind: 'dates' as const, start: '2026-05-12', end: '2026-05-13' }
    expect(tripUpdateFor({ when }, 3)).toEqual({
      start_date: '2026-05-12',
      end_date: '2026-05-13',
      extra_data: { pass: { when }, day_count: 2 },
    })
  })

  it('a length clears the dates; Not sure yet keeps the current day count', () => {
    expect(tripUpdateFor({ when: { kind: 'length', days: 5 } }, 3)).toMatchObject({
      start_date: null,
      end_date: null,
      extra_data: { day_count: 5 },
    })
    expect(tripUpdateFor({ when: { kind: 'unsure' } }, 4)).toMatchObject({
      start_date: null,
      end_date: null,
      extra_data: { day_count: 4 },
    })
  })

  it('who and into only touch the pass', () => {
    expect(tripUpdateFor({ adults: 3, kids: 0 }, 3)).toEqual({ extra_data: { pass: { adults: 3, kids: 0 } } })
    expect(dayCountAfter(tripUpdateFor({ adults: 3, kids: 0 }, 3), 3)).toBe(3)
  })
})

describe('apply and inverse', () => {
  it('applies the update the way the server merges it', () => {
    const t = trip({ extra_data: { flights: [1], pass: { v: 1, adults: 1, client_ref: 'x' } } })
    const next = applyTripUpdate(t, { extra_data: { pass: { adults: 3, kids: 0 }, day_count: 2 } })
    expect(next.extra_data).toEqual({
      flights: [1],
      day_count: 2,
      pass: { v: 1, adults: 3, kids: 0, client_ref: 'x' },
    })
  })

  it('the inverse puts back dates, day count and answers (skipped answers as null)', () => {
    const t = trip()
    const update = tripUpdateFor({ when: { kind: 'dates', start: '2026-05-12', end: '2026-05-13' } }, 3)
    expect(inverseTripUpdate(t, update, 3)).toEqual({
      start_date: '2026-05-12',
      end_date: '2026-05-14',
      extra_data: { pass: { when: null }, day_count: 3 },
    })
    expect(inverseTripUpdate(t, tripUpdateFor({ adults: 3, kids: 0 }, 3), 3)).toEqual({
      extra_data: { pass: { adults: null, kids: null } },
    })
    expect(inverseTripUpdate(t, tripUpdateFor({ stops: ['Porto'] }, 3), 3)).toEqual({
      title: 'Lisbon',
      destination: 'Lisbon',
      extra_data: { pass: { stops: ['Lisbon'] } },
    })
  })

  it('merges pending updates key by key', () => {
    expect(
      mergeTripUpdates({ title: 'A', extra_data: { pass: { adults: 2 } } }, { extra_data: { pass: { kids: 1 }, day_count: 2 } })
    ).toEqual({ title: 'A', extra_data: { pass: { adults: 2, kids: 1 }, day_count: 2 } })
  })

  it('toast label', () => {
    expect(movedToMaybeLabel(1)).toBe('1 place moved to Maybe')
    expect(movedToMaybeLabel(4)).toBe('4 places moved to Maybe')
  })
})
