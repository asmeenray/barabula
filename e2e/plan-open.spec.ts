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
