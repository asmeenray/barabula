import { test, expect, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { readFixtures } from './helpers/fixtures'

// Tracer (16-05): a signed-in owner opens an existing trip in the new shell.
// Runs on the phone (Pixel 7) and laptop (1280x800) projects, local stack only.

const MAP_LOAD_MARK = 'barabula:map-load'

function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 1024
}

async function rowIds(page: Page, day: string): Promise<string[]> {
  return page
    .locator(`[data-day="${day}"] [data-activity-id]`)
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-activity-id') ?? ''))
}

test.describe('open a trip (tracer)', () => {
  test('owner sees the days in saved order and the map loads', async ({ page }) => {
    const fx = readFixtures()

    const workerResponse = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/maplibre/maplibre-gl-worker.mjs',
      { timeout: 30_000 }
    )
    const tileRequest = page.waitForRequest((r) => r.url().includes('tiles.openfreemap.org'), {
      timeout: 30_000,
    })

    const response = await page.goto(`/itinerary/${fx.lisbonId}`)
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()

    // Day 1 rows render in the fixture's position order.
    await expect(page.locator('[data-day="1"] [data-activity-id]').first()).toBeVisible()
    expect(await rowIds(page, '1')).toEqual(fx.activityIds['1'])
    expect(await rowIds(page, '2')).toEqual(fx.activityIds['2'])
    expect(await rowIds(page, 'maybe')).toEqual(fx.activityIds['maybe'])

    const day1First = page.locator(`[data-activity-id="${fx.activityIds['1'][0]}"]`)
    const day2First = page.locator(`[data-activity-id="${fx.activityIds['2'][0]}"]`)

    if (isPhone(page)) {
      const tabs = page.getByRole('tablist', { name: 'Days' })
      await expect(tabs.getByRole('tab')).toHaveCount(4) // D1, D2, D3, MAYBE
      await expect(tabs.getByRole('tab').last()).toContainText(/maybe/i)
      await expect(day2First).toBeHidden()

      await tabs.getByRole('tab', { name: /^D2\b/ }).click()
      await expect(tabs.getByRole('tab', { name: /^D2\b/ })).toHaveAttribute('aria-selected', 'true')
      await expect(day2First).toBeVisible()
      await expect(day1First).toBeHidden()
    } else {
      await expect(page.getByRole('tablist', { name: 'Days' })).toBeHidden()
      for (const day of ['1', '2', '3', 'maybe']) {
        await expect(page.locator(`[data-day="${day}"]`)).toBeVisible()
      }
      await expect(day1First).toBeVisible()
      await expect(day2First).toBeVisible()
    }

    expect((await workerResponse).status()).toBe(200)
    await tileRequest

    await expect
      .poll(() => page.evaluate((n) => performance.getEntriesByName(n).length, MAP_LOAD_MARK), {
        timeout: 15_000,
      })
      .toBeGreaterThan(0)

    await expect(page.getByRole('region', { name: /^Map, day \d+, \d+ places?$/ })).toBeVisible()
  })

  test('undated trip shows its stored day count', async ({ page }) => {
    const fx = readFixtures()
    await page.goto(`/itinerary/${fx.portoId}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Porto' })).toBeVisible()
    if (isPhone(page)) {
      const tabs = page.getByRole('tablist', { name: 'Days' })
      await expect(tabs.getByRole('tab', { name: /^D\d/ })).toHaveCount(2)
    } else {
      await expect(page.locator('[data-day="1"]')).toBeVisible()
      await expect(page.locator('[data-day="2"]')).toBeVisible()
      await expect(page.locator('[data-day="3"]')).toHaveCount(0)
    }
  })

  test('board rows read like a departure board (16-06)', async ({ page }) => {
    const fx = readFixtures()
    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()

    // Exactly one NEXT chip: the first not-visited stop of the selected day.
    const next = page.locator('li[data-chip="NEXT"]')
    await expect(next).toHaveCount(1)
    await expect(next).toHaveAttribute('data-activity-id', fx.activityIds['1'][0])
    await expect(page.locator(`[data-day="1"] li[data-chip="LATER"]`)).toHaveCount(3)
    await expect(page.locator(`[data-day="maybe"] li[data-chip="MAYBE"]`)).toHaveCount(1)

    // Walk column: START, then "~{n} min"; "—" where a stop has no coordinates.
    const walk = (id: string) => page.locator(`[data-activity-id="${id}"] [data-walk]`)
    const [d1a, d1b] = fx.activityIds['1']
    await expect(walk(d1a)).toHaveText(/^start$/i)
    await expect(walk(d1b)).toHaveText(/^~\d+ min$/)
    const [d2a, d2b, d2c, d2d] = fx.activityIds['2']
    if (isPhone(page)) {
      await page.getByRole('tablist', { name: 'Days' }).getByRole('tab', { name: /^D2\b/ }).click()
    }
    await expect(walk(d2a)).toHaveText(/^start$/i)
    await expect(walk(d2b)).toHaveText('—')
    await expect(walk(d2c)).toHaveText('—')
    await expect(walk(d2d)).toHaveText(/^~\d+ min$/)
    await expect(walk(fx.activityIds['maybe'][0])).toHaveText('—')

    // Ticket row and board head.
    await expect(page.getByText('When', { exact: true })).toBeVisible()
    await expect(page.getByText(/^\d+ stops · ~\d+(\.\d)? km$/i).first()).toBeAttached()
  })

  test('day tabs work from the keyboard (phone)', async ({ page }) => {
    test.skip(!isPhone(page), 'phone layout only')
    const fx = readFixtures()
    await page.goto(`/itinerary/${fx.lisbonId}`)
    const tabs = page.getByRole('tablist', { name: 'Days' })
    const d1 = tabs.getByRole('tab', { name: /^D1\b/ })
    const d2 = tabs.getByRole('tab', { name: /^D2\b/ })
    await expect(d1).toHaveAttribute('aria-selected', 'true')
    await d1.focus()
    await page.keyboard.press('ArrowRight')
    await expect(d2).toBeFocused()
    await expect(d1).toHaveAttribute('aria-selected', 'true') // arrows move focus only
    await page.keyboard.press('Enter')
    await expect(d2).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator(`[data-activity-id="${fx.activityIds['2'][0]}"]`)).toBeVisible()
    await expect(page.locator('li[data-chip="NEXT"]:visible')).toHaveCount(1)
    await page.keyboard.press('End')
    await expect(tabs.getByRole('tab').last()).toBeFocused()
    await page.keyboard.press(' ')
    await expect(tabs.getByRole('tab').last()).toHaveAttribute('aria-selected', 'true')
  })

  test('an empty day says NO STOPS YET', async ({ page }) => {
    // Prague (4 days, places on days 1–2 only); the Porto fixture has a place on both of its days.
    const fx = readFixtures()
    await page.goto(`/itinerary/${fx.pragueId}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Prague' })).toBeVisible()
    if (isPhone(page)) {
      await page.getByRole('tablist', { name: 'Days' }).getByRole('tab', { name: /^D3\b/ }).click()
    }
    const day3 = page.locator('[data-day="3"]')
    await expect(day3.getByText('No stops yet')).toBeVisible()
    await expect(day3.getByText('Add a place to this day, or drag one here.')).toBeVisible()
    await expect(page.getByText('Nothing in Maybe.', { exact: false })).toBeAttached()
  })

  test('laptop day header selects the day and the map follows', async ({ page }) => {
    test.skip(isPhone(page), 'laptop layout only')
    const fx = readFixtures()
    await page.goto(`/itinerary/${fx.lisbonId}`)
    const d3 = page.getByRole('button', { name: /^D3 · / })
    await expect(d3).toHaveAttribute('aria-pressed', 'false')
    await d3.click()
    await expect(d3).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: /^D1 · / })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('li[data-chip="NEXT"]')).toHaveAttribute('data-activity-id', fx.activityIds['3'][0])
    await expect(page.getByRole('region', { name: /^Map, day 3, \d+ places?$/ })).toBeVisible({ timeout: 15_000 })
  })

  test('phone map expands and returns to the list', async ({ page }) => {
    test.skip(!isPhone(page), 'phone layout only')
    const fx = readFixtures()
    await page.goto(`/itinerary/${fx.lisbonId}`)
    const firstRow = page.locator(`[data-activity-id="${fx.activityIds['1'][0]}"]`)
    await expect(firstRow).toBeVisible()

    await page.getByRole('button', { name: 'Expand map' }).click()
    await expect(firstRow).toBeHidden()
    await expect(page.getByRole('button', { name: 'Shrink map' })).toBeFocused()
    const floating = page.getByRole('tablist', { name: 'Days' })
    await expect(floating).toBeVisible()
    await floating.getByRole('tab', { name: /^D2\b/ }).click()
    await expect(page.getByRole('region', { name: /^Map, day 2, \d+ places?$/ })).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Show list' }).click()
    await expect(page.getByRole('button', { name: 'Expand map' })).toBeVisible()
    await expect(page.locator(`[data-activity-id="${fx.activityIds['2'][0]}"]`)).toBeVisible()
  })

  test('unknown trip id answers 404', async ({ page }) => {
    const response = await page.goto(`/itinerary/${randomUUID()}`)
    expect(response?.status()).toBe(404)
  })

  test('logged-out visitor is sent to /login (D-40 gap)', async ({ browser }) => {
    const fx = readFixtures()
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page).toHaveURL(/\/login/)
    await context.close()
  })
})
