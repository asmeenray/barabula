import { test, expect, type Locator, type Page } from '@playwright/test'
import { readFixtures } from './helpers/fixtures'

// Motion (16-20, 16-22, D-30…D-32): the split-flap moments run and settle on
// the real text, reduced motion turns them into plain changes, and the laptop
// plane cursor sits beside the real cursor (never hides it). Moment 2: a new
// place lands lit (and fades in under reduced motion). Phone (Pixel 7) and
// laptop projects, signed in as the fixture owner, local stack only. The e2e
// server runs with NOMINATIM_DISABLED=1, so no pin is located and dropped here.

type GlyphWindow = Window & { __glyphs: string[] }

/**
 * Logs every split-flap glyph that appears, by where it is: 'blank' (the
 * home blank pass), 'now' / 'next' (Now/Next pass), a plan day ('1', '2',
 * 'maybe'), else 'other' (e.g. LOADING MAP…). Installed before the page loads.
 */
async function watchGlyphs(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as GlyphWindow
    w.__glyphs = []
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue
          const glyph = node.matches('[data-glyph]') ? node : node.querySelector('[data-glyph]')
          if (!glyph) continue
          const where =
            glyph.closest('[data-day]')?.getAttribute('data-day') ??
            glyph.closest('[data-pass]')?.getAttribute('data-pass') ??
            (glyph.closest('#next-trip-pass') ? 'blank' : 'other')
          w.__glyphs.push(where)
        }
      }
    }).observe(document, { childList: true, subtree: true })
  })
}

const glyphLog = (page: Page) => page.evaluate(() => (window as unknown as GlyphWindow).__glyphs)

function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 1024
}

async function pickCity(page: Page, typed: string, option: string) {
  const input = page.getByRole('combobox')
  await input.click()
  await input.fill(typed)
  await page.getByRole('option', { name: option }).click()
}

/** Phone: the D2 tab; laptop: the D2 day header row. */
async function switchToDay2(page: Page) {
  if (isPhone(page)) await page.getByRole('tablist', { name: 'Days' }).getByRole('tab', { name: /^D2\b/ }).click()
  else await page.getByRole('button', { name: /^D2 · / }).click()
}

const plane = (page: Page) => page.locator('[data-plane-cursor]')

type AnimWindow = Window & { __rowMoves: string[] }

/** Logs the transform keyframes of every element.animate() call on a plan row (moment 2's FLIP). */
async function watchRowAnimations(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as AnimWindow
    w.__rowMoves = []
    const animate = Element.prototype.animate
    Element.prototype.animate = function (this: Element, keyframes, options) {
      if (this.matches('li[data-activity-id]') && Array.isArray(keyframes)) {
        w.__rowMoves.push(keyframes.map((k) => String((k as Keyframe).transform ?? (k as Keyframe).opacity)).join(' > '))
      }
      return animate.call(this, keyframes, options)
    }
  })
}

/**
 * The e2e geocoder is off (NOMINATIM_DISABLED); answer the single-place
 * lookup in the browser instead, with a point in central Lisbon near day 1.
 */
async function locateAddedPlaces(page: Page) {
  await page.route('**/api/activities/*/geocode', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'hit', lat: 38.7139, lng: -9.1394 }) })
  )
}

/** Moment 2's marker: [inner element animations, marker root animations], or null while there is none. */
const dropAnimations = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-pin-drop]')
    const root = el?.closest('.maplibregl-marker')
    if (!el || !root) return null
    return [el.getAnimations({ subtree: true }).length, root.getAnimations().length]
  })

type VtWindow = Window & { __viewTransitions: number }

/** Counts document.startViewTransition calls (moment 4), installed before the page loads. */
async function countViewTransitions(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as VtWindow
    w.__viewTransitions = 0
    const start = document.startViewTransition
    if (typeof start !== 'function') return
    document.startViewTransition = function (this: Document, ...args: Parameters<Document['startViewTransition']>) {
      w.__viewTransitions += 1
      return start.apply(this, args)
    } as Document['startViewTransition']
  })
}

const viewTransitions = (page: Page) => page.evaluate(() => (window as unknown as VtWindow).__viewTransitions)

/** Taps the Lisbon upcoming pass on the home page and waits for its plan. */
async function openLisbonFromItsPass(page: Page, lisbonId: string) {
  await page.goto('/')
  const upcoming = page.getByRole('region', { name: /^Upcoming/ })
  await upcoming.getByRole('link', { name: /^Lisbon,/ }).click()
  await expect(page).toHaveURL(new RegExp(`/itinerary/${lisbonId}$`))
  await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
}

const rowMoves = (page: Page) => page.evaluate(() => (window as unknown as AnimWindow).__rowMoves)

