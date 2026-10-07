import { test, expect, type Page } from '@playwright/test'

// The home blank pass (16-10): one question at a time, stamp lines, Start
// planning creates the trip. Phone (Pixel 7) and laptop projects, signed in as
// the fixture owner, local stack only. Dates typed here are test inputs only.

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

async function pickCity(page: Page, typed: string, option: string | RegExp) {
  const input = page.getByRole('combobox')
  await input.click()
  await input.fill(typed)
  await page.getByRole('option', { name: option }).click()
}

const pass = (page: Page) => page.getByRole('region', { name: 'Next trip' })

test.describe('home blank pass', () => {
  // Trips made here are deleted after each test, so the home sections
  // (home.spec.ts) only ever see the seeded trips.
  const created: string[] = []
  test.afterEach(async ({ page }) => {
    for (const id of created.splice(0)) {
      const res = await page.request.delete(`/api/itineraries/${id}`)
      expect(res.ok()).toBe(true)
    }
  })

  test('answer the questions and start planning a trip', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: /where to next\?/i })).toBeVisible()
    await expect(page.getByText('Pick a city to start')).toBeVisible()
    await expect(page.getByText('Question 1 of 4')).toBeVisible()
    // Start planning only exists once a city is set (D-10); no From, no flights (D-14).
    await expect(page.getByRole('button', { name: 'Start planning' })).toHaveCount(0)
    await expect(pass(page).getByText(/^from$/i)).toHaveCount(0)
    await expect(page.getByRole('link', { name: /flights/i })).toHaveCount(0)

    await pickCity(page, 'Lis', 'Lisbon')
    await expect(page.getByRole('button', { name: 'Edit destination' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start planning' })).toBeVisible()

    await page.getByRole('button', { name: 'Next question' }).click()
    await expect(page.getByText('Question 2 of 4')).toBeVisible()
    await expect(page.getByRole('group', { name: 'When?' })).toBeVisible()
    for (const option of ['Pick dates', 'Number of days', 'Not sure yet']) {
      await expect(page.getByRole('button', { name: option })).toBeVisible()
    }
    await page.getByRole('button', { name: 'Number of days' }).click()
    await page.getByRole('textbox', { name: 'Days', exact: true }).fill('3')
    await page.getByRole('button', { name: 'Next question' }).click()
    await expect(page.getByRole('button', { name: 'Edit dates' })).toBeVisible()

    await expect(page.getByText('Question 3 of 4')).toBeVisible()
    await page.getByRole('button', { name: 'Skip this question' }).click()
    await expect(page.getByRole('button', { name: 'Edit travellers' })).toHaveCount(0)

    await expect(page.getByText('Question 4 of 4')).toBeVisible()
    await page.getByRole('button', { name: 'Food' }).click()
    await page.getByRole('button', { name: 'Views' }).click()
    await page.getByRole('button', { name: 'Finish questions' }).click()

    await expect(page.getByRole('heading', { name: 'Your pass is ready.' })).toBeVisible()
    await expect(page.getByText('Tap any line to change it.')).toBeVisible()
    await expect(pass(page).getByText('3 days', { exact: true })).toBeVisible()
    await expect(pass(page).getByText('Food · Views', { exact: true })).toBeVisible()

    // Edit reopens that question with focus inside it.
    await page.getByRole('button', { name: 'Edit dates' }).click()
    await expect(page.getByText('Question 2 of 4')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Number of days' })).toBeFocused()
    await page.getByRole('button', { name: 'Next question' }).click()
    await expect(page.getByRole('heading', { name: 'Your pass is ready.' })).toBeVisible()

    await page.getByRole('button', { name: 'Start planning' }).click()
    await expect(page).toHaveURL(new RegExp(`/itinerary/${UUID}$`))
    created.push(new URL(page.url()).pathname.split('/').pop()!)
    await expect(page.getByRole('heading', { name: 'Now boarding: Lisbon' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
    // The new plan is empty, so it shows no day tabs yet; the stored length
    // shows in the plan header's WHEN cell.
    await expect(page.getByText('3 days', { exact: true })).toBeVisible()
  })

  test('a date range over 30 days is refused', async ({ page }) => {
    await page.goto('/')
    await pickCity(page, 'Lisbon', 'Lisbon')
    await page.getByRole('button', { name: 'Next question' }).click()
    await page.getByRole('button', { name: 'Pick dates' }).click()
    await page.getByLabel('Start date').fill('2026-05-01')
    await page.getByLabel('End date').fill('2026-05-31')
    await expect(page.getByText('Trips can be up to 30 days.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next question' })).toBeDisabled()

    await page.getByLabel('End date').fill('2026-05-30')
    await expect(page.getByText('Trips can be up to 30 days.')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Next question' })).toBeEnabled()
  })

  test('a second stop shows both stops joined with an arrow', async ({ page }) => {
    await page.goto('/')
    await pickCity(page, 'Lisbon', 'Lisbon')
    await page.getByRole('button', { name: 'Add a stop' }).click()
    await expect(page.getByRole('combobox')).toBeFocused()
    // Prague is a curated city since 16-21, so both stops print as codes.
    await pickCity(page, 'Prague', 'Prague')
    await expect(page.getByRole('heading', { level: 1, name: 'LIS → PRG' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remove Prague' })).toBeVisible()

    await page.getByRole('button', { name: 'Remove Prague' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
  })
})

test.describe('home first visit', () => {
  test.describe('logged out', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('shows the pass, one line and What Barabula does, with Sign in and no tabs', async ({ page }) => {
      const cover = page.waitForResponse((r) => new URL(r.url()).pathname.startsWith('/images/cities/'))
      const response = await page.goto('/')
      expect(response?.status()).toBe(200)
      // The cover photo is served as a file, not redirected to /login (proxy, D-38).
      const coverResponse = await cover
      expect(coverResponse.status()).toBe(200)
      expect(coverResponse.request().redirectedFrom()).toBeNull()

      await expect(page.getByRole('heading', { level: 1, name: /where to next\?/i })).toBeVisible()
      await expect(page.getByText('Fill the pass to plan your first trip.')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)

      const what = page.getByRole('region', { name: 'What Barabula does' })
      await expect(what).toBeVisible()
      await expect(what.locator('li')).toHaveCount(3)
      await expect(what.locator('[data-step="SAVE"]')).toContainText(/soon/i)
      await expect(what.locator('[data-step="PLAN"]')).not.toContainText(/soon/i)
      await expect(page.getByText(/ask barabula/i)).toHaveCount(0)
      for (const heading of ['Upcoming', 'Past', 'Create a new trip']) {
        await expect(page.getByRole('heading', { name: heading })).toHaveCount(0)
      }

      // Logged out, Start planning asks the visitor to sign in and keeps the
      // answers (16-15, D-19; the full round trip is in signin-resume.spec.ts).
      await pickCity(page, 'Lisbon', 'Lisbon')
      await page.getByRole('button', { name: 'Start planning' }).click()
      await expect(page.getByRole('heading', { name: 'Check in to save your trip' })).toBeVisible()
      await expect(page).toHaveURL(/\/$/)
    })

    // "On the cover" (quick 261007-wms): laptop only; typing hides it; the
    // shortcut fills Where to? with the cover city.
    test('the On the cover note and its Plan a trip shortcut', async ({ page }) => {
      await page.goto('/')
      const shortcut = pass(page).getByRole('button', { name: /^Plan a trip to / })
      const note = page.locator('[data-cover-note]')
      if ((page.viewportSize()?.width ?? 0) < 1024) {
        await expect(page.getByRole('combobox')).toBeVisible()
        await expect(shortcut).toBeHidden()
        return
      }
      await expect(shortcut).toBeVisible()
      await page.getByRole('combobox').focus()
      await page.keyboard.press('l')
      await expect(note).toHaveCount(0)

      await page.reload()
      await expect(shortcut).toBeVisible()
      const city = ((await shortcut.textContent()) ?? '').replace(/^Plan a trip to /, '').trim()
      expect(city).not.toBe('')
      await shortcut.click()
      await expect(page.getByRole('heading', { level: 1, name: city })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Edit destination' })).toBeVisible()
      await expect(note).toHaveCount(0)
    })
  })

  test('the signed-in owner, who has trips, does not see the first-visit line', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: /where to next\?/i })).toBeVisible()
    await expect(page.getByRole('region', { name: 'What Barabula does' })).toBeVisible()
    await expect(page.getByText('Fill the pass to plan your first trip.')).toHaveCount(0)
  })
})
