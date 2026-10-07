import { test, expect, type Browser, type Page } from '@playwright/test'
import { OWNER_STATE_PATH, readFixtures } from './helpers/fixtures'

// Theme before first paint (D-29, UI-SPEC "no flash"): the head script in
// src/app/layout.tsx sets html[data-theme] from the stored choice
// (barabula-theme) or the OS setting before the body parses, so the value is
// already right at DOMContentLoaded. Also 200% zoom: a laptop window zoomed to
// 200% has a 640x400 CSS viewport; layouts must not scroll sideways and the
// screen's primary action must stay reachable.

const fx = readFixtures()

/** data-theme as it was when DOMContentLoaded fired (recorded by an init script). */
async function themeAtDCL(page: Page, url: string): Promise<string | undefined> {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      ;(window as unknown as { __themeAtDCL?: string }).__themeAtDCL = document.documentElement.dataset.theme
    })
  })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  return page.evaluate(() => (window as unknown as { __themeAtDCL?: string }).__themeAtDCL)
}

async function pageWith(browser: Browser, baseURL: string, colorScheme: 'light' | 'dark', stored?: 'light' | 'dark') {
  const context = await browser.newContext({ baseURL, storageState: OWNER_STATE_PATH, colorScheme })
  if (stored) {
    await context.addInitScript((t) => localStorage.setItem('barabula-theme', t), stored)
  }
  return context.newPage()
}

test.describe('theme before first paint', () => {
  const urls = () => ['/', `/itinerary/${fx.lisbonId}`]

  for (const scheme of ['dark', 'light'] as const) {
    test(`a ${scheme}-scheme browser gets data-theme="${scheme}" at DOMContentLoaded`, async ({ browser }, testInfo) => {
      const page = await pageWith(browser, testInfo.project.use.baseURL as string, scheme)
      try {
        for (const url of urls()) expect(await themeAtDCL(page, url), url).toBe(scheme)
      } finally {
        await page.context().close()
      }
    })
  }

  test('a stored Light choice wins over a dark-scheme browser', async ({ browser }, testInfo) => {
    const page = await pageWith(browser, testInfo.project.use.baseURL as string, 'dark', 'light')
    try {
      for (const url of urls()) expect(await themeAtDCL(page, url), url).toBe('light')
    } finally {
      await page.context().close()
    }
  })

  test('a stored Dark choice wins over a light-scheme browser', async ({ browser }, testInfo) => {
    const page = await pageWith(browser, testInfo.project.use.baseURL as string, 'light', 'dark')
    try {
      for (const url of urls()) expect(await themeAtDCL(page, url), url).toBe('dark')
    } finally {
      await page.context().close()
    }
  })
})

test.describe('200% zoom (laptop 1280x800 at 200% = 640x400)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'laptop', 'zoom is a laptop check')
    await page.setViewportSize({ width: 640, height: 400 })
  })

  async function noSideScroll(page: Page, label: string) {
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    console.log(`200% zoom ${label}: scrollWidth ${scrollWidth}, innerWidth ${innerWidth}`)
    expect(scrollWidth, `${label} scrolls sideways`).toBeLessThanOrEqual(innerWidth)
  }

  async function reachable(page: Page, label: string, target: ReturnType<Page['locator']>) {
    await target.scrollIntoViewIfNeeded()
    await expect(target, `${label}: primary action visible`).toBeVisible()
    await expect(target, `${label}: primary action inside the viewport`).toBeInViewport()
    const box = await target.boundingBox()
    expect(box, `${label}: primary action has a box`).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(640)
  }

  test('home: no sideways scroll, Start planning reachable', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Question 1 of 4')).toBeVisible()
    await noSideScroll(page, 'home')
    const input = page.getByRole('combobox')
    await input.click()
    await input.fill('Lis')
    await page.getByRole('option', { name: 'Lisbon' }).click()
    await reachable(page, 'home', page.getByRole('button', { name: 'Start planning' }))
    await noSideScroll(page, 'home, pass filled')
  })

  test('plan: no sideways scroll, Add place reachable', async ({ page }) => {
    await page.goto(`/itinerary/${fx.lisbonId}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
    await expect
      .poll(() => page.evaluate(() => performance.getEntriesByName('barabula:map-load').length), { timeout: 30_000 })
      .toBeGreaterThan(0)
    await noSideScroll(page, 'plan')
    await reachable(page, 'plan', page.locator('button:visible', { hasText: /^Add place$/ }).first())
  })

  test('Places: no sideways scroll, search reachable', async ({ page }) => {
    await page.goto('/places')
    await expect
      .poll(() => page.evaluate(() => performance.getEntriesByName('barabula:places-map-load').length), {
        timeout: 30_000,
      })
      .toBeGreaterThan(0)
    await noSideScroll(page, 'Places')
    await reachable(page, 'Places', page.getByRole('searchbox', { name: 'Search your places' }))
  })
})
