import { test, expect, type Locator, type Page } from '@playwright/test'
import { readFixtures } from './helpers/fixtures'

// First edit on the plan (16-07): open a place's ticket, mark it visited
// (persisted through PATCH /api/activities/{id}), then go offline and check
// the banner pauses edits (D-26, D-34). Phone and laptop, local stack only.

const OFFLINE_TEXT = "You're offline, changes are paused"

function rowOf(page: Page, id: string): Locator {
  return page.locator(`li[data-activity-id="${id}"]`)
}

function rowButton(row: Locator): Locator {
  return row.locator(':scope > button[aria-expanded]')
}

async function waitForPatch(page: Page, id: string) {
  return page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && new URL(r.url()).pathname === `/api/activities/${id}`
  )
}

test.describe('edit a place on the plan', () => {
  test('ticket, visited persists across reload, offline pauses edits', async ({ page, context }) => {
    const fx = readFixtures()
    const id = fx.activityIds['1'][0]

    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()

    const row = rowOf(page, id)
    await expect(row).not.toHaveAttribute('data-chip', 'VISITED')

    // Open the ticket.
    await rowButton(row).click()
    await expect(rowButton(row)).toHaveAttribute('aria-expanded', 'true')
    const ticket = row.getByRole('region')
    await expect(ticket.getByRole('link', { name: 'Open in Google Maps' })).toHaveAttribute(
      'href',
      /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/
    )
    await expect(ticket).toContainText(/Day 1 · Stop 1/i)

    // Mark visited → optimistic flip, saved by the server.
    const saved = waitForPatch(page, id)
    await ticket.getByRole('button', { name: 'Mark visited' }).click()
    await expect(row).toHaveAttribute('data-chip', 'VISITED')
    expect((await saved).status()).toBe(200)
    await expect(row.getByText('Not saved yet')).toHaveCount(0)

    // Reload → still visited (persisted in extra_data.visited).
    await page.reload()
    await expect(rowOf(page, id)).toHaveAttribute('data-chip', 'VISITED')

    // Restore.
    await rowButton(rowOf(page, id)).click()
    const restored = waitForPatch(page, id)
    await rowOf(page, id).getByRole('button', { name: 'Mark not visited' }).click()
    expect((await restored).status()).toBe(200)
    await expect(rowOf(page, id)).not.toHaveAttribute('data-chip', 'VISITED')

    // Offline: banner shows and the edit control is disabled; the page stays readable.
    await context.setOffline(true)
    await expect(page.getByText(OFFLINE_TEXT)).toBeVisible()
    const mark = rowOf(page, id).getByRole('button', { name: 'Mark visited' })
    await expect(mark).toHaveAttribute('aria-disabled', 'true')
    await expect(rowOf(page, id)).toBeVisible()

    await context.setOffline(false)
    await expect(page.getByText(OFFLINE_TEXT)).toHaveCount(0)
    await expect(mark).not.toHaveAttribute('aria-disabled', 'true')
  })
})
