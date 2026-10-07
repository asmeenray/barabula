import { test, expect, type Locator, type Page } from '@playwright/test'
import { readFixtures } from './helpers/fixtures'

// Trip details from the pass header (16-17, D-20): the WHEN / WHO cells open
// that question (phone: sheet; laptop: inline under the ticket row) with Save /
// Cancel and an Undo toast. A shorter WHEN moves the places on removed days to
// Maybe in one Undo op. Undated trips get "+ DAY". Phone and laptop share one
// seeded database per run, so every test puts the trip back.

function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 1024
}

function toast(page: Page): Locator {
  return page.getByRole('status', { name: 'Notifications' })
}

/** The open editor: a sheet (dialog) on phone, the inline panel (first group of that name) on laptop. */
function editor(page: Page, question: string): Locator {
  return isPhone(page)
    ? page.getByRole('dialog', { name: question })
    : page.getByRole('group', { name: question, exact: true }).first()
}

function waitForTripPatch(page: Page, id: string) {
  return page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && new URL(r.url()).pathname === `/api/itineraries/${id}`
  )
}

async function idsIn(page: Page, day: string): Promise<string[]> {
  return page
    .locator(`[data-day="${day}"] li[data-activity-id]`)
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-activity-id') ?? ''))
}

/** YYYY-MM-DD plus n days (UTC). */
function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function whoCell(page: Page): Locator {
  return page.locator('header dl > div').filter({ has: page.locator('dt', { hasText: 'Who' }) }).locator('dd')
}

test.describe('edit trip details from the pass header', () => {
  test('shorter WHEN moves day-3 places to Maybe; Undo brings back the day and its places', async ({ page }) => {
    test.setTimeout(60_000)
    const fx = readFixtures()
    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()

    // Place saves in flight (moves to Maybe and their Undo).
    const placeSaves = { started: 0, done: 0 }
    const isPlacePatch = (method: string, url: string) =>
      method === 'PATCH' && new URL(url).pathname.startsWith('/api/activities/')
    page.on('request', (r) => {
      if (isPlacePatch(r.method(), r.url())) placeSaves.started += 1
    })
    page.on('requestfinished', (r) => {
      if (isPlacePatch(r.method(), r.url())) placeSaves.done += 1
    })

    const day3 = await idsIn(page, '3')
    const maybe = await idsIn(page, 'maybe')
    expect(day3.length).toBeGreaterThan(0)
    const n = day3.length

    await page.getByRole('button', { name: 'Edit dates' }).click()
    const when = editor(page, 'When?')
    await expect(when).toBeVisible()
    await expect(when.getByRole('button', { name: 'Cancel editing' })).toBeVisible()
    const start = await when.getByLabel('Start date').inputValue()
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    await when.getByLabel('End date').fill(addDays(start, 1))

    const saved = waitForTripPatch(page, fx.lisbonId)
    await when.getByRole('button', { name: 'Save trip details' }).click()
    expect((await saved).status()).toBe(200)
    await expect(toast(page)).toContainText(`${n} ${n === 1 ? 'place' : 'places'} moved to Maybe`)

    // D3 is gone; its places are under Maybe, after the ones already there.
    await expect(page.locator('[data-day="3"]')).toHaveCount(0)
    if (isPhone(page)) {
      await expect(page.getByRole('tablist', { name: 'Days' }).first().getByRole('tab', { name: /^D3\b/ })).toHaveCount(0)
    }
    expect(await idsIn(page, 'maybe')).toEqual([...maybe, ...day3])

    // Undo inside the 10 s window: the dates and the places come back.
    const undone = waitForTripPatch(page, fx.lisbonId)
    await toast(page).getByRole('button', { name: 'Undo' }).click()
    expect((await undone).status()).toBe(200)
    await expect(page.locator('[data-day="3"]')).toHaveCount(1)
    await expect.poll(() => idsIn(page, '3')).toEqual(day3)
    expect(await idsIn(page, 'maybe')).toEqual(maybe)

    // Persisted: after the saves settle, a reload shows the same plan.
    await expect.poll(() => placeSaves.done >= 2 * n && placeSaves.done === placeSaves.started).toBe(true)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
    expect(await idsIn(page, '3')).toEqual(day3)
    expect(await idsIn(page, 'maybe')).toEqual(maybe)
  })

  test('Edit travellers → 3 adults persists across reload', async ({ page }) => {
    const fx = readFixtures()
    try {
      await page.goto(`/itinerary/${fx.lisbonId}`)
      await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()

      await page.getByRole('button', { name: 'Edit travellers' }).click()
      const who = editor(page, "Who's going?")
      await expect(who).toBeVisible()
      await who.getByRole('button', { name: 'More adults' }).click()
      await who.getByRole('button', { name: 'More adults' }).click()
      const saved = waitForTripPatch(page, fx.lisbonId)
      await who.getByRole('button', { name: 'Save trip details' }).click()
      expect((await saved).status()).toBe(200)
      await expect(toast(page)).toContainText('Trip details saved')
      await expect(whoCell(page)).toHaveText(/3 adults/i)

      await page.reload()
      await expect(whoCell(page)).toHaveText(/3 adults/i)
      await expect(whoCell(page)).toHaveCSS('text-transform', 'uppercase')
    } finally {
      // Put the seed back (no travellers) for the other specs in this run.
      const res = await page.request.patch(`/api/itineraries/${fx.lisbonId}`, {
        data: { extra_data: { pass: { adults: null, kids: null } } },
      })
      expect(res.status()).toBe(200)
    }
  })

  test('undated trip: "+ DAY" adds a third day', async ({ page }) => {
    const fx = readFixtures()
    try {
      await page.goto(`/itinerary/${fx.portoId}`)
      await expect(page.getByRole('heading', { level: 1, name: 'Porto' })).toBeVisible()
      await expect(page.locator('[role="tabpanel"][data-day]:not([data-day="maybe"])')).toHaveCount(2)

      const saved = waitForTripPatch(page, fx.portoId)
      await page.getByRole('button', { name: 'Add a day' }).locator('visible=true').first().click()
      expect((await saved).status()).toBe(200)
      await expect(page.locator('[role="tabpanel"][data-day]:not([data-day="maybe"])')).toHaveCount(3)
      if (isPhone(page)) {
        await expect(page.getByRole('tablist', { name: 'Days' }).first().getByRole('tab', { name: /^D\d/ })).toHaveCount(3)
      }

      await page.reload()
      await expect(page.locator('[role="tabpanel"][data-day]:not([data-day="maybe"])')).toHaveCount(3)
    } finally {
      const res = await page.request.patch(`/api/itineraries/${fx.portoId}`, { data: { extra_data: { day_count: 2 } } })
      expect(res.status()).toBe(200)
    }
  })
})
