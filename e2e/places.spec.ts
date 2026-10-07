import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { OWNER_EMAIL, readFixtures } from './helpers/fixtures'
import { assertLocalUrl, localSupabaseEnv } from './helpers/local-env'

// Places tab (16-18, D-28): every place across the owner's trips, filters,
// search, the small place card and the clustered map. Phone and laptop
// projects, local stack only. The one write (Time Out Market marked visited)
// is undone after each test.

function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 1024
}

/** The owner's place count, read from the local stack (read only; never the live project). */
async function ownerPlaceCount(): Promise<number> {
  const env = localSupabaseEnv()
  assertLocalUrl(env.apiUrl)
  const admin = createClient(env.apiUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 })
  const owner = users?.users.find((u) => u.email === OWNER_EMAIL)
  if (!owner) throw new Error('owner not seeded')
  const { data, error } = await admin.from('itineraries').select('id, activities(id)').eq('user_id', owner.id)
  if (error || !data) throw new Error(`count places: ${error?.message}`)
  return data.reduce((n, t) => n + ((t.activities as unknown[] | null)?.length ?? 0), 0)
}

const heading = (page: Page, n: number) =>
  page.getByRole('heading', { level: 2, name: n === 1 ? '1 place' : `${n} places` })

const search = (page: Page) => page.getByRole('searchbox', { name: 'Search your places' })

function row(page: Page, name: string) {
  return page.getByRole('button', { name: new RegExp(name) }).filter({ hasText: name }).first()
}

test.describe('Places tab', () => {
  const fx = readFixtures()
  const timeOut = fx.activityIds['1'][3]

  test.afterEach(async ({ page }) => {
    // Put Time Out Market back to not visited (PATCH through the owner's session).
    const res = await page.request.patch(`/api/activities/${timeOut}`, { data: { extra_data: { visited: false } } })
    expect(res.ok()).toBe(true)
  })

  test('lists, filters and searches every place; the card marks visited and opens the trip', async ({ page }) => {
    const total = await ownerPlaceCount()
    const tiles = page.waitForRequest(/tiles\.openfreemap\.org/, { timeout: 30_000 })

    await page.goto('/places')
    await expect(heading(page, total)).toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: 'Lisbon' })).toBeAttached()
    await expect(page.getByRole('heading', { level: 3, name: 'Prague' })).toBeAttached()

    // The map: loads, asks OpenFreeMap for tiles, and is named for the list it mirrors.
    await expect(page.getByRole('region', { name: 'Map of your places' })).toBeVisible()
    await tiles
    await expect
      .poll(() => page.evaluate(() => performance.getEntriesByName('barabula:places-map-load').length), {
        timeout: 30_000,
      })
      .toBeGreaterThan(0)

    // A Porto place has no coordinates: listed with NOT ON MAP.
    await search(page).fill('Lello')
    await expect(heading(page, 1)).toBeVisible()
    await expect(row(page, 'Livraria Lello')).toContainText('Not on map')

    // Search: one match.
    await search(page).fill('Time Out')
    await expect(heading(page, 1)).toBeVisible()

    // Card: name, type and area, trip and day.
    await row(page, 'Time Out Market').click()
    const card = page.getByRole('region', { name: 'Time Out Market' })
    await expect(card).toBeVisible()
    await expect(card.getByText('Place · Cais do Sodré')).toBeVisible()
    await expect(card.getByText('Lisbon · Day 1')).toBeVisible()
    await expect(card.getByRole('link', { name: 'Open in Google Maps' })).toHaveAttribute('href', /google\.com\/maps/)

    // Mark it visited; the PATCH answers OK.
    const saved = page.waitForResponse(
      (r) => r.url().endsWith(`/api/activities/${timeOut}`) && r.request().method() === 'PATCH'
    )
    const visited = card.getByRole('switch', { name: 'Visited' })
    await expect(visited).not.toBeChecked()
    await visited.click()
    expect((await saved).ok()).toBe(true)
    await expect(visited).toBeChecked()

    // Back to the list (phone: back arrow; laptop: the row closes its inline card).
    if (isPhone(page)) await page.getByRole('button', { name: 'Back to places' }).click()
    else await row(page, 'Time Out Market').click()
    await expect(card).toHaveCount(0)

    // Visited / To visit filters follow the change.
    await page.getByRole('button', { name: 'Clear search' }).click()
    await expect(heading(page, total)).toBeVisible()
    await page.getByRole('group', { name: 'Visited' }).getByRole('button', { name: 'Visited' }).click()
    await expect(heading(page, 1)).toBeVisible()
    await page.getByRole('group', { name: 'Visited' }).getByRole('button', { name: 'To visit' }).click()
    await expect(heading(page, total - 1)).toBeVisible()
    await page.getByRole('group', { name: 'Visited' }).getByRole('button', { name: 'All', exact: true }).click()
    await expect(heading(page, total)).toBeVisible()

    // Open trip goes to the plan.
    await search(page).fill('Time Out')
    await row(page, 'Time Out Market').click()
    await page.getByRole('region', { name: 'Time Out Market' }).getByRole('link', { name: 'Open trip' }).click()
    await expect(page).toHaveURL(new RegExp(`/itinerary/${fx.lisbonId}$`))
  })

  test('no matches shows Clear filters', async ({ page }) => {
    const total = await ownerPlaceCount()
    await page.goto('/places')
    await expect(heading(page, total)).toBeVisible()
    await search(page).fill('zzzz no such place')
    await expect(page.getByText('No places match these filters.')).toBeVisible()
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(heading(page, total)).toBeVisible()
  })

  test('logged out, /places ends on /login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/places')
    await expect(page).toHaveURL(/\/login/)
    await context.close()
  })
})
