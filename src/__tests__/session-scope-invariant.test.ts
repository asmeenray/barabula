import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Invariant (D-07, D-10): chat is per trip.
 * - Every trip_sessions chain that ends in single() or maybeSingle() filters by id or itinerary_id, or is an insert.
 *   A single-row read by user_id alone would quietly pick "the" session of a user who now has many.
 * - No upsert uses user_id as its conflict target (that constraint is dropped in plan 07).
 * - Nothing deletes trip_sessions or chat_history rows, and the session route exports no DELETE.
 * Scans only src/app and src/lib, so this file's own text is never checked.
 */

const ROOT = path.resolve(__dirname, '..', '..')
const SCAN_DIRS = ['src/app', 'src/lib'].map(d => path.join(ROOT, d))

function sourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : sourceFiles(full)
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : []
  })
}

type Call = { name: string; args: string }
type Chain = { file: string; line: number; table: string; calls: Call[] }

/** Index just past the matching close paren for the open paren at `open`; skips string literals. */
function matchParen(src: string, open: number): number {
  let depth = 0
  for (let i = open; i < src.length; i++) {
    const ch = src[i]
    if (ch === '\'' || ch === '"' || ch === '`') {
      const quote = ch
      for (i++; i < src.length && src[i] !== quote; i++) if (src[i] === '\\') i++
      continue
    }
    if (ch === '(') depth++
    else if (ch === ')' && --depth === 0) return i + 1
  }
  return src.length
}

/** Every supabase `.from('<table>')...` chain as a list of method calls. */
function chainsIn(file: string, src: string, tables: string[]): Chain[] {
  const out: Chain[] = []
  const fromRe = /\.from\(\s*(['"`])([A-Za-z_]+)\1\s*\)/g
  let m: RegExpExecArray | null
  while ((m = fromRe.exec(src))) {
    if (!tables.includes(m[2])) continue
    const calls: Call[] = []
    let i = m.index + m[0].length
    for (;;) {
      const rest = /^\s*\.\s*([A-Za-z_$][\w$]*)\s*\(/.exec(src.slice(i))
      if (!rest) break
      const open = i + rest[0].length - 1
      const close = matchParen(src, open)
      calls.push({ name: rest[1], args: src.slice(open + 1, close - 1) })
      i = close
    }
    out.push({ file: path.relative(ROOT, file), line: src.slice(0, m.index).split('\n').length, table: m[2], calls })
  }
  return out
}

const files = SCAN_DIRS.flatMap(sourceFiles)
const sources = files.map(file => ({ file, src: fs.readFileSync(file, 'utf8') }))
const allChains = sources.flatMap(({ file, src }) => chainsIn(file, src, ['trip_sessions', 'chat_history']))
const sessionChains = allChains.filter(c => c.table === 'trip_sessions')
const where = (c: Chain) => `${c.file}:${c.line}`

describe('session-scope invariant (D-07, D-10)', () => {
  it('finds the trip_sessions chains it is meant to guard', () => {
    // Sanity check so a parser bug cannot make the invariant pass vacuously
    expect(sessionChains.length).toBeGreaterThanOrEqual(3)
    expect(sessionChains.some(c => c.calls.some(k => k.name === 'maybeSingle'))).toBe(true)
  })

  it('every single-row trip_sessions read filters by id or itinerary_id (or is an insert)', () => {
    const offenders = sessionChains
      .filter(c => c.calls.some(k => k.name === 'single' || k.name === 'maybeSingle'))
      .filter(c => {
        if (c.calls.some(k => k.name === 'insert')) return false
        return !c.calls.some(k => k.name === 'eq' && /^\s*(['"`])(id|itinerary_id)\1\s*,/.test(k.args))
      })
      .map(where)
    expect(offenders).toEqual([])
  })

  it('no upsert uses user_id as its conflict target', () => {
    // Built from pieces so the forbidden literal never appears in this file
    const forbidden = new RegExp(['on', 'Conflict', '\\s*:\\s*', '([\'"`])', 'user', '_id', '\\1'].join(''))
    const offenders = sources.filter(({ src }) => forbidden.test(src)).map(({ file }) => path.relative(ROOT, file))
    expect(offenders).toEqual([])
  })

  it('nothing deletes trip_sessions or chat_history rows', () => {
    const offenders = allChains.filter(c => c.calls.some(k => k.name === 'delete')).map(where)
    expect(offenders).toEqual([])
  })

  it('the session route exports no DELETE handler', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/app/api/chat/session/route.ts'), 'utf8')
    expect(src).not.toMatch(/export\s+(async\s+)?function\s+DELETE\b/)
    expect(src).not.toMatch(/export\s+(const|let|var)\s+DELETE\b/)
    expect(src).not.toMatch(/export\s*\{[^}]*\bDELETE\b[^}]*\}/)
  })
})
