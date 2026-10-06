import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { test as setup, expect } from '@playwright/test'
import { E2E_PASSWORD, OWNER_STATE_PATH, readFixtures } from './helpers/fixtures'

// Signs the seeded owner in through the real /login form (local stack only)
// and saves the session for the phone, laptop and phone-throttled projects.
setup('sign in as the fixture owner', async ({ page }) => {
  const { ownerEmail } = readFixtures()

  await page.goto('/login')
  await page.getByLabel('Email').fill(ownerEmail)
  await page.getByLabel('Password').fill(E2E_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
  await expect(page).not.toHaveURL(/\/login/)

  mkdirSync(path.dirname(OWNER_STATE_PATH), { recursive: true })
  await page.context().storageState({ path: OWNER_STATE_PATH })
})
