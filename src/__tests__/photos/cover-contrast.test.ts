import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { CITY_PHOTOS, type CoverPhoto } from '@/lib/photos/manifest'
import { COUNTRIES } from '@/lib/photos/countries'
import { LIGHT_SCRIMS, STATUS_BAND } from '@/components/pass/PassCover'

// Laptop blank-pass contrast with the flap-tile title (quick 261007-wms, A-3):
// over the lighter laptop scrim (plus the narrow status band), the 18 px status line keeps >= 4.5:1 and the
// tile letters >= 3:1 (large text) on every curated photo, city and country.
// White text is measured against the 95th-percentile relative luminance of
// the pixels behind it (the brightest 5 %). The backdrop blur and the text
// shadows are ignored, which can only make the real page better than this.
//
// Boxes measured on 7 Oct 2026 with getBoundingClientRect on a production
// build (local stack, reduced motion so the title is at rest), relative to the
// cover: the logged-out horizontal pass at 1280 × 800 and 1024 × 768, and the
// signed-in fixture owner's vertical pass (beside a Now/Next pass) at
// 1280 × 800. Title "Where to next?" (rows WHERE TO / NEXT?), status line
// "Pick a city to start". These are the highest the tile rows ever sit (a
// city title has no status line, so its rows sit lower, over more scrim).

type Box = { x: number; y: number; w: number; h: number }
type Geometry = { name: string; cover: { w: number; h: number }; status: Box; rows: Box[][] }

const TILE_W = 46
const TILE_H = 64

/** Tile boxes of one row: words of n tiles, 4 px apart, 18 px between words. */
function tiles(x: number, y: number, words: number[]): Box[] {
  const out: Box[] = []
  for (const n of words) {
    for (let k = 0; k < n; k++) out.push({ x: x + k * (TILE_W + 4), y, w: TILE_W, h: TILE_H })
    x += n * TILE_W + (n - 1) * 4 + 18
  }
  return out
}

const GEOMETRIES: Geometry[] = [
  {
    name: 'horizontal 1280',
    cover: { w: 581, h: 440 },
    status: { x: 16, y: 405, w: 216, h: 23 },
    rows: [tiles(16, 266, [5, 2]), tiles(16, 334, [5])],
  },
  {
    name: 'horizontal 1024',
    cover: { w: 528, h: 458 },
    status: { x: 16, y: 423, w: 216, h: 23 },
    rows: [tiles(16, 284, [5, 2]), tiles(16, 352, [5])],
  },
  {
    name: 'vertical 1280',
    cover: { w: 512, h: 280 },
    status: { x: 16, y: 245, w: 216, h: 23 },
    rows: [tiles(16, 106, [5, 2]), tiles(16, 174, [5])],
  },
]

const INK = [5, 8, 12]
const TILE_ALPHA = 0.42

/**
 * STATUS_BAND at a distance from the cover's bottom edge (px): .21 up to 36 px,
 * fading out by 42 px, under the tile rows only.
 */
function bandAlpha(d: number): number {
  return d <= 36 ? 0.21 : d >= 42 ? 0 : (0.21 * (42 - d)) / 6
}

/** Alpha of the two LIGHT_SCRIMS layers at a height (0 = top, 1 = bottom of the cover). */
function scrimAlphas(t: number): { top: number; bottom: number } {
  // linear-gradient(to bottom, rgba(5,8,12,.45), transparent 30%)
  const top = t >= 0.3 ? 0 : 0.45 * (1 - t / 0.3)
  // linear-gradient(to top, rgba(5,8,12,.55), rgba(5,8,12,.05) 45%): u = distance from the bottom
  const u = 1 - t
  const bottom = u >= 0.45 ? 0.05 : 0.55 + (0.05 - 0.55) * (u / 0.45)
  return { top, bottom }
}

