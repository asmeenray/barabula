import { test, expect, devices } from '@playwright/test'
import type { Browser, BrowserContextOptions, Page, Request } from '@playwright/test'
import { OWNER_STATE_PATH, readFixtures } from './helpers/fixtures'
import { elementTime, markTime, readLCP, scriptBytes, throttle4G } from './helpers/perf'
import type { ScriptBytes } from './helpers/perf'

// Handover §4.6 budgets, phone-throttled project only (slow 4G 1.6 Mbps /
// 150 ms + 4x CPU). Never loosen these numbers to make the test pass.
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
// - Every timing budget is measured on 3 cold loads, each in a fresh browser
//   context, and the MEDIAN is asserted against the limit. All 3 runs are
//   logged. A busy machine swings single runs by more than a second.
// - Route JS stays one exact check (the bytes do not vary between runs).
//
// 16-14: the byte count waits for the idle-loaded drag chunk
// (barabula:dnd-ready), so drag and drop is always inside the JS budget.
//
// Revised 7 Oct 2026 (Asmeen, handover Q63, "Raise the limit to 250 KB"):
// - Route JS gzip limit 200 KB (204800 B) -> 250 KB (256000 B). The timing limits and
//   the median of 3 are unchanged.
//
// 16-24 (phase proof) adds the rest of §4.6: home LCP logged out and signed in
// (≤ 2.5 s), place ticket and Places card open (≤ 300 ms, click mark to
// visible mark), the Places map, and route JS on / and /places (same 250 KB
// limit as the plan). The Places map uses the same MapLibre build and tiles
// as the plan, so it is held to the Q46 slow-4G map limit (handover Q70 asks
// Asmeen to confirm this reading).

const JS_BUDGET_BYTES = 256000 // 250 KB gzipped, MapLibre excluded (Q63)
const BOARD_BUDGET_MS = 2000 // elementtiming="board", median of RUNS
const MAP_SLOW4G_BUDGET_MS = 9500 // barabula:map-load / places-map-load, median of RUNS
const LCP_BUDGET_MS = 2500 // largest-contentful-paint on /, median of RUNS
const OPEN_BUDGET_MS = 300 // ticket / card: click mark -> visible mark, median of RUNS
const RUNS = 3

const LOGGED_OUT: BrowserContextOptions['storageState'] = { cookies: [], origins: [] }

const kb = (n: number) => (n / 1024).toFixed(1)
const ms = (n: number) => `${Math.round(n)} ms`

/** Middle value of an odd-length list. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function logBytes(label: string, js: ScriptBytes) {
  console.log(`${label} JS (gzip, excl. MapLibre): ${js.totalBytes} bytes = ${kb(js.totalBytes)} KB (limit ${JS_BUDGET_BYTES})`)
  for (const f of [...js.files].sort((a, b) => b.bytes - a.bytes)) {
    console.log(`  ${kb(f.bytes).padStart(7)} KB  ${new URL(f.url).pathname}`)
  }
}

/** A fresh Pixel 7 context, signed in as the owner unless storageState says otherwise. */
async function freshPage(
  browser: Browser,
  baseURL: string,
  storageState: BrowserContextOptions['storageState'] = OWNER_STATE_PATH
): Promise<Page> {
  const context = await browser.newContext({ ...devices['Pixel 7'], storageState, baseURL })
  const page = await context.newPage()
  const throttled = await throttle4G(page)
  expect(throttled, 'budgets need Chromium CDP throttling').toBe(true)
  return page
}

/** ms between the first click mark and the first visible mark after it. */
async function openTime(page: Page, click: string, visible: string): Promise<number> {
  await expect.poll(() => markTime(page, visible), { timeout: 10_000 }).toBeDefined()
  const t0 = (await markTime(page, click)) as number
  const t1 = (await markTime(page, visible)) as number
  expect(t0, `${click} mark`).toBeDefined()
  return t1 - t0
}

// ---------------------------------------------------------------- trip plan

type PlanRun = {
  boardMs: number
  mapMs: number
  hydratedMs: number
  ticketMs: number
  js?: ScriptBytes
  mapLines?: string[]
}

