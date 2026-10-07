import { describe, expect, it } from 'vitest'
import { cityOptions } from '@/components/pass/QuestionCard'

// "Where to?" list (Asmeen, 7 Oct 2026): nothing until the user types, then
// names starting with what was typed first.
const cities = [
  { name: 'Lisbon', names: ['lisbon', 'lisboa'] },
  { name: 'Paris', names: ['paris'] },
  { name: 'Mexico City', names: ['mexico city', 'cdmx'] },
  { name: 'Seoul', names: ['seoul'] },
]

describe('cityOptions', () => {
  it('shows nothing for an empty or blank query', () => {
    expect(cityOptions(cities, '')).toEqual([])
    expect(cityOptions(cities, '   ')).toEqual([])
  })

  it('puts names that start with the typed letters first', () => {
    const labels = cityOptions(cities, 'is').map((o) => o.label)
    // No city starts with "is"; Lisbon and Paris contain it.
    expect(labels).toEqual(['Lisbon', 'Paris', 'Use “is”'])
    expect(cityOptions(cities, 'ci').map((o) => o.label)[0]).toBe('Mexico City')
    expect(cityOptions(cities, 'p').map((o) => o.label)).toEqual(['Paris', 'Use “p”'])
  })

  it('matches aliases and offers the typed city when it is unknown', () => {
    expect(cityOptions(cities, 'lisb').map((o) => o.label)).toEqual(['Lisbon', 'Use “lisb”'])
    expect(cityOptions(cities, 'Lisbon').map((o) => o.label)).toEqual(['Lisbon'])
    expect(cityOptions(cities, 'Bordeaux')).toEqual([{ label: 'Use “Bordeaux”', city: 'Bordeaux', create: true }])
  })
})
