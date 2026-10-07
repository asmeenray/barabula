import { test, expect, type Locator, type Page } from '@playwright/test'
import { readFixtures } from './helpers/fixtures'

// Drag and drop on the plan (16-14, D-22): the grip on laptop, a long-press on
// phone, and the keyboard (Space, arrows, Space / Escape). A drop is one PATCH
// of { day_number, position }, announced once in place words by dnd-kit's live
// region; its Undo toast stays silent. Local stack only. Phone and laptop share
// one seeded database, so every test puts the rows back in seed order.

const DND_READY = 'barabula:dnd-ready'

function rowOf(page: Page, id: string): Locator {
  return page.locator(`li[data-activity-id="${id}"]`)
}

function rowButton(row: Locator): Locator {
  return row.locator(':scope > button[aria-expanded]:not([aria-haspopup])')
}

function grip(row: Locator): Locator {
  return row.getByRole('button', { name: /^Drag .+ to reorder$/ })
}

function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 1024
}

/** dnd-kit's own polite live region (Accessibility plugin, id "plan"). */
function dndAnnouncement(page: Page): Locator {
  return page.locator('#dnd-kit-announcement-plan')
}

function toastViewport(page: Page): Locator {
  return page.getByLabel('Notifications')
}

/** Board order; dnd-kit's placeholder (a hidden clone of the lifted row) is not a row. */
async function idsIn(page: Page, day: string): Promise<string[]> {
  return page
    .locator(`[data-day="${day}"] li[data-activity-id]:not([data-dnd-placeholder])`)
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-activity-id') ?? ''))
}

function waitForPatch(page: Page, id: string) {
  return page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && new URL(r.url()).pathname === `/api/activities/${id}`
  )
}

