import { describe, expect, it } from 'vitest'
import { CITY_PHOTOS } from '@/lib/photos/manifest'
import { normalizeCity, photoFor, randomCity } from '@/lib/photos/match'

describe('normalizeCity', () => {
  it('lowercases and cuts at the first comma', () => {
    expect(normalizeCity('Lisbon, Portugal')).toBe('lisbon')
  })

  it('trims surrounding space', () => {
    expect(normalizeCity('  LISBOA ')).toBe('lisboa')
  })

  it('strips accents', () => {
    expect(normalizeCity('São Paulo')).toBe('sao paulo')
  })

  it('collapses inner whitespace', () => {
    expect(normalizeCity('New   York ,USA')).toBe('new york')
  })

  it('returns an empty string for empty input', () => {
    expect(normalizeCity('')).toBe('')
    expect(normalizeCity(' , Portugal')).toBe('')
  })
})

describe('photoFor', () => {
  const lisbon = CITY_PHOTOS.find((p) => p.slug === 'lisbon')

  it('finds Lisbon by its English and Portuguese names', () => {
    expect(lisbon).toBeDefined()
    expect(photoFor('Lisbon')).toBe(lisbon)
    expect(photoFor('Lisboa, PT')).toBe(lisbon)
    expect(photoFor('  lisbon , portugal')).toBe(lisbon)
  })

  it('returns null for cities outside the set', () => {
    expect(photoFor('Bordeaux')).toBeNull()
    expect(photoFor('Nice, France')).toBeNull()
  })

  it('returns null for empty or missing input', () => {
    expect(photoFor(null)).toBeNull()
    expect(photoFor(undefined)).toBeNull()
    expect(photoFor('')).toBeNull()
  })

  it('needs an exact name match, not a substring', () => {
    expect(photoFor('Lisbon Airport')).toBeNull()
    expect(photoFor('Lis')).toBeNull()
  })
})

describe('randomCity', () => {
  it('returns the first entry for rand() = 0', () => {
    expect(randomCity(() => 0)).toBe(CITY_PHOTOS[0])
  })

  it('stays inside the list for rand() close to 1', () => {
    expect(randomCity(() => 0.999999)).toBe(CITY_PHOTOS[CITY_PHOTOS.length - 1])
  })

  it('does not throw with the default random source', () => {
    expect(() => randomCity()).not.toThrow()
    expect(CITY_PHOTOS).toContain(randomCity())
  })
})

describe('randomCity avoid list', () => {
  it('never returns a photo already on the page', () => {
    const first = CITY_PHOTOS[0].slug
    for (const r of [0, 0.2, 0.5, 0.999999]) expect(randomCity(() => r, [first]).slug).not.toBe(first)
  })

  it('falls back to every photo when all are avoided', () => {
    expect(randomCity(() => 0, CITY_PHOTOS.map((p) => p.slug))).toBe(CITY_PHOTOS[0])
  })
})
