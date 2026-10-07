import { describe, it, expect } from 'vitest'
import { daysBetween, todayInZone } from '@/lib/home/today'
import { nextPlaceFor, statusLine } from '@/lib/home/status'

// Test dates only (fixed calendar days, not real trips).
const trip = { destination: 'Lisbon', title: 'Lisbon', start_date: '2026-05-12', end_date: '2026-05-14', extra_data: null }

describe('todayInZone', () => {
  // 23:30 UTC on 11 May is already 12 May in Tokyo and still 11 May in Lisbon.
  const now = new Date('2026-05-11T23:30:00Z')

  it('returns the calendar day in the given zone', () => {
    expect(todayInZone('Europe/Lisbon', now)).toBe('2026-05-12') // UTC+1 in May
    expect(todayInZone('Asia/Tokyo', now)).toBe('2026-05-12')
    expect(todayInZone('America/New_York', now)).toBe('2026-05-11')
  })

  it('reads a URI-encoded zone', () => {
    expect(todayInZone('Asia%2FTokyo', now)).toBe('2026-05-12')
  })

  it('falls back to UTC for a missing or invalid zone', () => {
    expect(todayInZone(undefined, now)).toBe('2026-05-11')
    expect(todayInZone('', now)).toBe('2026-05-11')
    expect(todayInZone('Not/AZone', now)).toBe('2026-05-11')
    expect(todayInZone('<script>', now)).toBe('2026-05-11')
    expect(todayInZone('x'.repeat(200), now)).toBe('2026-05-11')
  })
})

describe('daysBetween', () => {
  it('counts calendar days across months and years', () => {
    expect(daysBetween('2026-05-12', '2026-05-14')).toBe(2)
    expect(daysBetween('2026-05-31', '2026-06-01')).toBe(1)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
    expect(daysBetween('2026-05-14', '2026-05-12')).toBe(-2)
  })
})

describe('statusLine', () => {
  it('day 1 of the trip: Now boarding', () => {
    expect(statusLine(trip, '2026-05-12')).toBe('Now boarding: Lisbon')
  })

  it('later days: Day n of m', () => {
    expect(statusLine(trip, '2026-05-13')).toBe('Day 2 of 3')
    expect(statusLine(trip, '2026-05-14')).toBe('Day 3 of 3')
  })

  it('1 day before: Gate closes tomorrow', () => {
    expect(statusLine(trip, '2026-05-11')).toBe('Gate closes tomorrow')
  })

  it('2–3 days before: Gate closes in n days', () => {
    expect(statusLine(trip, '2026-05-10')).toBe('Gate closes in 2 days')
    expect(statusLine(trip, '2026-05-09')).toBe('Gate closes in 3 days')
  })

  it('further out: Departs in n days', () => {
    expect(statusLine(trip, '2026-05-08')).toBe('Departs in 4 days')
    expect(statusLine(trip, '2026-05-01')).toBe('Departs in 11 days')
  })

  it('no dates: Dates not set', () => {
    expect(statusLine({ ...trip, start_date: null, end_date: null }, '2026-05-01')).toBe('Dates not set')
  })

  it('a finished trip has no status line', () => {
    expect(statusLine(trip, '2026-05-15')).toBeNull()
  })

  it('uses the title when there is no destination', () => {
    expect(statusLine({ ...trip, destination: null, title: 'Porto' }, '2026-05-12')).toBe('Now boarding: Porto')
  })

  it('a one-day trip is Now boarding all day', () => {
    expect(statusLine({ ...trip, end_date: '2026-05-12' }, '2026-05-12')).toBe('Now boarding: Lisbon')
    expect(statusLine({ ...trip, end_date: null }, '2026-05-12')).toBe('Now boarding: Lisbon')
  })
})

describe('nextPlaceFor', () => {
  const acts = [
    { id: 'a', day_number: 1, position: 1, name: 'Praça do Comércio', extra_data: null },
    { id: 'b', day_number: 2, position: 2, name: 'Castelo de São Jorge', extra_data: null },
    { id: 'c', day_number: 2, position: 1, name: 'Miradouro de Santa Luzia', extra_data: { visited: true } },
    { id: 'd', day_number: null, position: 1, name: 'MAAT', extra_data: null },
  ]

  it("is the first not-visited place of today's day", () => {
    expect(nextPlaceFor(trip, acts, '2026-05-12')).toBe('Praça do Comércio')
    expect(nextPlaceFor(trip, acts, '2026-05-13')).toBe('Castelo de São Jorge')
  })

  it('is null on an empty day, before or after the trip, and for undated trips', () => {
    expect(nextPlaceFor(trip, acts, '2026-05-14')).toBeNull()
    expect(nextPlaceFor(trip, acts, '2026-05-11')).toBeNull()
    expect(nextPlaceFor(trip, acts, '2026-05-15')).toBeNull()
    expect(nextPlaceFor({ ...trip, start_date: null, end_date: null }, acts, '2026-05-12')).toBeNull()
  })

  it('is null when every place of the day is visited', () => {
    const done = acts.map((a) => ({ ...a, extra_data: { visited: true } }))
    expect(nextPlaceFor(trip, done, '2026-05-12')).toBeNull()
  })
})
