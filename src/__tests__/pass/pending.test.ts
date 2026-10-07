import { describe, it, expect, beforeEach } from 'vitest'
import {
  PENDING_PASS_KEY,
  PENDING_TTL_MS,
  clearPending,
  loadPending,
  savePending,
} from '@/lib/pass/pending'
import type { PassAnswers } from '@/lib/pass/types'

// The pass kept on the device across sign-in (D-19, D-41, Research Pattern 8).
// loadPending is async since 16-24: the schema loads only when a pass is kept.

const REF = '3b241101-e2bb-4255-8caf-4136c566a962'
const NOW = Date.UTC(2026, 9, 7, 12, 0, 0)

const answers: PassAnswers = {
  stops: ['Lisbon'],
  when: { kind: 'length', days: 2 },
  adults: 2,
  kids: null,
  interests: ['Food'],
  note: null,
}

/** In-memory Storage stand-in. */
function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  }
}

/** Storage whose every call throws (private mode, blocked storage). */
function throwingStorage(): Storage {
  const fail = () => {
    throw new Error('SecurityError')
  }
  return { length: 0, clear: fail, getItem: fail, key: fail, removeItem: fail, setItem: fail }
}

describe('pending pass', () => {
  let storage: Storage
  beforeEach(() => {
    storage = memoryStorage()
  })

  it('uses the barabula-pending-pass key and a 24 h TTL', async () => {
    expect(PENDING_PASS_KEY).toBe('barabula-pending-pass')
    expect(PENDING_TTL_MS).toBe(24 * 60 * 60 * 1000)
  })

  it('saves { v: 1, savedAt, pass, clientRef } under the key', async () => {
    expect(savePending(answers, REF, storage, NOW)).toBe(true)
    expect(JSON.parse(storage.getItem(PENDING_PASS_KEY)!)).toEqual({
      v: 1,
      savedAt: NOW,
      pass: answers,
      clientRef: REF,
    })
  })

  it('loads the answers and client ref while younger than 24 h', async () => {
    savePending(answers, REF, storage, NOW)
    expect(await loadPending(storage, NOW + PENDING_TTL_MS - 1)).toEqual({ pass: answers, clientRef: REF })
    expect(storage.getItem(PENDING_PASS_KEY)).not.toBeNull()
  })

  it('returns null and removes the key once 24 h old', async () => {
    savePending(answers, REF, storage, NOW)
    expect(await loadPending(storage, NOW + PENDING_TTL_MS)).toBeNull()
    expect(storage.getItem(PENDING_PASS_KEY)).toBeNull()
  })

  it('returns null and removes the key when saved in the future', async () => {
    savePending(answers, REF, storage, NOW + 60_000)
    expect(await loadPending(storage, NOW)).toBeNull()
    expect(storage.getItem(PENDING_PASS_KEY)).toBeNull()
  })

  it('returns null and removes the key for another version', async () => {
    storage.setItem(PENDING_PASS_KEY, JSON.stringify({ v: 2, savedAt: NOW, pass: answers, clientRef: REF }))
    expect(await loadPending(storage, NOW)).toBeNull()
    expect(storage.getItem(PENDING_PASS_KEY)).toBeNull()
  })

  it('returns null and removes the key for invalid JSON', async () => {
    storage.setItem(PENDING_PASS_KEY, '{not json')
    expect(await loadPending(storage, NOW)).toBeNull()
    expect(storage.getItem(PENDING_PASS_KEY)).toBeNull()
  })

  it('returns null and removes the key when the pass fails the schema', async () => {
    const bad = [
      { ...answers, stops: [] },
      { ...answers, adults: 0 },
      { ...answers, interests: ['Skydiving'] },
      { ...answers, extra: 'unknown key' },
      { ...answers, when: { kind: 'length', days: 31 } },
    ]
    for (const pass of bad) {
      storage.setItem(PENDING_PASS_KEY, JSON.stringify({ v: 1, savedAt: NOW, pass, clientRef: REF }))
      expect(await loadPending(storage, NOW)).toBeNull()
      expect(storage.getItem(PENDING_PASS_KEY)).toBeNull()
    }
  })

  it('returns null and removes the key when the client ref is not a uuid', async () => {
    storage.setItem(
      PENDING_PASS_KEY,
      JSON.stringify({ v: 1, savedAt: NOW, pass: answers, clientRef: 'https://evil.example' })
    )
    expect(await loadPending(storage, NOW)).toBeNull()
    expect(storage.getItem(PENDING_PASS_KEY)).toBeNull()
  })

  it('returns null when nothing is kept', async () => {
    expect(await loadPending(storage, NOW)).toBeNull()
  })

  it('clearPending removes the key', async () => {
    savePending(answers, REF, storage, NOW)
    clearPending(storage)
    expect(storage.getItem(PENDING_PASS_KEY)).toBeNull()
  })

  it('never throws when storage access throws', async () => {
    const broken = throwingStorage()
    expect(savePending(answers, REF, broken, NOW)).toBe(false)
    expect(await loadPending(broken, NOW)).toBeNull()
    expect(() => clearPending(broken)).not.toThrow()
  })

  it('is a no-op with no storage at all', async () => {
    expect(savePending(answers, REF, null, NOW)).toBe(false)
    expect(await loadPending(null, NOW)).toBeNull()
    expect(() => clearPending(null)).not.toThrow()
  })

  it('defaults to window.localStorage', async () => {
    window.localStorage.removeItem(PENDING_PASS_KEY)
    savePending(answers, REF)
    expect(await loadPending()).toEqual({ pass: answers, clientRef: REF })
    clearPending()
    expect(window.localStorage.getItem(PENDING_PASS_KEY)).toBeNull()
  })
})