/** One cold, throttled load of the plan route in a fresh context, then a ticket open. */
async function measurePlan(browser: Browser, url: string, baseURL: string, firstRowId: string, withBytes: boolean): Promise<PlanRun> {
  const page = await freshPage(browser, baseURL)
  const context = page.context()
  try {
    // Map network tally (worker requests included), for the report only.
    const mapRequests: Request[] = []
    context.on('requestfinished', (req) => {
      const u = req.url()
      if (u.includes('/maplibre/') || u.startsWith('https://tiles.openfreemap.org/')) mapRequests.push(req)
    })

    await page.goto(url, { waitUntil: 'load' })

    await expect.poll(() => markTime(page, 'barabula:board-ready'), { timeout: 30_000 }).toBeDefined()
    await expect.poll(() => markTime(page, 'barabula:map-load'), { timeout: 30_000 }).toBeDefined()
    const hydratedMs = (await markTime(page, 'barabula:board-ready')) as number
    const mapMs = (await markTime(page, 'barabula:map-load')) as number
    const boardMs = await elementTime(page, 'board')
    expect(boardMs, 'the board title paints with elementtiming="board"').not.toBeNull()

    let js: ScriptBytes | undefined
    const mapLines: string[] = []
    if (withBytes) {
      // The drag layer (16-14) loads on idle after the map; count its chunk too.
      await expect.poll(() => markTime(page, 'barabula:dnd-ready'), { timeout: 30_000 }).toBeDefined()
      js = await scriptBytes(page)
      let mapBytes = 0
      for (const req of mapRequests) {
        const { responseBodySize } = await req.sizes()
        const status = (await req.response())?.status() ?? 0
        mapBytes += responseBodySize
        const u = new URL(req.url())
        mapLines.push(`  ${kb(responseBodySize).padStart(7)} KB  ${status}  ${u.host}${u.pathname}`)
      }
      mapLines.unshift(`Map network: ${mapRequests.length} requests, ${kb(mapBytes)} KB on the wire`)
    }

    // Place ticket (§4.6 "place sheet open"): day 1's first row, click → ticket laid out.
    const rowButton = page.locator(`li[data-activity-id="${firstRowId}"] > button[aria-expanded]:not([aria-haspopup])`)
    await expect(rowButton).toHaveAttribute('aria-expanded', 'false')
    await rowButton.click()
    await expect(rowButton).toHaveAttribute('aria-expanded', 'true')
    const ticketMs = await openTime(page, 'barabula:ticket-click', 'barabula:ticket-visible')

    return { boardMs: boardMs as number, mapMs, hydratedMs, ticketMs, js, mapLines }
  } finally {
    await context.close()
  }
}

test('trip plan route stays within the JS, board, map and ticket budgets', async ({ browser }, testInfo) => {
  test.setTimeout(300_000)
  const fx = readFixtures()
  const baseURL = testInfo.project.use.baseURL as string
  const url = `/itinerary/${fx.lisbonId}`

  const runs: PlanRun[] = []
  for (let i = 0; i < RUNS; i++) runs.push(await measurePlan(browser, url, baseURL, fx.activityIds['1'][0], i === 0))

  const js = runs[0].js as ScriptBytes
  logBytes('Plan /itinerary/{lisbon}', js)
  for (const line of runs[0].mapLines ?? []) console.log(line)

  runs.forEach((r, i) => {
    console.log(
      `Plan run ${i + 1}: board painted ${ms(r.boardMs)} · map interactive ${ms(r.mapMs)} · ticket open ${ms(r.ticketMs)} · hydrated ${ms(r.hydratedMs)} (not asserted, Q50)`
    )
  })
  const boardMedian = median(runs.map((r) => r.boardMs))
  const mapMedian = median(runs.map((r) => r.mapMs))
  const ticketMedian = median(runs.map((r) => r.ticketMs))
  console.log(
    `Plan median of ${RUNS}: board painted ${ms(boardMedian)} (limit ${BOARD_BUDGET_MS}) · map ${ms(mapMedian)} (limit ${MAP_SLOW4G_BUDGET_MS}) · ticket ${ms(ticketMedian)} (limit ${OPEN_BUDGET_MS})`
  )

  expect(js.totalBytes, 'plan route JS').toBeLessThanOrEqual(JS_BUDGET_BYTES)
  expect(boardMedian, `median board paint of ${RUNS} runs`).toBeLessThanOrEqual(BOARD_BUDGET_MS)
  expect(mapMedian, `median map ready of ${RUNS} runs`).toBeLessThanOrEqual(MAP_SLOW4G_BUDGET_MS)
  expect(ticketMedian, `median ticket open of ${RUNS} runs`).toBeLessThanOrEqual(OPEN_BUDGET_MS)
})

// --------------------------------------------------------------------- home

type HomeRun = { lcpMs: number; lcpWhat: string; js?: ScriptBytes }

/** What the LCP entry painted (tag and image file or text start), for the log only. */
async function lcpElement(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        let what = 'none'
        const observer = new PerformanceObserver((list) => {
          const all = list.getEntries() as (PerformanceEntry & { element?: Element | null; url?: string; size?: number })[]
          const e = all[all.length - 1]
          if (!e) return
          const el = e.element
          const text = el?.textContent?.trim().slice(0, 40) ?? ''
          const file = e.url ? new URL(e.url, location.href).pathname : ''
          what = `${el?.tagName.toLowerCase() ?? '?'}${file ? ` ${file}` : text ? ` "${text}"` : ''} (${e.size ?? 0} px²)`
        })
        observer.observe({ type: 'largest-contentful-paint', buffered: true })
        setTimeout(() => {
          observer.disconnect()
          resolve(what)
        }, 250)
      })
  )
}

