import { test, expect, type Page } from '@playwright/test'
import { checkA11y } from './helpers/axe'
import { readFixtures } from './helpers/fixtures'

// Accessibility floor (16-24, handover §4 / UI-SPEC): every phase 16 screen
// has no WCAG 2.0 A/AA or 2.1 AA violations (axe, @axe-core/playwright
// approved in 16-01) in the light AND the dark theme, on phone and laptop.
// No axe rule is ever disabled to make a screen pass.
//
// The theme is set the way the app stores it (localStorage barabula-theme)
// before the page's own head script runs, so the first paint is already in
// that theme. Each screen is checked in its interesting state: the plan with
// a place ticket open, Places with a place card open.

type Theme = 'light' | 'dark'
const THEMES: Theme[] = ['light', 'dark']

const fx = readFixtures()

/** Store the theme choice before any page script runs (every navigation). */
async function useTheme(page: Page, theme: Theme) {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('barabula-theme', t)
    } catch {
      /* storage blocked: the head script falls back to the OS setting */
    }
  }, theme)
}

/** Fonts loaded and no finite animation still running (flips, fades, view transitions). */
async function settle(page: Page) {
  await page.waitForLoadState('load')
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await page
    .waitForFunction(
      () =>
        document
          .getAnimations()
          .every((a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity),
      null,
      { timeout: 10_000 }
    )
    .catch(() => undefined)
  await page.waitForTimeout(300)
}

async function expectTheme(page: Page, theme: Theme) {
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme)
}

async function check(page: Page, label: string, theme: Theme) {
  await settle(page)
  await expectTheme(page, theme)
  await checkA11y(page, `${label} (${theme}, ${page.viewportSize()?.width}px)`)
}

/** Home: the blank pass on its first question, then with a city picked (Start planning shown). */
async function checkHome(page: Page, label: string, theme: Theme) {
  await page.goto('/')
  await expect(page.getByText('Question 1 of 4')).toBeVisible()
  await check(page, label, theme)
  const input = page.getByRole('combobox')
  await input.click()
  await input.fill('Lis')
  await page.getByRole('option', { name: 'Lisbon' }).click()
  await expect(page.getByRole('button', { name: 'Start planning' })).toBeVisible()
  await check(page, `${label}, pass filled`, theme)
}

test.describe('accessibility, logged out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const theme of THEMES) {
    test(`home (logged out), ${theme}`, async ({ page }) => {
      await useTheme(page, theme)
      await checkHome(page, 'home logged out', theme)
    })

    test(`login, ${theme}`, async ({ page }) => {
      await useTheme(page, theme)
      await page.goto('/login')
      await expect(page.getByLabel('Email')).toBeVisible()
      await check(page, 'login', theme)
    })
  }
})

test.describe('accessibility, signed in', () => {
  for (const theme of THEMES) {
    test(`home (signed in), ${theme}`, async ({ page }) => {
      await useTheme(page, theme)
      await checkHome(page, 'home signed in', theme)
    })

    test(`plan with a ticket open, ${theme}`, async ({ page }) => {
      await useTheme(page, theme)
      await page.goto(`/itinerary/${fx.lisbonId}`)
      await expect(page.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
      await expect
        .poll(() => page.evaluate(() => performance.getEntriesByName('barabula:map-load').length), { timeout: 30_000 })
        .toBeGreaterThan(0)
      const row = page.locator(`li[data-activity-id="${fx.activityIds['1'][0]}"]`)
      const button = row.locator(':scope > button[aria-expanded]:not([aria-haspopup])')
      await button.click()
      await expect(button).toHaveAttribute('aria-expanded', 'true')
      await expect(row.getByRole('region')).toBeVisible()
      await check(page, 'plan + ticket', theme)
    })

    test(`Places with a card open, ${theme}`, async ({ page }) => {
      await useTheme(page, theme)
      await page.goto('/places')
      await expect
        .poll(() => page.evaluate(() => performance.getEntriesByName('barabula:places-map-load').length), {
          timeout: 30_000,
        })
        .toBeGreaterThan(0)
      await page.getByRole('button', { name: /Time Out Market/ }).filter({ hasText: 'Time Out Market' }).first().click()
      await expect(page.getByRole('region', { name: 'Time Out Market' })).toBeVisible()
      await check(page, 'Places + card', theme)
    })

    test(`You, ${theme}`, async ({ page }) => {
      await useTheme(page, theme)
      await page.goto('/you')
      await expect(page.getByRole('region', { name: 'Passenger' })).toBeVisible()
      await check(page, 'You', theme)
    })

    test(`credits, ${theme}`, async ({ page }) => {
      await useTheme(page, theme)
      await page.goto('/you/credits')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await check(page, 'credits', theme)
    })
  }
})
