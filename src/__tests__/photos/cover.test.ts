import { describe, expect, it } from 'vitest'
import { countryFor, countryPhoto, coverFor, startMonth, tripCover } from '@/lib/photos/cover'
import type { Country } from '@/lib/photos/countries'
import { filesFor } from '@/lib/photos/manifest'

// Cover resolver (16-21): city photo → country photo (season by start month,
// southern hemisphere inverted; beach when interests include Beaches, beach
// wins over season unless the season photo is itself a beach) → null (map cover).

const slug = (p: { slug: string } | null) => p?.slug ?? null

describe('coverFor', () => {
  it('uses the curated city photo first', () => {
    expect(slug(coverFor('Sydney'))).toBe('sydney')
    expect(slug(coverFor('Sydney', { month: 1, interests: ['Beaches'] }))).toBe('sydney')
    expect(slug(coverFor('Lisboa, Portugal'))).toBe('lisbon')
  })

  it('falls back to the country for a city outside the set (GeoNames)', () => {
    expect(slug(coverFor('Nice'))).toBe('france')
    expect(slug(coverFor('Bordeaux'))).toBe('france')
    expect(slug(coverFor('Nice, France', { month: 3 }))).toBe('france')
  })

  it('uses the beach variant when the interests include Beaches', () => {
    expect(slug(coverFor('Nice', { interests: ['Food', 'Beaches'] }))).toBe('france-beach')
    expect(slug(coverFor('Nice', { interests: ['Food'] }))).toBe('france')
  })

  it('picks a season variant by the start month', () => {
    // Norway's default is the Northern Lights; the fjord photo covers May–August.
    expect(slug(coverFor('Oslo', { month: 1 }))).toBe('norway')
    expect(slug(coverFor('Oslo', { month: 7 }))).toBe('norway-summer')
    expect(slug(coverFor('Tromsø', { month: 12 }))).toBe('norway')
    expect(slug(coverFor('Osaka', { month: 4 }))).toBe('japan-spring')
    expect(slug(coverFor('Osaka', { month: 11 }))).toBe('japan-autumn')
    expect(slug(coverFor('Osaka', { month: 8 }))).toBe('japan')
    expect(slug(coverFor('Osaka'))).toBe('japan')
  })

  it('beach wins over a season variant that is not a beach', () => {
    expect(slug(coverFor('Osaka', { month: 4, interests: ['Beaches'] }))).toBe('japan-beach')
    // Norway has no beach variant, so the season still applies.
    expect(slug(coverFor('Oslo', { month: 7, interests: ['Beaches'] }))).toBe('norway-summer')
  })

  it('matches a country by its own name', () => {
    expect(slug(coverFor('Norway', { month: 1 }))).toBe('norway')
    expect(slug(coverFor('Iceland', { month: 2 }))).toBe('iceland-winter')
    expect(slug(coverFor('Türkiye'))).toBe('turkey')
  })

  it('returns null (map cover) for anything unknown', () => {
    expect(coverFor('Zzyzx Qwerty')).toBeNull()
    expect(coverFor('')).toBeNull()
    expect(coverFor(null)).toBeNull()
    expect(coverFor(undefined)).toBeNull()
    // A country without curated photos.
    expect(coverFor('Ulaanbaatar')).toBeNull()
  })
})

describe('countryPhoto', () => {
  const photo = (s: string, extra: object = {}) => ({
    slug: s,
    focal: { x: 0.5, y: 0.5 },
    alt: `test photo ${s}`,
    photographer: 'test',
    licence: 'CC0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Test.jpg',
    files: filesFor(s, 'countries'),
    blur: 'data:image/webp;base64,AA==',
    ...extra,
  })
  // Test inputs, not real countries.
  const south: Country = {
    iso: 'ZZ',
    country: 'Testland',
    names: ['testland'],
    hemisphere: 'S',
    coastal: true,
    photos: [
      photo('t-default'),
      photo('t-beach', { beach: true }),
      photo('t-winter', { season: { name: 'winter', months: [12, 1, 2] } }),
      photo('t-summer-beach', { season: { name: 'summer', months: [6, 7, 8] }, beach: true }),
    ],
  }

  it('inverts the month in the southern hemisphere', () => {
    // July in the south reads as January: winter.
    expect(countryPhoto(south, { month: 7 }).slug).toBe('t-winter')
    // January in the south reads as July: the summer variant.
    expect(countryPhoto(south, { month: 1 }).slug).toBe('t-summer-beach')
    expect(countryPhoto(south, { month: 4 }).slug).toBe('t-default')
  })

  it('a season variant that is itself a beach wins over the plain beach photo', () => {
    expect(countryPhoto(south, { month: 1, beach: true }).slug).toBe('t-summer-beach')
    expect(countryPhoto(south, { month: 7, beach: true }).slug).toBe('t-beach')
    expect(countryPhoto(south, { beach: true }).slug).toBe('t-beach')
  })

  it('ignores months outside 1–12', () => {
    expect(countryPhoto(south, { month: 13 }).slug).toBe('t-default')
    expect(countryPhoto(south, { month: 0 }).slug).toBe('t-default')
  })
})

describe('countryFor', () => {
  it('resolves places to the most populous match and country names directly', () => {
    expect(countryFor('Bordeaux')?.iso).toBe('FR')
    expect(countryFor('United Kingdom')?.iso).toBe('GB')
    expect(countryFor('Kyoto')?.iso).toBe('JP')
    expect(countryFor('nowhere-at-all')).toBeNull()
  })
})

describe('tripCover', () => {
  const trip = (over: object) => ({ destination: null, title: '', start_date: null, extra_data: null, ...over })

  it('reads the start month and the pass interests from a saved trip', () => {
    expect(slug(tripCover(trip({ destination: 'Bergen', start_date: '2026-07-02' })))).toBe('norway-summer')
    expect(
      slug(tripCover(trip({ destination: 'Nice', extra_data: { pass: { interests: ['Beaches'] } } })))
    ).toBe('france-beach')
    expect(slug(tripCover(trip({ title: 'Porto' })))).toBe('porto')
    expect(tripCover(trip({ title: 'Weekend away' }))).toBeNull()
  })

  it('startMonth reads ISO dates only', () => {
    expect(startMonth('2026-01-31')).toBe(1)
    expect(startMonth('2026-12-01')).toBe(12)
    expect(startMonth(null)).toBeNull()
    expect(startMonth('January')).toBeNull()
  })
})
