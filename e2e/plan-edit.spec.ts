import { test, expect, type Locator, type Page } from '@playwright/test'
import { readFixtures } from './helpers/fixtures'

// First edit on the plan (16-07): open a place's ticket, mark it visited
// (persisted through PATCH /api/activities/{id}), then go offline and check
// the banner pauses edits (D-26, D-34). Moves from the row menu with one Undo
// (16-09, D-22). Phone and laptop, local stack only. Phone and laptop share one
// seeded database per run, so every test puts the rows back in seed order.

const OFFLINE_TEXT = "You're offline, changes are paused"

function rowOf(page: Page, id: string): Locator {
  return page.locator(`li[data-activity-id="${id}"]`)
}

function rowButton(row: Locator): Locator {
  return row.locator(':scope > button[aria-expanded]:not([aria-haspopup])')
}

async function waitForPatch(page: Page, id: string) {
  return page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && new URL(r.url()).pathname === `/api/activities/${id}`
  )
}

function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 1024
}

type DayKey = '1' | '2' | '3' | 'maybe'

/** Phone shows one day at a time behind the day tabs; laptop shows them all. */
async function showDay(page: Page, day: DayKey) {
  if (!isPhone(page)) return
  const tabs = page.getByRole('tablist', { name: 'Days' })
  await tabs.getByRole('tab', { name: day === 'maybe' ? /maybe/i : new RegExp(`^D${day}\\b`) }).click()
}

async function idsIn(page: Page, day: DayKey): Promise<string[]> {
  return page
    .locator(`[data-day="${day}"] li[data-activity-id]`)
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-activity-id') ?? ''))
}

function toast(page: Page): Locator {
  return page.getByRole('status', { name: 'Notifications' })
}

/** Opens the place's ticket (if closed) and its "Actions for {Place}" menu. */
async function openActions(page: Page, id: string, day: DayKey) {
  await showDay(page, day)
  const row = rowOf(page, id)
  const button = rowButton(row)
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
  await row.getByRole('region').getByRole('button', { name: /^Actions for / }).click()
  await expect(page.getByRole('menu')).toBeVisible()
}

/** Row menu → Move to day… (or Move to a day…) → the given day, then waits for the save. */
async function moveToDay(page: Page, id: string, from: DayKey, to: number) {
  await openActions(page, id, from)
  await page.getByRole('menuitem', { name: from === 'maybe' ? 'Move to a day…' : 'Move to day…' }).click()
  const saved = waitForPatch(page, id)
  await page.getByRole('menuitem', { name: `Day ${to}`, exact: true }).click()
  expect((await saved).status()).toBe(200)
}

