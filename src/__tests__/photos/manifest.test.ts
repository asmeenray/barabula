import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { CITY_PHOTOS, type CityPhoto } from '@/lib/photos/manifest'
import { credits } from '@/lib/photos/credits'

// Integrity of the curated photo manifest (D-06, D-42, T-16-22): every credit is
// real and complete, no placeholder text ships, every file exists and the
// landscape crops stay inside the UI-SPEC weight budgets.

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const M_AVIF_MAX = 150 * 1024 // phone landscape
const L_AVIF_MAX = 220 * 1024 // laptop landscape
const PLACEHOLDER = /\b(tbd|todo|example|lorem|placeholder)\b/i

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

function fileOf(url: string): string {
  return path.join(PUBLIC_DIR, url)
}

describe('CITY_PHOTOS', () => {
  it('has at least one city and unique slugs and names', () => {
    expect(CITY_PHOTOS.length).toBeGreaterThan(0)
    const slugs = CITY_PHOTOS.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    const names = CITY_PHOTOS.flatMap((p) => p.names)
    expect(new Set(names).size).toBe(names.length)
  })

  describe.each(CITY_PHOTOS.map((p) => [p.slug, p] as [string, CityPhoto]))('%s', (_slug, photo) => {
    it('has complete, real credits', () => {
      expect(photo.slug).toMatch(/^[a-z0-9-]+$/)
      expect(photo.city.trim()).not.toBe('')
      expect(photo.names.length).toBeGreaterThan(0)
      for (const name of photo.names) expect(name).toBe(name.trim().toLowerCase())
      expect(photo.alt.trim().length).toBeGreaterThan(10)
      expect(photo.photographer.trim()).not.toBe('')
      expect(photo.licence.trim()).not.toBe('')
      expect(photo.licenceUrl).toMatch(/^https:\/\//)
      expect(photo.sourceUrl).toMatch(/^https:\/\//)
    })

    it('has a focal point inside the frame', () => {
      for (const v of [photo.focal.x, photo.focal.y]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    })

    it('uses a real IATA code shape and sourced tags when present', () => {
      if (photo.iata !== undefined) expect(photo.iata).toMatch(/^[A-Z]{3}$/)
      if (photo.tags !== undefined) expect(photo.tags.source.trim()).not.toBe('')
    })

    it('contains no placeholder text', () => {
      // The blur data URI is base64, so random letters could spell a word.
      for (const s of strings({ ...photo, blur: '' })) expect(s).not.toMatch(PLACEHOLDER)
    })

    it('ships every file under public/', () => {
      for (const url of Object.values(photo.files)) {
        expect(url).toMatch(new RegExp(`^/images/cities/${photo.slug}-[lmp]\\.(avif|webp)$`))
        expect(existsSync(fileOf(url)), url).toBe(true)
      }
    })

    it('keeps the landscape AVIF crops inside the weight budgets', () => {
      expect(statSync(fileOf(photo.files.mAvif)).size).toBeLessThanOrEqual(M_AVIF_MAX)
      expect(statSync(fileOf(photo.files.lAvif)).size).toBeLessThanOrEqual(L_AVIF_MAX)
    })

    it('has a blur placeholder at most 10 px wide', async () => {
      const match = /^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(photo.blur)
      expect(match).not.toBeNull()
      const meta = await sharp(Buffer.from(match![2], 'base64')).metadata()
      expect(meta.width).toBeGreaterThan(0)
      expect(meta.width).toBeLessThanOrEqual(10)
    })
  })
})

describe('credits()', () => {
  it('returns one row per manifest entry with the manifest values', () => {
    const rows = credits()
    expect(rows).toHaveLength(CITY_PHOTOS.length)
    rows.forEach((row, i) => {
      const p = CITY_PHOTOS[i]
      expect(row).toEqual({
        city: p.city,
        photographer: p.photographer,
        licence: p.licence,
        licenceUrl: p.licenceUrl,
        sourceUrl: p.sourceUrl,
      })
      expect(row.city.trim()).not.toBe('')
    })
  })
})