/** Adds a place to day 1 through the place form (sheet on phone, inline on laptop); returns the saved id. */
async function addToDay1(page: Page, name: string, address?: string): Promise<string> {
  await page.locator('button:visible', { hasText: /^Add place$/ }).click()
  const form: Locator = isPhone(page)
    ? page.getByRole('dialog', { name: 'Add a place' })
    : page.getByRole('group', { name: 'Add a place' })
  await expect(form).toBeVisible()
  await form.getByLabel('Place name').fill(name)
  if (address) await form.getByLabel(/Address or area/).fill(address)
  await form.getByRole('combobox', { name: 'Day' }).click()
  await page.getByRole('option', { name: 'Day 1', exact: true }).click()
  const created = page.waitForResponse(
    (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/activities'
  )
  await form.getByRole('button', { name: 'Add place' }).click()
  const res = await created
  expect(res.status()).toBe(201)
  return ((await res.json()) as { id: string }).id
}

test.describe('motion', () => {
  test('laptop: the plane flies beside the cursor over the blank pass, never instead of it', async ({ page }) => {
    test.skip(isPhone(page), 'laptop only')
    await page.goto('/')
    const pass = page.getByRole('region', { name: 'Next trip' })
    await expect(pass).toBeVisible()
    const box = (await pass.boundingBox())!
    const x = box.x + 60
    const y = box.y + 60
    await page.mouse.move(x, y)
    await page.mouse.move(x + 120, y + 40, { steps: 8 })

    await expect(plane(page)).toHaveCount(1)
    await expect(plane(page)).toHaveAttribute('aria-hidden', 'true')
    expect(await plane(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
    await expect.poll(() => plane(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    expect(await plane(page).evaluate((el) => getComputedStyle(el).transform)).not.toBe('none')

    // The system cursor is still there under the pointer.
    const cursor = await page.evaluate(
      ([px, py]) => getComputedStyle(document.elementFromPoint(px, py)!).cursor,
      [x + 120, y + 40]
    )
    expect(cursor).not.toBe('none')

    // It fades out over the city field.
    const field = (await page.getByRole('combobox').boundingBox())!
    await page.mouse.move(field.x + 20, field.y + field.height / 2, { steps: 4 })
    await expect.poll(() => plane(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('0')
  })

  test('phone: no plane cursor', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only')
    await page.goto('/')
    await expect(page.getByRole('region', { name: 'Next trip' })).toBeVisible()
    await page.getByRole('combobox').click()
    await expect(plane(page)).toHaveCount(0)
  })

  test('moment 1: picking a city split-flaps the title, then it reads the city', async ({ page }) => {
    await watchGlyphs(page)
    await page.goto('/')
    await pickCity(page, 'Lis', 'Lisbon')
    const title = page.getByRole('heading', { level: 1, name: 'Lisbon' })
    await expect(title).toBeVisible()
    await expect.poll(async () => (await glyphLog(page)).includes('blank')).toBe(true)
    await expect(title).toHaveText('Lisbon')
    await expect(page.locator('#next-trip-pass [data-glyph]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Edit destination' })).toBeVisible()
  })

  test('the Now/Next title split-flaps once per visit', async ({ page }) => {
    await watchGlyphs(page)
    await page.goto('/')
    await expect(page.locator('[data-pass="now"]')).toBeVisible()
    await expect.poll(async () => (await glyphLog(page)).includes('now')).toBe(true)
    expect(await page.evaluate(() => sessionStorage.getItem('barabula-nownext-flap'))).toBe('1')

    await page.reload()
    await expect(page.locator('[data-pass="now"]')).toBeVisible()
    await page.waitForTimeout(800)
    expect(await glyphLog(page)).not.toContain('now')
  })

  test('moment 3: a day switch flips the new day, not the first load', async ({ page }) => {
    const fx = readFixtures()
    await watchGlyphs(page)
    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.locator('[data-day="1"] [data-activity-id]').first()).toBeVisible()
    await page.waitForTimeout(500)
    expect((await glyphLog(page)).filter((w) => w !== 'other')).toEqual([])

    await switchToDay2(page)
    await expect.poll(async () => (await glyphLog(page)).includes('2')).toBe(true)
    // Settles within the 500 ms board flip.
    await expect(page.locator('[data-day="2"] [data-glyph]')).toHaveCount(0, { timeout: 2_000 })
    await expect(page.locator(`[data-activity-id="${fx.activityIds['2'][0]}"]`)).toBeVisible()
  })

  test('moment 2: a new place lands from the form, lit, with the toast', async ({ page }) => {
    const fx = readFixtures()
    await watchRowAnimations(page)
    await watchGlyphs(page)
    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
    let id: string | null = null
    try {
      id = await addToDay1(page, 'Moment Test')
      const row = page.locator(`li[data-activity-id="${id}"]`)
      await expect(row).toBeVisible()
      await expect(row).toHaveAttribute('data-lit', 'true')
      // The lit wash: accent at 18% (a translucent yellow), not the plain board.
      const bg = await row.evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(bg).not.toBe('rgba(0, 0, 0, 0)')
      await expect(page.getByRole('status', { name: 'Notifications' })).toContainText('Added to day 1')
      // It moved in from the form (a translateY FLIP), and its name split-flapped on day 1.
      expect((await rowMoves(page)).some((m) => /^translateY\(-?[\d.]+px\) > none$/.test(m))).toBe(true)
      expect(await glyphLog(page)).toContain('1')
      await expect(row).toHaveText(/Moment Test/i)
    } finally {
      if (id) await page.request.delete(`/api/activities/${id}`)
    }
  })
})

test('moment 4: the trip opens from its pass through a view transition', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Chromium has document.startViewTransition')
  const fx = readFixtures()
  await countViewTransitions(page)
  await openLisbonFromItsPass(page, fx.lisbonId)
  expect(await viewTransitions(page)).toBeGreaterThanOrEqual(1)
  // The header strip is the morph's other end; the board is there and usable after it.
  await expect(page.locator(`li[data-activity-id="${fx.activityIds['1'][0]}"]`)).toBeVisible()
})

test('moment 2 on the map: the located place drops its pin, then the map pin takes over', async ({ page }) => {
  const fx = readFixtures()
  await locateAddedPlaces(page)
  await page.goto(`/itinerary/${fx.lisbonId}`)
  const map = page.locator('#trip-map')
  await expect.poll(() => map.getAttribute('data-pins-rendered'), { timeout: 30_000 }).toBe('4')
  let id: string | null = null
  try {
    id = await addToDay1(page, 'Moment Pin', 'Rossio')
    // The drop runs on the inner elements; MapLibre's marker root is never animated.
    await expect
      .poll(
        async () => {
          const counts = await dropAnimations(page)
          return counts !== null && counts[0] > 0 && counts[1] === 0
        },
        { timeout: 10_000, intervals: [50] }
      )
      .toBe(true)
    await expect(page.locator('[data-pin-drop="drop"]')).toHaveCount(1)
    // Then the marker goes and the day's symbol pins count the new one.
    await expect(page.locator('[data-pin-drop]')).toHaveCount(0, { timeout: 5_000 })
    await expect.poll(() => map.getAttribute('data-pins-rendered'), { timeout: 15_000 }).toBe('5')
  } finally {
    if (id) await page.request.delete(`/api/activities/${id}`)
  }
})

test.describe('motion, reduced', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the pass shows the city at once and there is no plane', async ({ page }) => {
    await watchGlyphs(page)
    await page.goto('/')
    const pass = page.getByRole('region', { name: 'Next trip' })
    await expect(pass).toBeVisible()
    if (!isPhone(page)) {
      const box = (await pass.boundingBox())!
      await page.mouse.move(box.x + 60, box.y + 60)
      await page.mouse.move(box.x + 180, box.y + 100, { steps: 8 })
    }
    await pickCity(page, 'Lis', 'Lisbon')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lisbon')
    await expect(page.getByRole('button', { name: 'Edit destination' })).toBeVisible()
    await page.waitForTimeout(400)
    expect(await glyphLog(page)).toEqual([])
    await expect(plane(page)).toHaveCount(0)
  })

  test('a day switch shows day 2 at once', async ({ page }) => {
    const fx = readFixtures()
    await watchGlyphs(page)
    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.locator('[data-day="1"] [data-activity-id]').first()).toBeVisible()
    await switchToDay2(page)
    await expect(page.locator(`[data-activity-id="${fx.activityIds['2'][0]}"]`)).toBeVisible()
    await page.waitForTimeout(400)
    expect(await glyphLog(page)).toEqual([])
  })

  test('moment 2: a new place shows at once and only fades in', async ({ page }) => {
    const fx = readFixtures()
    await watchRowAnimations(page)
    await watchGlyphs(page)
    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
    let id: string | null = null
    try {
      id = await addToDay1(page, 'Moment Test')
      const row = page.locator(`li[data-activity-id="${id}"]`)
      await expect(row).toBeVisible()
      await expect(row).toHaveAttribute('data-lit', 'true')
      await page.waitForTimeout(200)
      expect(await row.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0)
      expect((await rowMoves(page)).every((m) => !m.includes('translateY'))).toBe(true)
      expect(await glyphLog(page)).toEqual([])
    } finally {
      if (id) await page.request.delete(`/api/activities/${id}`)
    }
  })

  test('moment 2 on the map: the pin only fades in', async ({ page }) => {
    const fx = readFixtures()
    await locateAddedPlaces(page)
    await page.goto(`/itinerary/${fx.lisbonId}`)
    const map = page.locator('#trip-map')
    await expect.poll(() => map.getAttribute('data-pins-rendered'), { timeout: 30_000 }).toBe('4')
    let id: string | null = null
    try {
      id = await addToDay1(page, 'Moment Pin', 'Rossio')
      await expect(page.locator('[data-pin-drop="fade"]')).toHaveCount(1, { timeout: 10_000 })
      await expect(page.locator('.pin-drop-ring')).toHaveCount(0)
      await expect(page.locator('[data-pin-drop]')).toHaveCount(0, { timeout: 5_000 })
      await expect.poll(() => map.getAttribute('data-pins-rendered'), { timeout: 15_000 }).toBe('5')
    } finally {
      if (id) await page.request.delete(`/api/activities/${id}`)
    }
  })

  test('moment 4: the trip still opens from its pass', async ({ page }) => {
    const fx = readFixtures()
    await openLisbonFromItsPass(page, fx.lisbonId)
    await expect(page.locator(`li[data-activity-id="${fx.activityIds['1'][0]}"]`)).toBeVisible()
  })
})
