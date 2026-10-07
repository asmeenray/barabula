import { test, expect, type Browser, type Page } from '@playwright/test'
import { E2E_PASSWORD, OWNER_STATE_PATH, readFixtures } from './helpers/fixtures'

// Sign-in at Start planning (16-15, D-19, D-41): a logged-out visitor fills the
// pass, signs in, and the trip is created once from the answers kept on the
// device. Fresh logged-out contexts; the seeded e2e owner signs in through the
// real /login form. Local stack only.

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const KEY = 'barabula-pending-pass'
const HEADING = 'Check in to save your trip'

test.use({ storageState: { cookies: [], origins: [] } })

const pass = (page: Page) => page.getByRole('region', { name: 'Next trip' })

async function pickCity(page: Page, typed: string, option: string | RegExp) {
  const input = page.getByRole('combobox')
  await input.click()
  await input.fill(typed)
  await page.getByRole('option', { name: option }).click()
}

/** The owner's Lisbon trips, read through the owner's saved session. */
async function ownerLisbonTrips(browser: Browser): Promise<number> {
  const context = await browser.newContext({ storageState: OWNER_STATE_PATH })
  try {
    const res = await context.request.get('/api/itineraries')
    expect(res.ok()).toBe(true)
    const trips = (await res.json()) as { destination: string | null }[]
    return trips.filter((t) => t.destination === 'Lisbon').length
  } finally {
    await context.close()
  }
}

test('fill the pass logged out, sign in by email, and the trip opens once', async ({ page, browser }, testInfo) => {
  const before = await ownerLisbonTrips(browser)
  const phone = testInfo.project.name === 'phone'

  await page.goto('/')
  await pickCity(page, 'Lis', 'Lisbon')
  await page.getByRole('button', { name: 'Next question' }).click()
  await page.getByRole('button', { name: 'Number of days' }).click()
  await page.getByRole('textbox', { name: 'Days', exact: true }).fill('2')
  await page.getByRole('button', { name: 'Next question' }).click()
  await expect(pass(page).getByText('2 days', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Start planning' }).click()
  const heading = page.getByRole('heading', { name: HEADING })
  await expect(heading).toBeVisible()
  await expect(heading).toBeFocused()
  await expect(page.getByText('Your answers stay on the pass.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  if (phone) {
    await expect(page.getByRole('dialog', { name: HEADING })).toBeVisible()
  } else {
    // Laptop: inline in the pass, in place of the question card; no dialog.
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(pass(page).getByRole('group', { name: HEADING })).toBeVisible()
    await expect(pass(page).getByText('Lisbon', { exact: true }).first()).toBeVisible()
  }

  // The answers are on the device before the user leaves for sign-in.
  const kept = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY)
  expect(kept).toMatchObject({ v: 1, pass: { stops: ['Lisbon'], when: { kind: 'length', days: 2 } } })

  await page.getByRole('link', { name: 'Use email instead' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Email').fill(readFixtures().ownerEmail)
  await page.getByLabel('Password').fill(E2E_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()

  await expect(page).toHaveURL(new RegExp(`/itinerary/${UUID}$`), { timeout: 30_000 })
  const id = new URL(page.url()).pathname.split('/').pop()!
  try {
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
    await expect(page.getByText('2 days', { exact: true })).toBeVisible()
    expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull()
    expect(await ownerLisbonTrips(browser)).toBe(before + 1)
  } finally {
    const res = await page.request.delete(`/api/itineraries/${id}`)
    expect(res.ok()).toBe(true)
  }
})

test('Back to the pass closes sign-in and returns focus to Start planning', async ({ page }, testInfo) => {
  await page.goto('/')
  await pickCity(page, 'Lis', 'Lisbon')
  const start = page.getByRole('button', { name: 'Start planning' })
  await start.click()
  await expect(page.getByRole('heading', { name: HEADING })).toBeVisible()

  if (testInfo.project.name === 'phone') {
    await page.keyboard.press('Escape')
  } else {
    await expect(start).toHaveCount(0)
    await page.getByRole('button', { name: 'Back to the pass' }).click()
  }
  await expect(page.getByRole('heading', { name: HEADING })).toHaveCount(0)
  await expect(start).toBeFocused()
})

test('sign-in that did not finish shows the kept answers and Retry sign-in', async ({ page }) => {
  await page.goto('/')
  await page.evaluate((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        v: 1,
        savedAt: Date.now(),
        clientRef: crypto.randomUUID(),
        pass: { stops: ['Lisbon'], when: { kind: 'length', days: 2 }, adults: null, kids: null, interests: [], note: null },
      })
    )
  }, KEY)
  await page.reload()

  await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
  await expect(pass(page).getByRole('button', { name: 'Edit destination' })).toBeVisible()
  await expect(pass(page).getByText('Lisbon', { exact: true }).first()).toBeVisible()
  await expect(page.getByText("Sign-in didn't finish. Your answers are kept.")).toBeVisible()

  await page.getByRole('button', { name: 'Retry sign-in' }).click()
  await expect(page.getByRole('heading', { name: HEADING })).toBeVisible()
})
