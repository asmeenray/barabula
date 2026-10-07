import { test, expect, devices } from '@playwright/test'
import type { Browser, Request } from '@playwright/test'
import { OWNER_STATE_PATH, readFixtures } from './helpers/fixtures'
import { elementTime, markTime, scriptBytes, throttle4G } from './helpers/perf'
import type { ScriptBytes } from './helpers/perf'

// Handover §4.6 budgets on the trip plan route, phone-throttled project only
// (slow 4G 1.6 Mbps / 150 ms + 4x CPU). Never loosen these numbers to make the
// test pass.
//
// Revised 6 Oct 2026 (Asmeen, handover Q46, option "A + C"):
// - The 2 s limit applies to the board: the plan's title and rows painted
//   (elementtiming="board"), the "board usable ~1.2 s" measure behind the
//   decision. Hydration (barabula:board-ready, day tabs respond) is logged
//   too; it is ~2.1-2.3 s and is tracked as handover Q50, not asserted.
// - The map has its own slow-4G limit: the worst of 3 runs measured after the
//   byte cuts (9,236 / 9,234 / 9,364 ms), rounded up to the next whole 500 ms.
//   Before the cuts it was ~10.5-11.4 s.
// - The JS budget is unchanged.
//
// Revised 7 Oct 2026 (Asmeen, handover Q54, "Median of 3 runs"):
// - The two timing budgets (board painted, map ready) are measured on 3 cold
//   loads, each in a fresh browser context, and the MEDIAN is asserted against
//   the same limits. All 3 runs are logged. A busy machine swings single runs
//   by more than a second.
// - Route JS stays one exact check (the bytes do not vary between runs).

const JS_BUDGET_BYTES = 204_800 // 200 KB gzipped, MapLibre excluded
const BOARD_BUDGET_MS = 2_000 // elementtiming="board", median of RUNS
const MAP_SLOW4G_BUDGET_MS = 9_500 // barabula:map-load, median of RUNS
const RUNS = 3

const kb = (n: number) => (n / 1024).toFixed(1)
const ms = (n: number) => `${Math.round(n)} ms`

/** Middle value of an odd-length list. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

type Run = { boardMs: number; mapMs: number; hydratedMs: number; js?: ScriptBytes; mapLines?: string[] }

/** One cold, throttled load of the plan route in a fresh context. */
async function measure(browser: Browser, url: string, baseURL: string, withBytes: boolean): Promise<Run> {
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    storageState: OWNER_STATE_PATH,
    baseURL,
  })
  try {
    const page = await context.newPage()

    // Map network tally (worker requests included), for the report only.
    const mapRequests: Request[] = []
    context.on('requestfinished', (req) => {
      const u = req.url()
      if (u.includes('/maplibre/') || u.startsWith('https://tiles.openfreemap.org/')) mapRequests.push(req)
    })

    const throttled = await throttle4G(page)
    expect(throttled, 'budgets need Chromium CDP throttling').toBe(true)

    await page.goto(url, { waitUntil: 'load' })

    await expect.poll(() => markTime(page, 'barabula:board-ready'), { timeout: 30_000 }).toBeDefined()
    await expect.poll(() => markTime(page, 'barabula:map-load'), { timeout: 30_000 }).toBeDefined()
    const hydratedMs = (await markTime(page, 'barabula:board-ready')) as number
    const mapMs = (await markTime(page, 'barabula:map-load')) as number
    const boardMs = await elementTime(page, 'board')
    expect(boardMs, 'the board title paints with elementtiming="board"').not.toBeNull()

    if (!withBytes) return { boardMs: boardMs as number, mapMs, hydratedMs }

    const js = await scriptBytes(page)
    const mapLines: string[] = []
    let mapBytes = 0
    for (const req of mapRequests) {
      const { responseBodySize } = await req.sizes()
      const status = (await req.response())?.status() ?? 0
      mapBytes += responseBodySize
      const u = new URL(req.url())
      mapLines.push(`  ${kb(responseBodySize).padStart(7)} KB  ${status}  ${u.host}${u.pathname}`)
    }
    mapLines.unshift(`Map network: ${mapRequests.length} requests, ${kb(mapBytes)} KB on the wire`)
    return { boardMs: boardMs as number, mapMs, hydratedMs, js, mapLines }
  } finally {
    await context.close()
  }
}

test('trip plan route stays within the JS, board and map budgets', async ({ browser }, testInfo) => {
  test.setTimeout(240_000)
  const fx = readFixtures()
  const baseURL = testInfo.project.use.baseURL as string
  const url = `/itinerary/${fx.lisbonId}`

  const runs: Run[] = []
  for (let i = 0; i < RUNS; i++) runs.push(await measure(browser, url, baseURL, i === 0))

  const js = runs[0].js as ScriptBytes
  console.log(`JS (gzip, excl. MapLibre, run 1): ${js.totalBytes} bytes = ${kb(js.totalBytes)} KB`)
  for (const f of [...js.files].sort((a, b) => b.bytes - a.bytes)) {
    console.log(`  ${kb(f.bytes).padStart(7)} KB  ${new URL(f.url).pathname}`)
  }
  for (const line of runs[0].mapLines ?? []) console.log(line)

  runs.forEach((r, i) => {
    console.log(
      `Run ${i + 1}: board painted ${ms(r.boardMs)} · map interactive ${ms(r.mapMs)} · hydrated ${ms(r.hydratedMs)} (not asserted, Q50)`
    )
  })
  const boardMedian = median(runs.map((r) => r.boardMs))
  const mapMedian = median(runs.map((r) => r.mapMs))
  console.log(`Median of ${RUNS}: board painted ${ms(boardMedian)} (limit ${BOARD_BUDGET_MS}) · map ${ms(mapMedian)} (limit ${MAP_SLOW4G_BUDGET_MS})`)

  expect(js.totalBytes).toBeLessThanOrEqual(JS_BUDGET_BYTES)
  expect(boardMedian, `median board paint of ${RUNS} runs`).toBeLessThanOrEqual(BOARD_BUDGET_MS)
  expect(mapMedian, `median map ready of ${RUNS} runs`).toBeLessThanOrEqual(MAP_SLOW4G_BUDGET_MS)
})
