import { test, expect, type Page } from '@playwright/test'

// Describe mode on the home blank pass (16-13, D-11, D-16): one sentence, a
// live preview of what was read, and Use this, which fills the same pass. Phone
// and laptop projects, signed in as the fixture owner, local stack only. Nothing
// here creates a trip.

const pass = (page: Page) => page.getByRole('region', { name: 'Next trip' })
const box = (page: Page) => page.getByRole('textbox', { name: 'Describe your whole trip' })
const preview = (page: Page) => page.getByRole('group', { name: 'Preview' })
const line = (page: Page, label: string) => preview(page).locator('div', { has: page.getByText(label, { exact: true }) }).last()

async function openDescribe(page: Page) {
  await page.goto('/')
  await expect(page.getByText('Question 1 of 4')).toBeVisible()
  await page.getByRole('button', { name: 'Or describe your whole trip' }).click()
  await expect(box(page)).toBeFocused()
}

test.describe('home describe mode', () => {
  test('an example fills the preview, and Use this fills the pass', async ({ page }) => {
    await openDescribe(page)
    // The question card is replaced; nothing read yet, so every line waits.
    await expect(page.getByText('Question 1 of 4')).toHaveCount(0)
    await expect(preview(page).getByText("we'll ask")).toHaveCount(4)
    for (const prompt of [
      'A long weekend in Lisbon for food and views',
      'A family week in Rome with 2 kids',
      'Paris then Prague, 6 days, museums and architecture',
      'Kyoto in April with my partner, slow pace',
    ]) {
      await expect(page.getByRole('button', { name: prompt, exact: true })).toBeVisible()
    }
    await expect(page.getByRole('button', { name: 'Use this trip description' })).toHaveAttribute('aria-disabled', 'true')

    await page.getByRole('button', { name: 'Paris then Prague, 6 days, museums and architecture' }).click()
    await expect(box(page)).toHaveValue('Paris then Prague, 6 days, museums and architecture')
    await expect(line(page, 'To')).toContainText('Paris → Prague')
    const when = line(page, 'When').getByText('6 days', { exact: true })
    await expect(when).toBeVisible()
    await expect(when).toHaveCSS('text-transform', 'uppercase')
    await expect(line(page, 'Who')).toContainText("we'll ask")
    await expect(line(page, 'Into')).toContainText('Museums · Architecture')

    await page.getByRole('button', { name: 'Use this trip description' }).click()
    await expect(pass(page).getByRole('heading', { level: 1, name: 'Paris → Prague' })).toBeVisible()
    // Who's going? is the first question the sentence left open.
    await expect(page.getByText('Question 3 of 4')).toBeVisible()
    await expect(page.getByRole('group', { name: "Who's going?" })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit dates' })).toBeVisible()
    await expect(pass(page).getByText('6 days', { exact: true })).toBeVisible()
    await expect(pass(page).getByText('Museums · Architecture', { exact: true })).toBeVisible()

    // Interests were read, so answering Who's going? finishes the pass.
    await page.getByRole('button', { name: 'Next question' }).click()
    await expect(page.getByRole('heading', { name: 'Your pass is ready.' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start planning' })).toBeVisible()
  })

  test('no city: ANYWHERE? and the name-a-city line; Step by step keeps everything', async ({ page }) => {
    await page.goto('/')
    const input = page.getByRole('combobox')
    await input.click()
    await input.fill('Lisbon')
    await page.getByRole('option', { name: 'Lisbon' }).click()
    await expect(page.getByRole('button', { name: 'Edit destination' })).toBeVisible()

    await page.getByRole('button', { name: 'Or describe your whole trip' }).click()
    await box(page).fill('somewhere warm in March')
    await expect(line(page, 'To')).toContainText('ANYWHERE?')
    // A month alone does not answer When? (D-13).
    await expect(line(page, 'When')).toContainText("we'll ask")
    // The curated set has no verified climate tags yet, so no city is suggested.
    await expect(page.getByText('Cities that fit')).toHaveCount(0)
    await expect(page.getByText("Name a city and we'll fill in the rest.")).toBeVisible()
    await expect(page.getByRole('button', { name: 'Use this trip description' })).toHaveAttribute('aria-disabled', 'true')

    // A capitalised word that is not a known city is never read as one.
    await box(page).fill('Visit Gotham for 3 days')
    await expect(line(page, 'To')).toContainText('ANYWHERE?')
    await expect(line(page, 'When')).toContainText('3 days')

    await page.getByRole('button', { name: 'Step by step instead' }).click()
    await expect(box(page)).toHaveCount(0)
    await expect(page.getByText('Question 1 of 4')).toBeVisible()
    await expect(pass(page).getByRole('heading', { level: 1, name: 'Lisbon' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remove Lisbon' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start planning' })).toBeVisible()

    // Going back to describe mode keeps the text.
    await page.getByRole('button', { name: 'Or describe your whole trip' }).click()
    await expect(box(page)).toHaveValue('Visit Gotham for 3 days')
  })

  test('the box has no length limit and grows to 6 rows, then scrolls', async ({ page }) => {
    await openDescribe(page)
    await expect(box(page)).not.toHaveAttribute('maxlength')
    const start = await box(page).evaluate((el) => el.getBoundingClientRect().height)
    const long = 'A slow week in Lisbon with my partner, food and views. '.repeat(40)
    await box(page).fill(long)
    await expect(box(page)).toHaveValue(long)
    const grown = await box(page).evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      scrolls: el.scrollHeight > el.clientHeight,
    }))
    expect(grown.height).toBeGreaterThan(start)
    expect(grown.height).toBeLessThanOrEqual(172)
    expect(grown.scrolls).toBe(true)
    // Preview values stay on one line with an ellipsis.
    await expect(line(page, 'To').locator('.truncate')).toHaveCSS('text-overflow', 'ellipsis')
  })
})
