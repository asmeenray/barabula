import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Ordering invariant (D-21, accepted in 16-02): activities are ordered by
// day_number, position, id. The old time ranking survives only as the backfill
// oracle in src/lib/plan/legacy-order.ts, and nothing orders by time in SQL.

const SRC = path.join(process.cwd(), 'src')
const TESTS = path.join(SRC, '__tests__')
const ORACLE = path.join(SRC, 'lib', 'plan', 'legacy-order.ts')

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (full === TESTS) continue
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full))
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) out.push(full)
  }
  return out
}

describe('activity ordering invariant', () => {
  const files = sourceFiles(SRC)

  it('scans the source tree', () => {
    expect(files.length).toBeGreaterThan(10)
    expect(files).toContain(ORACLE)
  })

  it('uses legacyTimeRank / legacyOrder only in legacy-order.ts', () => {
    const offenders = files.filter(
      (f) => f !== ORACLE && /\b(legacyTimeRank|legacyOrder)\b/.test(readFileSync(f, 'utf8'))
    )
    expect(offenders.map((f) => path.relative(process.cwd(), f))).toEqual([])
  })

  it("never calls .order('time'", () => {
    const offenders = files.filter((f) => /\.order\(\s*['"`]time['"`]/.test(readFileSync(f, 'utf8')))
    expect(offenders.map((f) => path.relative(process.cwd(), f))).toEqual([])
  })
})