async function menuAction(page: Page, id: string, day: DayKey, item: string) {
  await openActions(page, id, day)
  const saved = waitForPatch(page, id)
  await page.getByRole('menuitem', { name: item, exact: true }).click()
  expect((await saved).status()).toBe(200)
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

test.describe('move places from the row menu', () => {
  test('move to another day persists; Undo puts it back', async ({ page }) => {
    const fx = readFixtures()
    // The last day-1 place: appending it back to day 1 restores the seed order.
    const id = fx.activityIds['1'][3]
    const name = 'Time Out Market'

    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()

    await moveToDay(page, id, '1', 2)
    await expect(toast(page)).toContainText(`Moved ${name} to day 2`)
    expect(await idsIn(page, '2')).toEqual([...fx.activityIds['2'], id])
    expect(await idsIn(page, '1')).not.toContain(id)

    await page.reload()
    await showDay(page, '2')
    await expect(rowOf(page, id)).toBeVisible()
    expect(await idsIn(page, '2')).toEqual([...fx.activityIds['2'], id])

    // Undo inside the 10 s window: back on day 2, exactly where it was.
    await moveToDay(page, id, '2', 3)
    await expect(toast(page)).toContainText(`Moved ${name} to day 3`)
    expect(await idsIn(page, '3')).toContain(id)
    const undone = waitForPatch(page, id)
    await toast(page).getByRole('button', { name: 'Undo' }).click()
    expect((await undone).status()).toBe(200)
    await expect(page.getByTestId('live-region')).toHaveText(`Undone. ${name} is back on day 2.`)
    expect(await idsIn(page, '2')).toEqual([...fx.activityIds['2'], id])
    expect(await idsIn(page, '3')).not.toContain(id)

    await page.reload()
    expect(await idsIn(page, '2')).toEqual([...fx.activityIds['2'], id])

    // Restore the seed order.
    await moveToDay(page, id, '2', 1)
    await expect(toast(page)).toContainText(`Moved ${name} to day 1`)
    expect(await idsIn(page, '1')).toEqual(fx.activityIds['1'])
  })

  test('move down persists across reload; move up restores', async ({ page }) => {
    const fx = readFixtures()
    const [a, b, ...rest] = fx.activityIds['2']

    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()

    await menuAction(page, a, '2', 'Move down')
    expect(await idsIn(page, '2')).toEqual([b, a, ...rest])
    await page.reload()
    expect(await idsIn(page, '2')).toEqual([b, a, ...rest])

    await menuAction(page, a, '2', 'Move up')
    expect(await idsIn(page, '2')).toEqual(fx.activityIds['2'])
    await page.reload()
    expect(await idsIn(page, '2')).toEqual(fx.activityIds['2'])
  })

  test('Maybe round trip: move to Maybe, then back to day 1', async ({ page }) => {
    const fx = readFixtures()
    const id = fx.activityIds['1'][3]
    const name = 'Time Out Market'

    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
    const maybeTab = page.getByRole('tablist', { name: 'Days' }).getByRole('tab', { name: /maybe/i })
    if (isPhone(page)) await expect(maybeTab).toContainText(String(fx.activityIds['maybe'].length))

    await menuAction(page, id, '1', 'Move to Maybe')
    await expect(toast(page)).toContainText(`Moved ${name} to Maybe`)
    expect(await idsIn(page, 'maybe')).toEqual([...fx.activityIds['maybe'], id])
    if (isPhone(page)) await expect(maybeTab).toContainText(String(fx.activityIds['maybe'].length + 1))

    // Maybe rows: "—" for number and walk, MAYBE chip.
    await showDay(page, 'maybe')
    const row = rowOf(page, id)
    await expect(row).toHaveAttribute('data-chip', 'MAYBE')
    await expect(row.locator('[data-walk]')).toHaveText('—')

    await page.reload()
    expect(await idsIn(page, 'maybe')).toEqual([...fx.activityIds['maybe'], id])

    await moveToDay(page, id, 'maybe', 1)
    await expect(toast(page)).toContainText(`Moved ${name} to day 1`)
    expect(await idsIn(page, '1')).toEqual(fx.activityIds['1'])
    expect(await idsIn(page, 'maybe')).toEqual(fx.activityIds['maybe'])
  })

  test('keyboard only (laptop): Tab to Actions, Move to day…, Day 3', async ({ page }) => {
    test.skip(isPhone(page), 'laptop keyboard path; phone uses the ticket menu')
    const fx = readFixtures()
    const id = fx.activityIds['1'][3]

    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()

    await rowButton(rowOf(page, id)).focus()
    await page.keyboard.press('Tab')
    const trigger = rowOf(page, id).getByRole('button', { name: 'Actions for Time Out Market' })
    await expect(trigger).toBeFocused()
    await expect(trigger).toBeVisible()

    await page.keyboard.press('Enter')
    const moveTo = page.getByRole('menuitem', { name: 'Move to day…' })
    await expect(page.getByRole('menu')).toBeVisible()
    // Opening by keyboard may already highlight the first item.
    if (!(await moveTo.evaluate((el) => el.hasAttribute('data-highlighted')))) await page.keyboard.press('ArrowDown')
    await expect(moveTo).toHaveAttribute('data-highlighted', '')
    await page.keyboard.press('ArrowRight')
    const day3 = page.getByRole('menuitem', { name: 'Day 3', exact: true })
    await expect(day3).toBeVisible()
    // Day 1 (current) is disabled; step down to Day 3.
    for (let i = 0; i < 5 && !(await day3.evaluate((el) => el.hasAttribute('data-highlighted'))); i++) {
      await page.keyboard.press('ArrowDown')
    }
    await expect(day3).toHaveAttribute('data-highlighted', '')
    const saved = waitForPatch(page, id)
    await page.keyboard.press('Enter')
    expect((await saved).status()).toBe(200)
    expect(await idsIn(page, '3')).toContain(id)

    // Restore the seed order.
    await moveToDay(page, id, '3', 1)
    expect(await idsIn(page, '1')).toEqual(fx.activityIds['1'])
  })
})

test.describe('remove a place with a deferred Undo', () => {
  test('Undo keeps the place; a closed toast deletes it', async ({ page }) => {
    test.setTimeout(60_000)
    const fx = readFixtures()
    // Not day 3's first place (plan-open checks its NEXT chip). Phone and laptop
    // share one seeded database, so each removes a different place; the seed
    // recreates both on the next run.
    const phone = isPhone(page)
    const id = fx.activityIds['3'][phone ? 3 : 2]
    const name = phone ? 'Torre de Belém' : 'Mosteiro dos Jerónimos'
    const deleted = (r: { request(): { method(): string }; url(): string }) =>
      r.request().method() === 'DELETE' && new URL(r.url()).pathname === `/api/activities/${id}`
    const deleteCalls: string[] = []
    page.on('request', (r) => {
      if (r.method() === 'DELETE') deleteCalls.push(new URL(r.url()).pathname)
    })

    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()

    // Remove → gone at once, toast → Undo → back, nothing deleted.
    await openActions(page, id, '3')
    await page.getByRole('menuitem', { name: 'Remove from trip' }).click()
    await expect(rowOf(page, id)).toHaveCount(0)
    await expect(toast(page)).toContainText(`Removed ${name}`)
    await toast(page).getByRole('button', { name: 'Undo' }).click()
    await expect(rowOf(page, id)).toHaveCount(1)
    await expect(page.getByTestId('live-region')).toHaveText(`Undone. ${name} is back on day 3.`)
    expect(deleteCalls).toEqual([])

    await page.reload()
    await showDay(page, '3')
    await expect(rowOf(page, id)).toBeVisible()
    expect(deleteCalls).toEqual([])

    // Remove again and let the 10 s window close (pointer away: hover pauses it).
    await openActions(page, id, '3')
    const sent = page.waitForResponse(deleted, { timeout: 15_000 })
    await page.getByRole('menuitem', { name: 'Remove from trip' }).click()
    if (!phone) await page.mouse.move(5, 5)
    await expect(toast(page)).toContainText(`Removed ${name}`)
    expect(deleteCalls).toEqual([])
    expect((await sent).status()).toBe(200)
    await expect(toast(page)).not.toContainText(`Removed ${name}`)
    expect(deleteCalls).toEqual([`/api/activities/${id}`])

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
    await expect(rowOf(page, id)).toHaveCount(0)
  })
})
