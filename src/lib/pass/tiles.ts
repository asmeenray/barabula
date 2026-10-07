// Flap-tile title geometry (quick 261007-wms, Asmeen's option A, 7 Oct 2026):
// the laptop blank-pass title sits in see-through flap tiles, 46 × 64 px,
// 4 px apart, 18 px between words, at most two rows. Anything that would need
// a third row (or cannot be tiled) falls back to today's plain title.

export const TILE = { width: 46, height: 64, gap: 4, wordGap: 18 } as const

/**
 * Room for one tile row at the narrowest laptop width (1024 × 768 viewport):
 * the cover width minus its 16 px padding on each side. Measured with
 * getBoundingClientRect on the real page on 7 Oct 2026: horizontal pass cover
 * 528 px (row 496), vertical pass beside a Now/Next pass 464 px (row 432).
 */
export const TILE_ROW_PX = { horizontal: 496, vertical: 432 } as const

/** Width of one word in tiles. */
function wordPx(word: string): number {
  const n = word.length
  return n * TILE.width + (n - 1) * TILE.gap
}

/**
 * The title as tile rows (words packed greedily), or null when it would need
 * more than two rows, a word is wider than a row, the text is empty, or the
 * spacing is irregular (leading, trailing or repeated spaces).
 */
export function tileRows(text: string, maxRowPx: number): string[] | null {
  if (!text) return null
  const words = text.split(' ')
  if (words.some((w) => !w)) return null
  const rows: string[][] = []
  let width = 0
  for (const word of words) {
    const w = wordPx(word)
    if (w > maxRowPx) return null
    const row = rows[rows.length - 1]
    if (row && width + TILE.wordGap + w <= maxRowPx) {
      row.push(word)
      width += TILE.wordGap + w
    } else {
      rows.push([word])
      width = w
    }
  }
  return rows.length > 2 ? null : rows.map((r) => r.join(' '))
}
