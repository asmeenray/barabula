import { test, expect } from '@playwright/test'
import type { Request } from '@playwright/test'
import { readFixtures } from './helpers/fixtures'
import { elementTime, markTime, scriptBytes, throttle4G } from './helpers/perf'

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

const JS_BUDGET_BYTES = 204_800 // 200 KB gzipped, MapLibre excluded
const BOARD_BUDGET_MS = 2_000 // elementtiming="board"
const MAP_SLOW4G_BUDGET_MS = 9_500 // barabula:map-load

const kb = (n: number) => (n / 1024).toFixed(1)

test('trip plan route stays within the JS, board and map budgets', async ({ page }) => {
  test.setTimeout(90_000)
  const fx = readFixtures()

  // Map network tally (worker requests included), for the report only.
  const mapRequests: Request[] = []
  page.context().on('requestfinished', (req) => {
    const url = req.url()
    if (url.includes('/maplibre/') || url.startsWith('https://tiles.openfreemap.org/')) mapRequests.push(req)
  })

  const throttled = await throttle4G(page)
  expect(throttled, 'budgets need Chromium CDP throttling').toBe(true)

  await page.goto(`/itinerary/${fx.lisbonId}`, { waitUntil: 'load' })

  await expect.poll(() => markTime(page, 'barabula:board-ready'), { timeout: 30_000 }).toBeDefined()
  await expect.poll(() => markTime(page, 'barabula:map-load'), { timeout: 30_000 }).toBeDefined()
  const hydratedMs = (await markTime(page, 'barabula:board-ready')) as number
  const mapMs = (await markTime(page, 'barabula:map-load')) as number
  const boardMs = await elementTime(page, 'board')
  expect(boardMs, 'the board title paints with elementtiming="board"').not.toBeNull()

  const js = await scriptBytes(page)
  console.log(`JS (gzip, excl. MapLibre): ${js.totalBytes} bytes = ${kb(js.totalBytes)} KB`)
  for (const f of [...js.files].sort((a, b) => b.bytes - a.bytes)) {
    console.log(`  ${kb(f.bytes).padStart(7)} KB  ${new URL(f.url).pathname}`)
  }

  let mapBytes = 0
  const lines: string[] = []
  for (const req of mapRequests) {
    const { responseBodySize } = await req.sizes()
    const status = (await req.response())?.status() ?? 0
    mapBytes += responseBodySize
    const u = new URL(req.url())
    lines.push(`  ${kb(responseBodySize).padStart(7)} KB  ${status}  ${u.host}${u.pathname}`)
  }
  console.log(`Map network: ${mapRequests.length} requests, ${kb(mapBytes)} KB on the wire`)
  for (const line of lines) console.log(line)

  console.log(`Board painted (elementtiming=board): ${Math.round(boardMs as number)} ms`)
  console.log(`Board hydrated (barabula:board-ready, not asserted, Q50): ${Math.round(hydratedMs)} ms`)
  console.log(`Map interactive (barabula:map-load): ${Math.round(mapMs)} ms`)

  expect(js.totalBytes).toBeLessThanOrEqual(JS_BUDGET_BYTES)
  expect(boardMs as number).toBeLessThanOrEqual(BOARD_BUDGET_MS)
  expect(mapMs).toBeLessThanOrEqual(MAP_SLOW4G_BUDGET_MS)
})