const lin = (c: number) => {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const luminance = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const over = (c: number, ink: number, a: number) => c * (1 - a) + ink * a

type Raw = { data: Buffer; width: number; height: number }

/** object-fit: cover with the focal point as object-position; nearest source pixel. */
function sampler(raw: Raw, cover: { w: number; h: number }, focal: CoverPhoto['focal']) {
  const scale = Math.max(cover.w / raw.width, cover.h / raw.height)
  const ox = (cover.w - raw.width * scale) * focal.x
  const oy = (cover.h - raw.height * scale) * focal.y
  return (x: number, y: number): [number, number, number] => {
    const sx = Math.min(raw.width - 1, Math.max(0, Math.floor((x + 0.5 - ox) / scale)))
    const sy = Math.min(raw.height - 1, Math.max(0, Math.floor((y + 0.5 - oy) / scale)))
    const i = (sy * raw.width + sx) * 3
    return [raw.data[i], raw.data[i + 1], raw.data[i + 2]]
  }
}

/** 95th-percentile luminance inside the boxes, with the scrim (and the tile backing) composited. */
function p95(raw: Raw, g: Geometry, focal: CoverPhoto['focal'], boxes: Box[], backing: number): number {
  const at = sampler(raw, g.cover, focal)
  const values: number[] = []
  for (const box of boxes) {
    for (let y = box.y; y < box.y + box.h; y++) {
      const { top, bottom } = scrimAlphas((y + 0.5) / g.cover.h)
      const band = bandAlpha(g.cover.h - (y + 0.5))
      for (let x = box.x; x < box.x + box.w; x++) {
        // CSS stacks the first listed layer on top: the to-bottom layer is painted
        // first, then the to-top layer, then the band; the tile backing is above all.
        const px = at(x, y).map((c, k) => over(over(over(over(c, INK[k], top), INK[k], bottom), INK[k], band), INK[k], backing))
        values.push(luminance(px[0], px[1], px[2]))
      }
    }
  }
  values.sort((a, b) => a - b)
  return values[Math.floor(values.length * 0.95)]
}

const whiteOn = (l: number) => 1.05 / (l + 0.05)

const PHOTOS: { label: string; photo: CoverPhoto }[] = [
  ...CITY_PHOTOS.map((photo) => ({ label: photo.slug, photo })),
  ...COUNTRIES.flatMap((c) => c.photos.map((photo) => ({ label: photo.slug, photo }))),
]

describe('laptop blank-pass contrast over the light scrim (A-3)', () => {
  it('checks the decided scrim and the status band modelled below', () => {
    expect(LIGHT_SCRIMS).toBe(
      'linear-gradient(to top, rgba(5,8,12,.55), rgba(5,8,12,.05) 45%), linear-gradient(to bottom, rgba(5,8,12,.45), transparent 30%)'
    )
    expect(STATUS_BAND).toBe('linear-gradient(to top, rgba(5,8,12,.21), rgba(5,8,12,.21) 36px, transparent 42px)')
    // The band stays under the tile rows: every measured row ends at least 42 px above the bottom.
    for (const g of GEOMETRIES) for (const row of g.rows) for (const t of row) expect(g.cover.h - (t.y + t.h)).toBeGreaterThanOrEqual(42)
  })

  it(
    'status line >= 4.5:1 and tile letters >= 3:1 on all 108 photos at every measured geometry',
    async () => {
      expect(PHOTOS).toHaveLength(108)
      let worstStatus = { ratio: Infinity, at: '' }
      let worstTile = { ratio: Infinity, at: '' }
      const failures: string[] = []
      for (const { label, photo } of PHOTOS) {
        const file = path.join(process.cwd(), 'public', photo.files.mWebp)
        const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
        const raw = { data, width: info.width, height: info.height }
        for (const g of GEOMETRIES) {
          const status = whiteOn(p95(raw, g, photo.focal, [g.status], 0))
          if (status < worstStatus.ratio) worstStatus = { ratio: status, at: `${label} (${g.name})` }
          if (status < 4.5) failures.push(`${label} ${g.name}: status ${status.toFixed(2)}`)
          g.rows.forEach((row, r) => {
            const tile = whiteOn(p95(raw, g, photo.focal, row, TILE_ALPHA))
            if (tile < worstTile.ratio) worstTile = { ratio: tile, at: `${label} (${g.name}, row ${r + 1})` }
            if (tile < 3) failures.push(`${label} ${g.name} row ${r + 1}: tiles ${tile.toFixed(2)}`)
          })
        }
      }
      console.log(
        `worst status line ${worstStatus.ratio.toFixed(2)}:1 on ${worstStatus.at}; worst tile row ${worstTile.ratio.toFixed(2)}:1 on ${worstTile.at}`
      )
      expect(failures).toEqual([])
    },
    120_000
  )
})
