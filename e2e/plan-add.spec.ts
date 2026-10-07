import { test, expect, type Locator, type Page } from '@playwright/test'
import { readFixtures } from './helpers/fixtures'

// Add and edit places by hand (16-11, D-18, D-23, D-24). Phone (sheet) and
// laptop (inline form), local stack only. The e2e server runs with
// NOMINATIM_DISABLED=1, so no lookup reaches the public Nominatim service.
// Phone and laptop share one seeded database, so every place added here is
// deleted again before the test ends.

const DAY2_LAST = 'Miradouro de São Pedro de Alcântara'

function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 1024
}

function rowOf(page: Page, id: string): Locator {
  return page.locator(`li[data-activity-id="${id}"]`)
}

function rowButton(row: Locator): Locator {
  return row.locator(':scope > button[aria-expanded]:not([aria-haspopup])')
}

function toast(page: Page): Locator {
  return page.getByRole('status', { name: 'Notifications' })
}

async function idsIn(page: Page, day: string): Promise<string[]> {
  return page
    .locator(`[data-day="${day}"] li[data-activity-id]`)
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-activity-id') ?? ''))
}

/** The place form: a sheet (dialog) on phone, an inline group on laptop. */
function placeForm(page: Page, title: string): Locator {
  return isPhone(page) ? page.getByRole('dialog', { name: title }) : page.getByRole('group', { name: title })
}

async function openAddForm(page: Page): Promise<Locator> {
  await page.locator('button:visible', { hasText: /^Add place$/ }).click()
  const form = placeForm(page, 'Add a place')
  await expect(form).toBeVisible()
  if (!isPhone(page)) {
    // Laptop: inline, never a centred modal.
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  return form
}

async function pickDay(page: Page, form: Locator, day: string) {
  await form.getByRole('combobox', { name: 'Day' }).click()
  await page.getByRole('option', { name: day, exact: true }).click()
  await expect(form.getByRole('combobox', { name: 'Day' })).toContainText(day)
}

/** Fills and submits the add form; returns the created id. */
async function addPlace(page: Page, name: string, day: string): Promise<string> {
  const form = await openAddForm(page)
  await form.getByLabel('Place name').fill(name)
  await pickDay(page, form, day)
  const created = page.waitForResponse(
    (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/activities'
  )
  await form.getByRole('button', { name: 'Add place' }).click()
  const res = await created
  expect(res.status()).toBe(201)
  const row = (await res.json()) as { id: string }
  await expect(form).toBeHidden()
  return row.id
}

async function cleanup(page: Page, ids: string[]) {
  for (const id of ids) await page.request.delete(`/api/activities/${id}`)
}

test.describe('add a place by hand', () => {
  test('add to day 2 with Undo, Find on map, Edit place', async ({ page }) => {
    const fx = readFixtures()
    const created: string[] = []
    try {
      await page.goto(`/itinerary/${fx.lisbonId}`)
      await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()

      // Validation first: no name, no POST.
      const empty = await openAddForm(page)
      await empty.getByRole('button', { name: 'Add place' }).click()
      await expect(empty.getByText('Add a place name.')).toBeVisible()
      await empty.getByRole('button', { name: "Don't add" }).click()
      await expect(empty).toBeHidden()

      // Add → the end of day 2, NOT ON MAP (no address), toast names the stop before it.
      const first = await addPlace(page, 'Test Café', 'Day 2')
      created.push(first)
      const row = rowOf(page, first)
      await expect(row).toBeVisible()
      expect((await idsIn(page, '2')).at(-1)).toBe(first)
      await expect(row.locator('[data-geo="not-on-map"]')).toBeVisible()
      await expect(row.locator('[data-walk]')).toHaveText('—')
      await expect(toast(page)).toContainText(`Added to day 2, after ${DAY2_LAST}`)

      // Undo deletes it.
      const deleted = page.waitForResponse(
        (r) => r.request().method() === 'DELETE' && new URL(r.url()).pathname === `/api/activities/${first}`
      )
      await toast(page).getByRole('button', { name: 'Undo' }).click()
      expect((await deleted).ok()).toBe(true)
      await expect(rowOf(page, first)).toHaveCount(0)
      created.pop()

      // Add again, then Find on map in its ticket.
      const second = await addPlace(page, 'Test Café', 'Day 2')
      created.push(second)
      const again = rowOf(page, second)
      await rowButton(again).click()
      const ticket = again.getByRole('region')
      await ticket.getByRole('button', { name: 'Find on map' }).click()
      await expect(ticket.getByText('Still not on map. Add an address with Edit place.')).toBeVisible()

      // Edit place → new name → Save place → still there after reload.
      await ticket.getByRole('button', { name: 'Actions for Test Café' }).click()
      await page.getByRole('menuitem', { name: 'Edit place' }).click()
      const editForm = placeForm(page, 'Edit place')
      await expect(editForm).toBeVisible()
      await expect(editForm.getByRole('button', { name: 'Discard changes' })).toBeVisible()
      await editForm.getByLabel('Place name').fill('Test Café Renamed')
      const saved = page.waitForResponse(
        (r) => r.request().method() === 'PATCH' && new URL(r.url()).pathname === `/api/activities/${second}`
      )
      await editForm.getByRole('button', { name: 'Save place' }).click()
      expect((await saved).status()).toBe(200)

      await page.reload()
      if (isPhone(page)) {
        await page.getByRole('tablist', { name: 'Days' }).getByRole('tab', { name: /^D2\b/ }).click()
      }
      await expect(rowOf(page, second)).toContainText('Test Café Renamed')
    } finally {
      await cleanup(page, created)
    }
  })

  test('add to Maybe', async ({ page }) => {
    const fx = readFixtures()
    const created: string[] = []
    try {
      await page.goto(`/itinerary/${fx.lisbonId}`)
      await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
      const id = await addPlace(page, 'Test Maybe place', 'Maybe')
      created.push(id)
      await expect(toast(page)).toContainText('Added to Maybe')
      await expect(rowOf(page, id)).toBeVisible()
      expect((await idsIn(page, 'maybe')).at(-1)).toBe(id)
    } finally {
      await cleanup(page, created)
    }
  })
})
