import { describe, expect, it } from 'vitest'
import { cleanHomeCity, homeCitySuggestions, HOME_CITY_MAX, initialsOf } from '@/lib/you/home-city'

describe('cleanHomeCity', () => {
  it('trims and collapses spaces', () => {
    expect(cleanHomeCity('  Lisbon  ')).toBe('Lisbon')
    expect(cleanHomeCity('Rio   de \n Janeiro')).toBe('Rio de Janeiro')
  })

  it('caps at 80 characters', () => {
    expect(cleanHomeCity('x'.repeat(200))).toHaveLength(HOME_CITY_MAX)
  })

  it('gives an empty string for blank input (no home city)', () => {
    expect(cleanHomeCity('   ')).toBe('')
  })
})

describe('homeCitySuggestions', () => {
  it('suggests curated cities by prefix, accent-free and through aliases', () => {
    expect(homeCitySuggestions('lis')[0]).toBe('Lisbon')
    expect(homeCitySuggestions('lisboa')).toContain('Lisbon')
    expect(homeCitySuggestions('SEVI')).toContain('Seville')
  })

  it('suggests nothing for an empty query or the exact name typed', () => {
    expect(homeCitySuggestions('')).toEqual([])
    expect(homeCitySuggestions('Lisbon')).not.toContain('Lisbon')
  })

  it('returns at most six names', () => {
    expect(homeCitySuggestions('a').length).toBeLessThanOrEqual(6)
  })
})

describe('initialsOf', () => {
  it('takes the first letters of the first two words', () => {
    expect(initialsOf('Asmeen Ray')).toBe('AR')
    expect(initialsOf('e2e-owner')).toBe('EO')
    expect(initialsOf('josé')).toBe('J')
  })

  it('falls back to ? when there are no letters', () => {
    expect(initialsOf('123')).toBe('?')
  })
})
