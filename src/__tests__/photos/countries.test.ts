import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { COUNTRIES, type CountryPhoto } from '@/lib/photos/countries'
import GEONAMES from '@/lib/photos/geonames.json'
import { CITY_PHOTOS } from '@/lib/photos/manifest'
import { normalizeCity } from '@/lib/photos/normalize'

// Integrity of the country photo manifest and the GeoNames lookup (16-21):
// the same credit, file and budget rules as the city manifest, one default
// photo per country, and lookup keys that match how destinations are normalised.

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const M_AVIF_MAX = 150 * 1024
const L_AVIF_MAX = 220 * 1024
const PLACEHOLDER = /\b(tbd|todo|example|lorem|placeholder)\b/i
const fileOf = (url: string) => path.join(PUBLIC_DIR, url)
const PHOTOS = COUNTRIES.flatMap((c) => c.photos.map((p) => [p.slug, p] as [string, CountryPhoto]))

describe('COUNTRIES', () => {
  it('has the 40 approved countries with unique ISO codes, names and photo slugs', () => {
    expect(COUNTRIES).toHaveLength(40)
    const isos = COUNTRIES.map((c) => c.iso)
    expect(new Set(isos).size).toBe(isos.length)
    for (const iso of isos) expect(iso).toMatch(/^[A-Z]{2}$/)
    const names = COUNTRIES.flatMap((c) => c.names)
    expect(new Set(names).size).toBe(names.length)
    const slugs = PHOTOS.map(([slug]) => slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(slugs).toHaveLength(69)
  })

  it('normalised names that no curated city uses', () => {
    const cityNames = new Set(CITY_PHOTOS.flatMap((p) => p.names))
    for (const name of COUNTRIES.flatMap((c) => c.names)) {
      expect(normalizeCity(name)).toBe(name)
      // Singapore is both; the city photo wins, which is what we want.
      if (name !== 'singapore') expect(cityNames.has(name), name).toBe(false)
    }
  })

  describe.each(COUNTRIES.map((c) => [c.iso, c] as const))('%s', (_iso, country) => {
    it('lists exactly one default photo, first', () => {
      const defaults = country.photos.filter((p) => !p.beach && !p.season)
      expect(defaults).toHaveLength(1)
      expect(country.photos[0]).toBe(defaults[0])
    })

    it('has a beach photo only when coastal, and valid season months', () => {
      if (country.photos.some((p) => p.beach)) expect(country.coastal).toBe(true)
      for (const p of country.photos) {
        expect(p.beach && p.season).toBeFalsy()
        for (const m of p.season?.months ?? []) expect(m >= 1 && m <= 12).toBe(true)
      }
      const seasonMonths = country.photos.flatMap((p) => p.season?.months ?? [])
      expect(new Set(seasonMonths).size).toBe(seasonMonths.length)
    })
  })

  describe.each(PHOTOS)('%s', (slug, photo) => {
    it('has complete, real credits and no placeholder text', () => {
      expect(slug).toMatch(/^[a-z0-9-]+$/)
      expect(photo.alt.trim().length).toBeGreaterThan(10)
      expect(photo.photographer.trim()).not.toBe('')
      expect(photo.licence).toMatch(/^(CC0|CC BY \d\.\d|Public domain)$/)
      expect(photo.licenceUrl).toMatch(/^https:\/\//)
      expect(photo.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
      expect(photo.iata).toBeUndefined()
      for (const v of [photo.focal.x, photo.focal.y]) expect(v >= 0 && v <= 1).toBe(true)
      for (const s of [photo.alt, photo.photographer, photo.licence]) expect(s).not.toMatch(PLACEHOLDER)
    })

    it('ships exactly the laptop AVIF, phone AVIF and phone WebP within budget', () => {
      expect(photo.files).toEqual({
        lAvif: `/images/countries/${slug}-l.avif`,
        mAvif: `/images/countries/${slug}-m.avif`,
        mWebp: `/images/countries/${slug}-m.webp`,
      })
      for (const url of Object.values(photo.files)) expect(existsSync(fileOf(url)), url).toBe(true)
      expect(statSync(fileOf(photo.files.mAvif)).size).toBeLessThanOrEqual(M_AVIF_MAX)
      expect(statSync(fileOf(photo.files.lAvif)).size).toBeLessThanOrEqual(L_AVIF_MAX)
    })

    it('has a blur placeholder at most 10 px wide', async () => {
      const match = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(photo.blur)
      expect(match).not.toBeNull()
      const meta = await sharp(Buffer.from(match![1], 'base64')).metadata()
      expect(meta.width).toBeGreaterThan(0)
      expect(meta.width).toBeLessThanOrEqual(10)
    })
  })

  it('public/images/countries holds only files the manifest uses', () => {
    const used = new Set(PHOTOS.flatMap(([, p]) => Object.values(p.files).map((url) => path.basename(url))))
    const onDisk = readdirSync(path.join(PUBLIC_DIR, 'images/countries')).filter((f) => !f.startsWith('.'))
    expect(onDisk.filter((f) => !used.has(f))).toEqual([])
  })
})

describe('GeoNames lookup', () => {
  const entries = Object.entries(GEONAMES as Record<string, string>)

  it('maps ISO alpha-2 codes to normalised, unique place names', () => {
    expect(entries.length).toBeGreaterThan(200)
    const seen = new Set<string>()
    for (const [iso, names] of entries) {
      expect(iso).toMatch(/^[A-Z]{2}$/)
      for (const name of names.split('|')) {
        expect(normalizeCity(name)).toBe(name)
        expect(seen.has(name), name).toBe(false)
        seen.add(name)
      }
    }
  })

  it('covers every approved country', () => {
    const isos = new Set(entries.map(([iso]) => iso))
    for (const c of COUNTRIES) expect(isos.has(c.iso), c.iso).toBe(true)
  })
})
