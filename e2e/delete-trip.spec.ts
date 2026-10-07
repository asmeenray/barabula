import { randomUUID } from 'node:crypto'
import { test, expect, type Locator, type Page } from '@playwright/test'

// Delete trip (16-17, D-27): Trip actions → Delete trip returns to Trips, the
// pass is gone and "Deleted your {City} trip" offers Undo for 10 s; no confirm
// dialog. The DELETE goes out only when the Undo window ends. Each test makes
// its own throwaway trip through the API (owner session, local stack only) and
// removes it afterwards, so the seeded home counts stay exact.

function toast(page: Page): Locator {
  return page.getByRole('status', { name: 'Notifications' })
}

function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 1024
}

/** YYYY-MM-DD, n days from today (UTC). */
function isoDay(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

let created: string | null = null

test.afterEach(async ({ page }) => {
  if (!created) return
  // Cleanup only: already deleted answers 404.
  await page.request.delete(`/api/itineraries/${created}`)
  created = null
})

test('delete trip: Undo keeps it; after the window it is gone', async ({ page }) => {
  test.setTimeout(90_000)
  // Soonest upcoming trip, so its pass is first on the home.
  const res = await page.request.post('/api/itineraries', {
    data: {
      stops: ['Bergen'],
      when: { kind: 'dates', start: isoDay(3), end: isoDay(4) },
      client_ref: randomUUID(),
    },
  })
  expect(res.status()).toBe(201)
  const id = ((await res.json()) as { id: string }).id
  created = id
  const pass = page.locator(`a[href="/itinerary/${id}"]`)

  const deleteCalls: string[] = []
  page.on('request', (r) => {
    if (r.method() === 'DELETE') deleteCalls.push(new URL(r.url()).pathname)
  })
  let dialogs = 0
  page.on('dialog', async (d) => {
    dialogs += 1
    await d.dismiss()
  })

  await page.goto('/')
  await expect(pass).toHaveCount(1)

  // Delete → back on Trips, pass gone, toast; nothing sent yet.
  await page.goto(`/itinerary/${id}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Bergen' })).toBeVisible()
  await page.getByRole('button', { name: 'Trip actions' }).click()
  const item = page.getByRole('menuitem', { name: 'Delete trip' })
  await expect(item).toBeVisible()
  await item.click()
  await expect(page).toHaveURL(/\/$/)
  await expect(toast(page)).toContainText('Deleted your Bergen trip')
  await expect(page.getByRole('link', { name: /Madrid/ }).first()).toBeVisible()
  await expect(pass).toHaveCount(0)
  expect(deleteCalls).toEqual([])

  // Undo → the pass is back; a reload still shows it.
  await toast(page).getByRole('button', { name: 'Undo' }).click()
  await expect(pass).toHaveCount(1)
  expect(deleteCalls).toEqual([])
  await page.reload()
  await expect(pass).toHaveCount(1)
  expect(deleteCalls).toEqual([])

  // Delete again and let the 10 s window close (pointer away: hover pauses it).
  await page.goto(`/itinerary/${id}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Bergen' })).toBeVisible()
  await page.getByRole('button', { name: 'Trip actions' }).click()
  const sent = page.waitForResponse(
    (r) => r.request().method() === 'DELETE' && new URL(r.url()).pathname === `/api/itineraries/${id}`,
    { timeout: 20_000 }
  )
  await page.getByRole('menuitem', { name: 'Delete trip' }).click()
  if (!isPhone(page)) await page.mouse.move(5, 5)
  await expect(page).toHaveURL(/\/$/)
  await expect(toast(page)).toContainText('Deleted your Bergen trip')
  await expect(pass).toHaveCount(0)
  expect(deleteCalls).toEqual([])
  expect((await sent).status()).toBe(200)
  await expect(toast(page)).not.toContainText('Deleted your Bergen trip')
  await expect(pass).toHaveCount(0)
  expect(deleteCalls).toEqual([`/api/itineraries/${id}`])

  await page.reload()
  await expect(page.getByRole('link', { name: /Madrid/ }).first()).toBeVisible()
  await expect(pass).toHaveCount(0)
  expect((await page.request.get(`/api/itineraries/${id}`)).status()).toBe(404)
  expect(dialogs).toBe(0)
  created = null
})
