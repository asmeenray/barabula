import { readFileSync } from 'node:fs'
import path from 'node:path'

/** Ids written by e2e/seed.setup.ts (gitignored, local stack only). */
export type E2EFixtures = {
  ownerEmail: string
  otherEmail: string
  lisbonId: string
  portoId: string
  pragueId: string
  /** Today is day 2 of 3 (home NOW pass). */
  madridId: string
  romeId: string
  parisId: string
  /** Activity ids per day in position order; key "maybe" holds the Maybe rows. */
  activityIds: Record<string, string[]>
}

export const FIXTURES_PATH = path.join(process.cwd(), 'e2e', '.fixtures.json')
export const OWNER_STATE_PATH = path.join(process.cwd(), 'e2e', '.auth', 'owner.json')

export const OWNER_EMAIL = 'e2e-owner@example.com'
export const OTHER_EMAIL = 'e2e-other@example.com'
/** Local stack only. Never a real credential. */
export const E2E_PASSWORD = process.env.E2E_PASSWORD || 'e2e-local-only-password'

export function readFixtures(): E2EFixtures {
  return JSON.parse(readFileSync(FIXTURES_PATH, 'utf8')) as E2EFixtures
}
