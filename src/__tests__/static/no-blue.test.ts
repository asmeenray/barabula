import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Brand rule (handover): no Tailwind blue-* classes anywhere in src.
const SRC = path.join(process.cwd(), 'src')
const SKIP = path.join(SRC, '__tests__')
const BLUE =
  /\b(bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|divide|placeholder|caret|accent|shadow)-blue-\d/

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (full === SKIP) continue
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx|css)$/.test(name)) out.push(full)
  }
  return out
}

describe('brand palette', () => {
  it('uses no Tailwind blue-* class in src', () => {
    const files = walk(SRC)
    expect(files.length).toBeGreaterThan(0)

    const hits: string[] = []
    for (const file of files) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (BLUE.test(line)) hits.push(`${path.relative(process.cwd(), file)}:${i + 1}: ${line.trim()}`)
        })
    }
    expect(hits, `blue-* classes found:\n${hits.join('\n')}`).toEqual([])
  })
})
