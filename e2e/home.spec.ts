import { test, expect } from '@playwright/test'
import { readFixtures } from './helpers/fixtures'

// The Trips home with trips (16-12, D-07, D-08), signed in as the fixture
// owner, local stack only. The seed is relative to today: Madrid runs from
// yesterday to tomorrow (NOW, day 2 of 3), Lisbon / Rome / Paris are dated
// upcoming trips, Porto is undated, Prague ended 37 days ago.

const ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

test.describe('trips home', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    // A returning visitor already has the tz cookie the head script writes, so
    // the server's "today" matches the seed's local dates from the first load.
    await context.addCookies([{ name: 'tz', value: encodeURIComponent(ZONE), url: baseURL! }])
  })

  test('now, blank pass, upcoming, past and create, in order', async ({ page }, testInfo) => {
    const fx = readFixtures()
    await page.goto('/')

    const now = page.locator('[data-pass="now"]')
    const blank = page.getByRole('region', { name: 'Next trip' })
    await expect(now).toBeVisible()
    await expect(blank).toBeVisible()
    await expect(now).toHaveAttribute('href', `/itinerary/${fx.madridId}`)
    await expect(now).toContainText('Day 2 of 3')
    await expect(now).toContainText('Museo del Prado')
    await expect(now.getByText('Now', { exact: true })).toBeVisible()

    // During a trip the Now pass comes before the blank pass (no Next pass then).
    const nowBox = (await now.boundingBox())!
    const blankBox = (await blank.boundingBox())!
    if (testInfo.project.name === 'laptop') {
      // Same row: equal top offset, Now in the left column.
      expect(Math.abs(nowBox.y - blankBox.y)).toBeLessThan(1)
      expect(nowBox.x).toBeLessThan(blankBox.x)
    } else {
      expect(nowBox.y + nowBox.height).toBeLessThanOrEqual(blankBox.y)
    }
    await expect(page.locator('[data-pass="next"]')).toHaveCount(0)
    // Only the top pass may ask for a high-priority photo: Madrid's photo (a
    // curated city since 16-21) on the Now pass; the blank pass below does not ask.
    await expect(page.locator('img[fetchpriority="high"]')).toHaveCount(1)
    await expect(now.locator('img[fetchpriority="high"]')).toHaveCount(1)

    // Upcoming: 3 passes, then All upcoming (4) reveals Porto (undated, last).
    const upcoming = page.getByRole('region', { name: /^Upcoming/ })
    await expect(upcoming.getByRole('heading', { name: 'Upcoming 4' })).toBeVisible()
    await expect(upcoming.getByRole('link')).toHaveCount(3)
    const names = await upcoming.getByRole('link').evaluateAll((els) => els.map((e) => e.getAttribute('title')))
    expect(names).toEqual(['Lisbon', 'Rome', 'Paris'])
    await upcoming.getByRole('button', { name: 'All upcoming (4)' }).click()
    await expect(upcoming.getByRole('link')).toHaveCount(4)
    const porto = upcoming.getByRole('link', { name: /^Porto,/ })
    await expect(porto).toBeFocused()
    await expect(porto.locator('[data-field="when"] dd')).toHaveText(/^open$/i)
    await expect(upcoming.getByRole('button', { name: /all upcoming/i })).toHaveCount(0)

    // Past: one collapsed pile button; opening it shows a real link to Prague.
    const past = page.getByRole('region', { name: 'Past' })
    const pile = past.getByRole('button', { name: 'Past trips · 1' })
    await expect(pile).toHaveAttribute('aria-expanded', 'false')
    await expect(past.getByRole('link')).toHaveCount(0)
    await pile.click()
    await expect(pile).toHaveAttribute('aria-expanded', 'true')
    const prague = past.getByRole('link', { name: /^Prague,/ })
    await expect(prague).toBeVisible()
    await expect(prague).toHaveAttribute('href', `/itinerary/${fx.pragueId}`)

    // Create a new trip: Fill the pass focuses Where to?
    await expect(page.getByRole('heading', { name: 'Create a new trip' })).toBeVisible()
    await page.getByRole('button', { name: /Fill the pass/ }).click()
    await expect(page.getByRole('combobox')).toBeFocused()
    await expect(page.getByText('Fill the pass to plan your first trip.')).toHaveCount(0)

    // One tap on a pass opens its plan.
    await upcoming.getByRole('link', { name: /^Lisbon,/ }).click()
    await expect(page).toHaveURL(new RegExp(`/itinerary/${fx.lisbonId}$`))
  })
})

test.describe('time zone cookie', () => {
  test('the head script writes the device time zone on the first visit', async ({ page, context }) => {
    await context.clearCookies({ name: 'tz' })
    await page.goto('/')
    await expect.poll(async () => (await context.cookies()).find((c) => c.name === 'tz')?.value).toBe(
      encodeURIComponent(ZONE)
    )
  })
})
