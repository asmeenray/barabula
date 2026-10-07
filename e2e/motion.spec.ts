import { test, expect, type Page } from '@playwright/test'
import { readFixtures } from './helpers/fixtures'

// Motion (16-20, D-30…D-32): the split-flap moments run and settle on the real
// text, reduced motion turns them into plain changes, and the laptop plane
// cursor sits beside the real cursor (never hides it). Phone (Pixel 7) and
// laptop projects, signed in as the fixture owner, local stack only.

type GlyphWindow = Window & { __glyphs: string[] }

/**
 * Logs every split-flap glyph that appears, by where it is: 'blank' (the
 * home blank pass), 'now' / 'next' (Now/Next pass), a plan day ('1', '2',
 * 'maybe'), else 'other' (e.g. LOADING MAP…). Installed before the page loads.
 */
async function watchGlyphs(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as GlyphWindow
    w.__glyphs = []
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue
          const glyph = node.matches('[data-glyph]') ? node : node.querySelector('[data-glyph]')
          if (!glyph) continue
          const where =
            glyph.closest('[data-day]')?.getAttribute('data-day') ??
            glyph.closest('[data-pass]')?.getAttribute('data-pass') ??
            (glyph.closest('#next-trip-pass') ? 'blank' : 'other')
          w.__glyphs.push(where)
        }
      }
    }).observe(document, { childList: true, subtree: true })
  })
}

const glyphLog = (page: Page) => page.evaluate(() => (window as unknown as GlyphWindow).__glyphs)

function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 1024
}

async function pickCity(page: Page, typed: string, option: string) {
  const input = page.getByRole('combobox')
  await input.click()
  await input.fill(typed)
  await page.getByRole('option', { name: option }).click()
}

/** Phone: the D2 tab; laptop: the D2 day header row. */
async function switchToDay2(page: Page) {
  if (isPhone(page)) await page.getByRole('tablist', { name: 'Days' }).getByRole('tab', { name: /^D2\b/ }).click()
  else await page.getByRole('button', { name: /^D2 · / }).click()
}

const plane = (page: Page) => page.locator('[data-plane-cursor]')

test.describe('motion', () => {
  test('laptop: the plane flies beside the cursor over the blank pass, never instead of it', async ({ page }) => {
    test.skip(isPhone(page), 'laptop only')
    await page.goto('/')
    const pass = page.getByRole('region', { name: 'Next trip' })
    await expect(pass).toBeVisible()
    const box = (await pass.boundingBox())!
    const x = box.x + 60
    const y = box.y + 60
    await page.mouse.move(x, y)
    await page.mouse.move(x + 120, y + 40, { steps: 8 })

    await expect(plane(page)).toHaveCount(1)
    await expect(plane(page)).toHaveAttribute('aria-hidden', 'true')
    expect(await plane(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
    await expect.poll(() => plane(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    expect(await plane(page).evaluate((el) => getComputedStyle(el).transform)).not.toBe('none')

    // The system cursor is still there under the pointer.
    const cursor = await page.evaluate(
      ([px, py]) => getComputedStyle(document.elementFromPoint(px, py)!).cursor,
      [x + 120, y + 40]
    )
    expect(cursor).not.toBe('none')

    // It fades out over the city field.
    const field = (await page.getByRole('combobox').boundingBox())!
    await page.mouse.move(field.x + 20, field.y + field.height / 2, { steps: 4 })
    await expect.poll(() => plane(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('0')
  })

  test('phone: no plane cursor', async ({ page }) => {
    test.skip(!isPhone(page), 'phone only')
    await page.goto('/')
    await expect(page.getByRole('region', { name: 'Next trip' })).toBeVisible()
    await page.getByRole('combobox').click()
    await expect(plane(page)).toHaveCount(0)
  })

  test('moment 1: picking a city split-flaps the title, then it reads the city', async ({ page }) => {
    await watchGlyphs(page)
    await page.goto('/')
    await pickCity(page, 'Lis', 'Lisbon')
    const title = page.getByRole('heading', { level: 1, name: 'Lisbon' })
    await expect(title).toBeVisible()
    await expect.poll(async () => (await glyphLog(page)).includes('blank')).toBe(true)
    await expect(title).toHaveText('Lisbon')
    await expect(page.locator('#next-trip-pass [data-glyph]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Edit destination' })).toBeVisible()
  })

  test('the Now/Next title split-flaps once per visit', async ({ page }) => {
    await watchGlyphs(page)
    await page.goto('/')
    await expect(page.locator('[data-pass="now"]')).toBeVisible()
    await expect.poll(async () => (await glyphLog(page)).includes('now')).toBe(true)
    expect(await page.evaluate(() => sessionStorage.getItem('barabula-nownext-flap'))).toBe('1')

    await page.reload()
    await expect(page.locator('[data-pass="now"]')).toBeVisible()
    await page.waitForTimeout(800)
    expect(await glyphLog(page)).not.toContain('now')
  })

  test('moment 3: a day switch flips the new day, not the first load', async ({ page }) => {
    const fx = readFixtures()
    await watchGlyphs(page)
    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.locator('[data-day="1"] [data-activity-id]').first()).toBeVisible()
    await page.waitForTimeout(500)
    expect((await glyphLog(page)).filter((w) => w !== 'other')).toEqual([])

    await switchToDay2(page)
    await expect.poll(async () => (await glyphLog(page)).includes('2')).toBe(true)
    // Settles within the 500 ms board flip.
    await expect(page.locator('[data-day="2"] [data-glyph]')).toHaveCount(0, { timeout: 2_000 })
    await expect(page.locator(`[data-activity-id="${fx.activityIds['2'][0]}"]`)).toBeVisible()
  })
})

test.describe('motion, reduced', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the pass shows the city at once and there is no plane', async ({ page }) => {
    await watchGlyphs(page)
    await page.goto('/')
    const pass = page.getByRole('region', { name: 'Next trip' })
    await expect(pass).toBeVisible()
    if (!isPhone(page)) {
      const box = (await pass.boundingBox())!
      await page.mouse.move(box.x + 60, box.y + 60)
      await page.mouse.move(box.x + 180, box.y + 100, { steps: 8 })
    }
    await pickCity(page, 'Lis', 'Lisbon')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lisbon')
    await expect(page.getByRole('button', { name: 'Edit destination' })).toBeVisible()
    await page.waitForTimeout(400)
    expect(await glyphLog(page)).toEqual([])
    await expect(plane(page)).toHaveCount(0)
  })

  test('a day switch shows day 2 at once', async ({ page }) => {
    const fx = readFixtures()
    await watchGlyphs(page)
    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.locator('[data-day="1"] [data-activity-id]').first()).toBeVisible()
    await switchToDay2(page)
    await expect(page.locator(`[data-activity-id="${fx.activityIds['2'][0]}"]`)).toBeVisible()
    await page.waitForTimeout(400)
    expect(await glyphLog(page)).toEqual([])
  })
})
