// The blank pass kept on this device while the user signs in (D-19, D-41,
// Research Pattern 8). localStorage, not session storage, so the answers
// survive the Google round trip and a new tab; at most 24 h, then gone.
// Cleared once the trip is created (ResumePendingTrip) and on sign-out (16-19).
//
// Only trip answers and the client_ref are stored: never a URL, so resuming
// can only ever open /itinerary/{id} from the API's answer (T-16-41). What is
// read back is re-validated with the create schema (T-16-42); the server
// validates again. Every function is a no-op when storage is blocked.

import type { PassAnswers } from './types'
import { PassCreateSchema } from './schema'
import { isUuid } from '@/lib/uuid'

export const PENDING_PASS_KEY = 'barabula-pending-pass'
export const PENDING_TTL_MS = 24 * 60 * 60 * 1000

const VERSION = 1
const PassOnly = PassCreateSchema.omit({ client_ref: true })

export type PendingPass = { pass: PassAnswers; clientRef: string }

/** window.localStorage when there is one and it can be reached; else null. */
function deviceStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** Keeps the answers; false when storage is missing or refuses the write. */
export function savePending(
  pass: PassAnswers,
  clientRef: string,
  storage: Storage | null = deviceStorage(),
  now: number = Date.now()
): boolean {
  if (!storage) return false
  try {
    storage.setItem(PENDING_PASS_KEY, JSON.stringify({ v: VERSION, savedAt: now, pass, clientRef }))
    return true
  } catch {
    return false
  }
}

/** The kept answers while younger than 24 h; anything else is removed and gives null. */
export function loadPending(
  storage: Storage | null = deviceStorage(),
  now: number = Date.now()
): PendingPass | null {
  if (!storage) return null
  let raw: string | null
  try {
    raw = storage.getItem(PENDING_PASS_KEY)
  } catch {
    return null
  }
  if (raw === null) return null

  const kept = read(raw, now)
  if (!kept) clearPending(storage)
  return kept
}

function read(raw: string, now: number): PendingPass | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const { v, savedAt, pass, clientRef } = data as Record<string, unknown>
  if (v !== VERSION || typeof savedAt !== 'number') return null
  const age = now - savedAt
  if (!(age >= 0 && age < PENDING_TTL_MS)) return null
  if (!isUuid(clientRef)) return null
  const parsed = PassOnly.safeParse(pass)
  if (!parsed.success) return null
  return { pass: parsed.data, clientRef }
}

export function clearPending(storage: Storage | null = deviceStorage()): void {
  try {
    storage?.removeItem(PENDING_PASS_KEY)
  } catch {
    // Blocked storage: nothing was kept, so nothing to clear.
  }
}
