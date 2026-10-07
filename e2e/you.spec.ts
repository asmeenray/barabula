import { test, expect, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { E2E_PASSWORD, OTHER_EMAIL, OWNER_EMAIL, readFixtures } from './helpers/fixtures'
import { assertLocalUrl, localSupabaseEnv } from './helpers/local-env'

// You tab (16-19, D-29): passenger card, Appearance with live theme switching
// (D-03, including research assumption A1: trip pins survive a map style
// swap), Home city in user_metadata (D-43) and Sign out (D-41). Phone and
// laptop projects, local stack only. The owner's home city is reset through
// the local admin API before and after each test.

function admin(): SupabaseClient {
  const env = localSupabaseEnv()
  assertLocalUrl(env.apiUrl)
  return createClient(env.apiUrl, env.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function ownerId(db: SupabaseClient): Promise<string> {
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 100 })
  const owner = data?.users.find((u) => u.email === OWNER_EMAIL)
  if (!owner) throw new Error('owner not seeded')
  return owner.id
}

async function resetHomeCity() {
  const db = admin()
  const { error } = await db.auth.admin.updateUserById(await ownerId(db), { user_metadata: { home_city: null } })
  if (error) throw new Error(`reset home city: ${error.message}`)
}

/** The owner's trip count, read from the local stack. */
async function ownerTripCount(): Promise<number> {
  const db = admin()
  const { count, error } = await db
    .from('itineraries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', await ownerId(db))
  if (error || count === null) throw new Error(`count trips: ${error?.message}`)
  return count
}

const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme)

test.describe('You tab', () => {
  test.beforeEach(resetHomeCity)
  test.afterAll(resetHomeCity)

  test('passenger card: PASSENGER, trip count, HOME — and initials', async ({ page }) => {
    const trips = await ownerTripCount()
    await page.goto('/you')
    const card = page.getByRole('region', { name: 'Passenger' })
    await expect(card.getByText('Passenger', { exact: true })).toBeVisible()
    await expect(card.getByRole('heading', { level: 1, name: 'e2e-owner' })).toBeVisible()
    await expect(page.getByTestId('passenger-trips')).toHaveText(String(trips))
    await expect(page.getByTestId('passenger-home')).toHaveText('—')
    // The local test user has no avatar: initials on surface-2.
    await expect(card.getByText('EO', { exact: true })).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Credits & attributions' })).toBeVisible()
    await expect(page.getByText(/^Barabula \d+\.\d+\.\d+$/)).toBeVisible()
    await expect(page.getByText(/export|delete account/i)).toHaveCount(0)
  })

  test('Appearance Dark applies at once and survives a reload', async ({ page }) => {
    await page.goto('/you')
    await page.getByRole('group', { name: 'Appearance' }).getByRole('button', { name: 'Dark' }).click()
    expect(await theme(page)).toBe('dark')
    await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute('content', '#080D10')
    await page.reload()
    expect(await theme(page)).toBe('dark')
    await expect(page.getByRole('group', { name: 'Appearance' }).getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await page.getByRole('group', { name: 'Appearance' }).getByRole('button', { name: 'System' }).click()
    expect(await page.evaluate(() => localStorage.getItem('barabula-theme'))).toBeNull()
  })

  test('Home city saves to the account and shows after a reload', async ({ page }) => {
    await page.goto('/you')
    const field = page.getByPlaceholder('Add your home city')
    await field.fill('Lisbon')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByTestId('passenger-home')).toHaveText('Lisbon')
    await page.reload()
    await expect(page.getByTestId('passenger-home')).toHaveText('Lisbon')
    await expect(page.getByPlaceholder('Add your home city')).toHaveValue('Lisbon')
  })

  test('the trip map swaps its style with the theme and keeps its pins (A1)', async ({ page }) => {
    const { lisbonId } = readFixtures()
    await page.goto(`/itinerary/${lisbonId}`)
    const map = page.locator('#trip-map')
    await expect
      .poll(() => page.evaluate(() => performance.getEntriesByName('barabula:map-load').length), { timeout: 30_000 })
      .toBeGreaterThan(0)
    await expect.poll(async () => Number(await map.getAttribute('data-pins-rendered')), { timeout: 30_000 }).toBeGreaterThan(0)

    const next = (await theme(page)) === 'dark' ? 'light' : 'dark'
    const styleUrl = next === 'dark' ? /tiles\.openfreemap\.org\/styles\/dark/ : /tiles\.openfreemap\.org\/styles\/positron/
    const styleRequest = page.waitForRequest(styleUrl, { timeout: 30_000 })
    // Forget the old count so only a recount after the swap passes.
    await map.evaluate((el) => el.removeAttribute('data-pins-rendered'))
    await page.evaluate((t) => {
      document.documentElement.dataset.theme = t
    }, next)
    await styleRequest
    await expect.poll(async () => Number(await map.getAttribute('data-pins-rendered')), { timeout: 30_000 }).toBeGreaterThan(0)
  })

  test('Sign out clears the kept pass answers and ends logged out on /', async ({ browser }) => {
    // A fresh session for the second fixture user: signing out revokes that
    // user's sessions, so the owner's saved session stays good for later specs.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/login')
    await page.getByLabel('Email').fill(OTHER_EMAIL)
    await page.getByLabel('Password').fill(E2E_PASSWORD)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })

    await page.goto('/you')
    await page.evaluate(() => localStorage.setItem('barabula-pending-pass', '{"v":1}'))
    await page.getByRole('button', { name: 'Sign out' }).click()
    await page.waitForURL((url) => url.pathname === '/', { timeout: 30_000 })
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('barabula-pending-pass'))).toBeNull()

    await page.goto('/you')
    await expect(page).toHaveURL(/\/login/)
    await context.close()
  })

  test('logged out, /you ends on /login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/you')
    await expect(page).toHaveURL(/\/login/)
    await context.close()
  })
})

