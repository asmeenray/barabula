import { test, expect } from '@playwright/test'
import { readFixtures } from './helpers/fixtures'

test.describe('harness smoke', () => {
  test('logged out: /login answers 200 and shows the email field', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    const response = await page.goto('/login')
    expect(response?.status()).toBe(200)
    await expect(page.getByLabel('Email')).toBeVisible()
    await context.close()
  })

  test('signed in: the local stack accepts the saved session', async ({ page }) => {
    expect(readFixtures().lisbonId).toBeTruthy()
    await page.goto('/dashboard')
    await expect(page).not.toHaveURL(/\/login/)
  })
})
