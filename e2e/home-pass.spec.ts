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
    await pickCity(page, 'Prague', 'Use “Prague”')
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon → Prague' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remove Prague' })).toBeVisible()

    await page.getByRole('button', { name: 'Remove Prague' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
  })
})
