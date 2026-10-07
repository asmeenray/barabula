import { test, expect } from '@playwright/test'

// 16-23 (D-36, D-39): the old dashboard and chat screens are deleted. Their
// URLs land on Trips (/), while the 16.1 engine routes stay. Signed in as the
// fixture owner on the phone and laptop projects, local stack only.

test.describe('old UI routes', () => {
  for (const path of ['/dashboard', '/chat']) {
    test(`${path} lands on Trips`, async ({ page, baseURL }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
      expect(new URL(page.url()).pathname).toBe('/')
      expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin)
    })
  }

  test('/chat with a query string also lands on Trips', async ({ page }) => {
    await page.goto('/chat?session=00000000-0000-0000-0000-000000000000')
    expect(new URL(page.url()).pathname).toBe('/')
  })

  test('engine kept: /api/chat/sessions answers the signed-in owner', async ({ page }) => {
    const response = await page.request.get('/api/chat/sessions')
    expect(response.status()).toBe(200)
    expect(Array.isArray(await response.json())).toBe(true)
  })
})
