import { describe, it, expect } from 'vitest'
import { citiesThatFit } from '@/lib/pass/fit'
import { readDescription } from '@/lib/pass/describe'
import { KNOWN_CITIES } from '@/lib/pass/cities'
import { CITY_PHOTOS, type CityPhoto } from '@/lib/photos/manifest'

// "Cities that fit" (D-16): only curated cities whose tags came from verified
// data (tags.source set). The entries below are test inputs, not real climate data.

type Entry = Pick<CityPhoto, 'city' | 'tags'>
const read = (text: string) => readDescription(text, KNOWN_CITIES, '2026-10-07')

const sourced = (city: string, tags: Omit<NonNullable<CityPhoto['tags']>, 'source'>): Entry => ({
  city,
  tags: { ...tags, source: 'test input' },
})

describe('citiesThatFit', () => {
  const photos: Entry[] = [
    sourced('Test A', { months: [3, 4], climate: ['warm'] }),
    sourced('Test B', { months: [3], beach: true }),
    { city: 'Test C', tags: { months: [3], source: '' } },
    { city: 'Test D' },
    sourced('Test E', { months: [7, 8], climate: ['warm'], beach: true }),
    sourced('Test F', { months: [3] }),
    sourced('Test G', { months: [3] }),
    sourced('Test H', { months: [3] }),
  ]

  it('matches the month on sourced entries only, max 4', () => {
    const fit = citiesThatFit(read('somewhere in March'), photos).map((p) => p.city)
    expect(fit).toEqual(['Test A', 'Test B', 'Test F', 'Test G'])
    expect(fit).not.toContain('Test C')
    expect(fit).not.toContain('Test D')
  })

  it('every word read must match: month and climate, beach', () => {
    expect(citiesThatFit(read('somewhere warm in March'), photos).map((p) => p.city)).toEqual(['Test A'])
    expect(citiesThatFit(read('beaches in March'), photos).map((p) => p.city)).toEqual(['Test B'])
    expect(citiesThatFit(read('warm beaches'), photos).map((p) => p.city)).toEqual(['Test E'])
  })

  it('nothing to match on, or no sourced entries: none', () => {
    expect(citiesThatFit(read('somewhere nice'), photos)).toEqual([])
    expect(citiesThatFit(read('somewhere in March'), [{ city: 'Test D' }] as Entry[])).toEqual([])
  })

  it('the real manifest suggests only cities whose cited climate table fits (16-21)', () => {
    // Mean daily highs of 24–32 °C in March, from each city's cited weather box.
    expect(citiesThatFit(read('somewhere warm in March'), CITY_PHOTOS).map((p) => p.city)).toEqual([
      'Cape Town',
      'Dubai',
      'Hanoi',
      'Sydney',
    ])
    // Beach tags were not verified for any city, so none is suggested for beaches.
    expect(citiesThatFit(read('beaches in October'), CITY_PHOTOS)).toEqual([])
  })
})
