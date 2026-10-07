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

  it('uses the barabula-pending-pass key and a 24 h TTL', () => {
    expect(PENDING_PASS_KEY).toBe('barabula-pending-pass')
    expect(PENDING_TTL_MS).toBe(24 * 60 * 60 * 1000)
  })

  it('saves { v: 1, savedAt, pass, clientRef } under the key', () => {
    expect(savePending(answers, REF, storage, NOW)).toBe(true)
    expect(JSON.parse(storage.getItem(PENDING_PASS_KEY)!)).toEqual({
      v: 1,
      savedAt: NOW,
      pass: answers,
      clientRef: REF,
    })
  })

  it('loads the answers and client ref while younger than 24 h', () => {
    savePending(answers, REF, storage, NOW)
    expect(loadPending(storage, NOW + PENDING_TTL_MS - 1)).toEqual({ pass: answers, clientRef: REF })
    expect(storage.getItem(PENDING_PASS_KEY)).not.toBeNull()
  })

  it('returns null and removes the key once 24 h old', () => {
    savePending(answers, REF, storage, NOW)
    expect(loadPending(storage, NOW + PENDING_TTL_MS)).toBeNull()
    expect(storage.getItem(PENDING_PASS_KEY)).toBeNull()
  })

  it('returns null and removes the key when saved in the future', () => {
    savePending(answers, REF, storage, NOW + 60_000)
    expect(loadPending(storage, NOW)).toBeNull()
    expect(storage.getItem(PENDING_PASS_KEY)).toBeNull()
  })

  it('returns null and removes the key for another version', () => {
    storage.setItem(PENDING_PASS_KEY, JSON.stringify({ v: 2, savedAt: NOW, pass: answers, clientRef: REF }))
    expect(loadPending(storage, NOW)).toBeNull()
    expect(storage.getItem(PENDING_PASS_KEY)).toBeNull()
  })

  it('returns null and removes the key for invalid JSON', () => {
    storage.setItem(PENDING_PASS_KEY, '{not json')
    expect(loadPending(storage, NOW)).toBeNull()
    expect(storage.getItem(PENDING_PASS_KEY)).toBeNull()
  })

  it('returns null and removes the key when the pass fails the schema', () => {
    const bad = [
      { ...answers, stops: [] },
      { ...answers, adults: 0 },
      { ...answers, interests: ['Skydiving'] },
      { ...answers, extra: 'unknown key' },
      { ...answers, when: { kind: 'length', days: 31 } },
    ]
    for (const pass of bad) {
      storage.setItem(PENDING_PASS_KEY, JSON.stringify({ v: 1, savedAt: NOW, pass, clientRef: REF }))
      expect(loadPending(storage, NOW)).toBeNull()
      expect(storage.getItem(PENDING_PASS_KEY)).toBeNull()
    }
  })

  it('returns null and removes the key when the client ref is not a uuid', () => {
    storage.setItem(
      PENDING_PASS_KEY,
      JSON.stringify({ v: 1, savedAt: NOW, pass: answers, clientRef: 'https://evil.example' })
    )
    expect(loadPending(storage, NOW)).toBeNull()
    expect(storage.getItem(PENDING_PASS_KEY)).toBeNull()
  })

  it('returns null when nothing is kept', () => {
    expect(loadPending(storage, NOW)).toBeNull()
  })

  it('clearPending removes the key', () => {
    savePending(answers, REF, storage, NOW)
    clearPending(storage)
    expect(storage.getItem(PENDING_PASS_KEY)).toBeNull()
  })

  it('never throws when storage access throws', () => {
    const broken = throwingStorage()
    expect(savePending(answers, REF, broken, NOW)).toBe(false)
    expect(loadPending(broken, NOW)).toBeNull()
    expect(() => clearPending(broken)).not.toThrow()
  })

  it('is a no-op with no storage at all', () => {
    expect(savePending(answers, REF, null, NOW)).toBe(false)
    expect(loadPending(null, NOW)).toBeNull()
    expect(() => clearPending(null)).not.toThrow()
  })

  it('defaults to window.localStorage', () => {
    window.localStorage.removeItem(PENDING_PASS_KEY)
    savePending(answers, REF)
    expect(loadPending()).toEqual({ pass: answers, clientRef: REF })
    clearPending()
    expect(window.localStorage.getItem(PENDING_PASS_KEY)).toBeNull()
  })
})