/** One cold, throttled load of the home page in a fresh context. */
async function measureHome(
  browser: Browser,
  baseURL: string,
  storageState: BrowserContextOptions['storageState'],
  withBytes: boolean
): Promise<HomeRun> {
  const page = await freshPage(browser, baseURL, storageState)
  try {
    await page.goto('/', { waitUntil: 'load' })
    // Let late images (the pass cover) finish and paint; no input, so LCP keeps recording.
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.loading === 'lazy' || i.complete), null, {
      timeout: 30_000,
    })
    await page.waitForTimeout(1_000)
    const lcp = await readLCP(page)
    expect(lcp, 'a largest-contentful-paint entry').not.toBeNull()
    const lcpWhat = await lcpElement(page)
    const js = withBytes ? await scriptBytes(page) : undefined
    return { lcpMs: lcp as number, lcpWhat, js }
  } finally {
    await page.context().close()
  }
}

for (const who of ['logged out', 'signed in'] as const) {
  test(`home (${who}) stays within the LCP and JS budgets`, async ({ browser }, testInfo) => {
    test.setTimeout(180_000)
    const baseURL = testInfo.project.use.baseURL as string
    const state = who === 'logged out' ? LOGGED_OUT : OWNER_STATE_PATH

    const runs: HomeRun[] = []
    for (let i = 0; i < RUNS; i++) runs.push(await measureHome(browser, baseURL, state, i === 0))

    const js = runs[0].js as ScriptBytes
    logBytes(`Home / (${who})`, js)
    runs.forEach((r, i) => console.log(`Home (${who}) run ${i + 1}: LCP ${ms(r.lcpMs)} · ${r.lcpWhat}`))
    const lcpMedian = median(runs.map((r) => r.lcpMs))
    console.log(`Home (${who}) median of ${RUNS}: LCP ${ms(lcpMedian)} (limit ${LCP_BUDGET_MS})`)

    expect(js.totalBytes, `home (${who}) JS`).toBeLessThanOrEqual(JS_BUDGET_BYTES)
    expect(lcpMedian, `median home LCP (${who}) of ${RUNS} runs`).toBeLessThanOrEqual(LCP_BUDGET_MS)
  })
}

// ------------------------------------------------------------------- Places

type PlacesRun = { mapMs: number; cardMs: number; js?: ScriptBytes }

/** One cold, throttled load of /places in a fresh context, then a card open from the list. */
async function measurePlaces(browser: Browser, baseURL: string, withBytes: boolean): Promise<PlacesRun> {
  const page = await freshPage(browser, baseURL)
  try {
    await page.goto('/places', { waitUntil: 'load' })
    await expect.poll(() => markTime(page, 'barabula:places-map-load'), { timeout: 30_000 }).toBeDefined()
    const mapMs = (await markTime(page, 'barabula:places-map-load')) as number
    const js = withBytes ? await scriptBytes(page) : undefined

    const row = page.getByRole('button', { name: /Time Out Market/ }).filter({ hasText: 'Time Out Market' }).first()
    await row.click()
    await expect(page.getByRole('region', { name: 'Time Out Market' })).toBeVisible()
    const cardMs = await openTime(page, 'barabula:card-click', 'barabula:card-visible')
    return { mapMs, cardMs, js }
  } finally {
    await page.context().close()
  }
}

test('Places stays within the JS, map and card budgets', async ({ browser }, testInfo) => {
  test.setTimeout(300_000)
  const baseURL = testInfo.project.use.baseURL as string

  const runs: PlacesRun[] = []
  for (let i = 0; i < RUNS; i++) runs.push(await measurePlaces(browser, baseURL, i === 0))

  const js = runs[0].js as ScriptBytes
  logBytes('Places /places', js)
  runs.forEach((r, i) => console.log(`Places run ${i + 1}: map interactive ${ms(r.mapMs)} · card open ${ms(r.cardMs)}`))
  const mapMedian = median(runs.map((r) => r.mapMs))
  const cardMedian = median(runs.map((r) => r.cardMs))
  console.log(
    `Places median of ${RUNS}: map ${ms(mapMedian)} (limit ${MAP_SLOW4G_BUDGET_MS}) · card ${ms(cardMedian)} (limit ${OPEN_BUDGET_MS})`
  )

  expect(js.totalBytes, 'Places route JS').toBeLessThanOrEqual(JS_BUDGET_BYTES)
  expect(mapMedian, `median Places map ready of ${RUNS} runs`).toBeLessThanOrEqual(MAP_SLOW4G_BUDGET_MS)
  expect(cardMedian, `median card open of ${RUNS} runs`).toBeLessThanOrEqual(OPEN_BUDGET_MS)
})
