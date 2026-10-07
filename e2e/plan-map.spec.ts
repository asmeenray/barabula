import { test, expect, type Page } from '@playwright/test'
import { readFixtures } from './helpers/fixtures'

// Trip-plan map (16-16): numbered tag pins for the selected day, the day's
// route, and the row → pin link. Phone and laptop projects, local stack only.
// Lisbon fixture: day 1 has 4 located places; day 2 has 4 places of which two
// have no coordinates (and the e2e geocoder is switched off), so 2 pins.
// Pixel-clicking a pin is not reliable headless, so selection is asserted
// through the row path (opening a ticket selects its pin).

function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 1024
}

const map = (page: Page) => page.locator('#trip-map')

async function selectDay(page: Page, n: number) {
  if (isPhone(page)) {
    await page.getByRole('tablist', { name: 'Days' }).getByRole('tab', { name: new RegExp(`^D${n}\\b`) }).click()
  } else {
    await page.locator(`[data-day="${n}"] > button[aria-pressed]`).click()
  }
}

test.describe('trip plan map', () => {
  test('pins follow the selected day and the open ticket selects its pin', async ({ page }) => {
    const fx = readFixtures()
    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()

    // Day 1: all four places are located.
    await expect(page.getByRole('region', { name: 'Map, day 1, 4 places' })).toBeVisible()
    await expect.poll(() => map(page).getAttribute('data-pins-rendered'), { timeout: 30_000 }).toBe('4')

    // Day 2: two places have no coordinates; they are skipped.
    await selectDay(page, 2)
    await expect(page.getByRole('region', { name: 'Map, day 2, 2 places' })).toBeVisible()
    await expect.poll(() => map(page).getAttribute('data-pins-rendered'), { timeout: 15_000 }).toBe('2')

    // Opening a row's ticket selects that place's pin; closing it clears it.
    const id = fx.activityIds['2'][0]
    const row = page.locator(`li[data-activity-id="${id}"] > button[aria-expanded]`).first()
    await expect(map(page)).not.toHaveAttribute('data-selected-pin', /.+/)
    await row.click()
    await expect(row).toHaveAttribute('aria-expanded', 'true')
    await expect(map(page)).toHaveAttribute('data-selected-pin', id)
    // The pin moves to the top layer; it is still counted once.
    await expect.poll(() => map(page).getAttribute('data-pins-rendered'), { timeout: 15_000 }).toBe('2')
    await row.click()
    await expect(map(page)).not.toHaveAttribute('data-selected-pin', /.+/)

    // A place without coordinates has no pin to select.
    const unlocated = fx.activityIds['2'][1]
    await page.locator(`li[data-activity-id="${unlocated}"] > button[aria-expanded]`).first().click()
    await expect(map(page)).not.toHaveAttribute('data-selected-pin', /.+/)

    // Markers are never in the tab order: the map draws pins on its canvas only.
    await expect(map(page).locator('.maplibregl-marker')).toHaveCount(0)
  })
})
