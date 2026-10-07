import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

// @axe-core/playwright 4.13.0 was approved in 16-01.

/** Runs axe with WCAG 2.0 A/AA and 2.1 AA tags; fails on any violation. */
export async function checkA11y(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()

  const report = results.violations
    .map((v) => {
      const targets = v.nodes.map((n) => `    ${n.target.join(' ')}`).join('\n')
      return `  ${v.id} (${v.impact ?? 'n/a'}): ${v.help}\n${targets}`
    })
    .join('\n')

  expect(results.violations, `axe violations on ${label}:\n${report}`).toEqual([])
}
