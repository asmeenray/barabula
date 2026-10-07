// "Cities that fit" (D-16) for a description with no city. Only curated cities
// whose climate/month tags came from verified data (a non-empty tags.source)
// can be suggested; a city is never suggested from an untagged or unsourced
// entry. Pure; the curated list is passed in (the manifest stays out of client JS).

import type { CityPhoto } from '@/lib/photos/manifest'
import type { Reading } from './describe'

export const MAX_FIT = 4

type Tagged = Pick<CityPhoto, 'tags'>

/**
 * Up to 4 sourced entries matching everything the text asked for: the month
 * (tags.months), climate words (tags.climate) and beaches (tags.beach). With
 * nothing to match on, none.
 */
export function citiesThatFit<T extends Tagged>(reading: Pick<Reading, 'month' | 'climate' | 'interests'>, photos: readonly T[]): T[] {
  const wantsBeach = reading.interests.includes('Beaches')
  if (reading.month === null && reading.climate.length === 0 && !wantsBeach) return []

  const out: T[] = []
  for (const photo of photos) {
    const tags = photo.tags
    if (!tags || !tags.source?.trim()) continue
    if (reading.month !== null && !tags.months?.includes(reading.month)) continue
    if (reading.climate.some((word) => !tags.climate?.includes(word))) continue
    if (wantsBeach && tags.beach !== true) continue
    out.push(photo)
    if (out.length === MAX_FIT) break
  }
  return out
}