/** Opens the plan and waits until the idle-loaded drag layer is bound. */
async function openPlan(page: Page, tripId: string) {
  await page.goto(`/itinerary/${tripId}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
  await expect
    .poll(() => page.evaluate((m) => performance.getEntriesByName(m).length, DND_READY), { timeout: 30_000 })
    .toBe(1)
}

/** Row menu → Move to day… → Day {to} (appends), then waits for the save. Used to restore seed order. */
async function menuMoveToDay(page: Page, id: string, from: string, to: number) {
  if (isPhone(page)) {
    await page.getByRole('tablist', { name: 'Days' }).getByRole('tab', { name: new RegExp(`^D${from}\\b`) }).click()
  }
  const row = rowOf(page, id)
  const button = rowButton(row)
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
  await row.getByRole('region').getByRole('button', { name: /^Actions for / }).click()
  await page.getByRole('menuitem', { name: 'Move to day…' }).click()
  const saved = waitForPatch(page, id)
  await page.getByRole('menuitem', { name: `Day ${to}`, exact: true }).click()
  expect((await saved).status()).toBe(200)
}

async function centre(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('element has no box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test.describe('drag places on the plan', () => {
  test('laptop: drag the grip onto the D2 header; it moves, persists and is announced once', async ({ page }) => {
    test.skip(isPhone(page), 'laptop handle; phone uses a long-press')
    const fx = readFixtures()
    // The last day-1 place: moving it back to day 1 (appended) restores the seed order.
    const id = fx.activityIds['1'][3]
    const name = 'Time Out Market'

    await openPlan(page, fx.lisbonId)
    const day2Before = await idsIn(page, '2')
    const header = page.locator('[data-day="2"] > button[aria-pressed]')
    await header.scrollIntoViewIfNeeded()

    const row = rowOf(page, id)
    await row.hover()
    const handle = grip(row)
    await expect(handle).toHaveAccessibleName(`Drag ${name} to reorder`)
    await expect(handle).toBeVisible()

    const from = await centre(handle)
    const to = await centre(header)
    const saved = waitForPatch(page, id)
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(from.x, from.y + 8, { steps: 4 })
    // While dragging, the day headers are drop targets.
    await expect(page.locator('[data-day="3"] > button[aria-pressed]')).toHaveAttribute('data-drop', 'ready')
    await page.mouse.move(to.x, to.y, { steps: 20 })
    await expect(header).toHaveAttribute('data-drop', 'over')
    await page.mouse.up()

    expect((await saved).status()).toBe(200)
    expect(await idsIn(page, '2')).toEqual([...day2Before, id])
    expect(await idsIn(page, '1')).not.toContain(id)
    await expect(dndAnnouncement(page)).toHaveText(`${name} moved to day 2, position ${day2Before.length + 1}.`)
    // One announcement: the Undo toast is shown but its live region is off.
    await expect(toastViewport(page)).toContainText(`Moved ${name} to day 2`)
    await expect(toastViewport(page)).toHaveAttribute('aria-live', 'off')
    await expect(header).not.toHaveAttribute('data-drop')

    await page.reload()
    await expect(rowOf(page, id)).toBeVisible()
    expect(await idsIn(page, '2')).toEqual([...day2Before, id])

    // Restore the seed order.
    await menuMoveToDay(page, id, '2', 1)
    expect(await idsIn(page, '1')).toEqual(fx.activityIds['1'])
  })

  test('phone: long-press a row and drop it on the D3 tab; it is appended to day 3', async ({ page }) => {
    test.skip(!isPhone(page), 'phone long-press; laptop uses the handle')
    const fx = readFixtures()
    const id = fx.activityIds['1'][3]
    const name = 'Time Out Market'

    await openPlan(page, fx.lisbonId)
    const day3Before = await idsIn(page, '3')
    const tabs = page.getByRole('tablist', { name: 'Days' })
    const tab3 = tabs.getByRole('tab', { name: /^D3\b/ })
    const button = rowButton(rowOf(page, id))
    await button.scrollIntoViewIfNeeded()

    const from = await centre(button)
    const to = await centre(tab3)
    const cdp = await page.context().newCDPSession(page)
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: { x: number; y: number }) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: p ? [{ x: Math.round(p.x), y: Math.round(p.y), id: 1 }] : [],
      })

    const saved = waitForPatch(page, id)
    await touch('touchStart', from)
    // Long-press: 250 ms with less than 5 px of movement picks the row up.
    await page.waitForTimeout(400)
    const steps = 12
    for (let i = 1; i <= steps; i++) {
      await touch('touchMove', { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps })
      await page.waitForTimeout(30)
    }
    await expect(tab3).toHaveAttribute('data-drop', 'over')
    await touch('touchEnd')

    expect((await saved).status()).toBe(200)
    await expect(dndAnnouncement(page)).toHaveText(`${name} moved to day 3, position ${day3Before.length + 1}.`)
    await expect(toastViewport(page)).toHaveAttribute('aria-live', 'off')
    // Still on day 1 (no jump); the place is listed under D3.
    expect(await idsIn(page, '1')).not.toContain(id)
    await tab3.click()
    await expect(rowOf(page, id)).toBeVisible()
    expect(await idsIn(page, '3')).toEqual([...day3Before, id])

    await page.reload()
    expect(await idsIn(page, '3')).toEqual([...day3Before, id])

    // Restore the seed order.
    await menuMoveToDay(page, id, '3', 1)
    expect(await idsIn(page, '1')).toEqual(fx.activityIds['1'])
  })

  test('keyboard (laptop): Space, ArrowDown twice, Space reorders; Escape puts it back', async ({ page }) => {
    test.skip(isPhone(page), 'the grip handle is laptop only; phone keyboard users have the menu')
    const fx = readFixtures()
    const [a, b, c, d] = fx.activityIds['1']

    await openPlan(page, fx.lisbonId)
    const handle = grip(rowOf(page, a))
    const label = (await handle.getAttribute('aria-label')) ?? ''
    const name = label.replace(/^Drag /, '').replace(/ to reorder$/, '')

    // Pick up, two stops down, drop.
    await handle.focus()
    await expect(handle).toBeVisible()
    await page.keyboard.press('Space')
    await expect(dndAnnouncement(page)).toHaveText(`Picked up ${name}, day 1, stop 1.`)
    await page.keyboard.press('ArrowDown')
    await expect.poll(() => idsIn(page, '1')).toEqual([b, a, c, d])
    await page.keyboard.press('ArrowDown')
    await expect.poll(() => idsIn(page, '1')).toEqual([b, c, a, d])
    const saved = waitForPatch(page, a)
    await page.keyboard.press('Space')
    expect((await saved).status()).toBe(200)
    await expect(dndAnnouncement(page)).toHaveText(`${name} moved to day 1, position 3.`)
    expect(await idsIn(page, '1')).toEqual([b, c, a, d])

    await page.reload()
    expect(await idsIn(page, '1')).toEqual([b, c, a, d])

    // Escape during a drag: back exactly as before, nothing sent.
    const patches: string[] = []
    page.on('request', (r) => {
      if (r.method() === 'PATCH') patches.push(r.url())
    })
    await expect
      .poll(() => page.evaluate((m) => performance.getEntriesByName(m).length, DND_READY), { timeout: 30_000 })
      .toBe(1)
    const again = grip(rowOf(page, a))
    await again.focus()
    await page.keyboard.press('Space')
    await expect(dndAnnouncement(page)).toHaveText(`Picked up ${name}, day 1, stop 3.`)
    await page.keyboard.press('ArrowUp')
    await expect.poll(() => idsIn(page, '1')).toEqual([b, a, c, d])
    await page.keyboard.press('Escape')
    await expect.poll(() => idsIn(page, '1')).toEqual([b, c, a, d])
    await expect(dndAnnouncement(page)).toHaveText(`Move cancelled. ${name} is back on day 1, stop 3.`)
    expect(patches).toEqual([])

    // Restore the seed order: two stops up (once the cancelled drag has settled).
    await expect(page.locator('[data-dnd-dragging], [data-dnd-placeholder]')).toHaveCount(0)
    await again.focus()
    await page.keyboard.press('Space')
    await expect(dndAnnouncement(page)).toHaveText(`Picked up ${name}, day 1, stop 3.`)
    await page.keyboard.press('ArrowUp')
    await expect.poll(() => idsIn(page, '1')).toEqual([b, a, c, d])
    await page.keyboard.press('ArrowUp')
    await expect.poll(() => idsIn(page, '1')).toEqual([a, b, c, d])
    const restored = waitForPatch(page, a)
    await page.keyboard.press('Space')
    expect((await restored).status()).toBe(200)
    expect(await idsIn(page, '1')).toEqual(fx.activityIds['1'])
  })
})
