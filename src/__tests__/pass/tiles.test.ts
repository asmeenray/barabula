import { describe, expect, it } from 'vitest'
import { TILE, TILE_ROW_PX, tileRows } from '@/lib/pass/tiles'

// Flap-tile title rows (quick 261007-wms, A-1): words packed greedily into at
// most two rows of 46 px tiles (4 px apart, 18 px between words); anything
// that needs a third row, or cannot be tiled, falls back to plain text (null).

describe('tileRows', () => {
  it('uses the decided tile geometry', () => {
    expect(TILE).toEqual({ width: 46, height: 64, gap: 4, wordGap: 18 })
  })

  it("splits 'Where to next?' into WHERE TO / NEXT? on the horizontal pass", () => {
    expect(tileRows('Where to next?', TILE_ROW_PX.horizontal)).toEqual(['Where to', 'next?'])
  })

  it('keeps a short code title on one row at either width', () => {
    expect(tileRows('LIS → PRG', TILE_ROW_PX.horizontal)).toEqual(['LIS → PRG'])
    expect(tileRows('LIS → PRG', TILE_ROW_PX.vertical)).toEqual(['LIS → PRG'])
  })

  it('wraps a longer title into two rows', () => {
    expect(tileRows('Lisbon → Porto', TILE_ROW_PX.vertical)).toEqual(['Lisbon →', 'Porto'])
  })

  it('returns null for a title that needs a third row', () => {
    expect(tileRows('Rio de Janeiro → Buenos Aires', TILE_ROW_PX.vertical)).toBeNull()
  })

  it('returns null for an over-wide word, empty text and irregular spaces', () => {
    expect(tileRows('Constantinople', TILE_ROW_PX.vertical)).toBeNull()
    expect(tileRows('', TILE_ROW_PX.horizontal)).toBeNull()
    expect(tileRows(' Lisbon', TILE_ROW_PX.horizontal)).toBeNull()
    expect(tileRows('Lisbon ', TILE_ROW_PX.horizontal)).toBeNull()
    expect(tileRows('Lisbon  Porto', TILE_ROW_PX.horizontal)).toBeNull()
  })

  it('fits a word exactly as wide as the row', () => {
    // 10 tiles: 10 × 46 + 9 × 4 = 496.
    expect(tileRows('ABCDEFGHIJ', 496)).toEqual(['ABCDEFGHIJ'])
    expect(tileRows('ABCDEFGHIJ', 495)).toBeNull()
  })
})
