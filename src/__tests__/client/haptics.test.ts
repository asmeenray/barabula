import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HAPTICS_KEY, hapticsEnabled, setHaptics, vibrate } from '@/lib/client/haptics'

// Haptics (D-29, D-30): a device-stored switch, on by default. Vibrations only
// where navigator.vibrate exists (Android browsers), and never a throw.

const nav = navigator as Navigator & { vibrate?: unknown }
const original = nav.vibrate

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  Object.defineProperty(nav, 'vibrate', { value: original, configurable: true, writable: true })
  vi.restoreAllMocks()
})

function stubVibrate(impl: (ms: number) => boolean = () => true) {
  const fn = vi.fn(impl)
  Object.defineProperty(nav, 'vibrate', { value: fn, configurable: true, writable: true })
  return fn
}

describe('hapticsEnabled / setHaptics', () => {
  it('is on by default', () => {
    expect(hapticsEnabled()).toBe(true)
  })

  it('is off only when "off" is stored', () => {
    setHaptics(false)
    expect(localStorage.getItem(HAPTICS_KEY)).toBe('off')
    expect(hapticsEnabled()).toBe(false)
    setHaptics(true)
    expect(localStorage.getItem(HAPTICS_KEY)).toBeNull()
    expect(hapticsEnabled()).toBe(true)
  })

  it('treats blocked storage as on and never throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(hapticsEnabled()).toBe(true)
    expect(() => setHaptics(false)).not.toThrow()
  })
})

describe('vibrate', () => {
  it('calls navigator.vibrate(8) when on and supported', () => {
    const fn = stubVibrate()
    vibrate(8)
    expect(fn).toHaveBeenCalledWith(8)
  })

  it('does nothing when Haptics is off', () => {
    const fn = stubVibrate()
    localStorage.setItem(HAPTICS_KEY, 'off')
    vibrate(8)
    expect(fn).not.toHaveBeenCalled()
  })

  it('does nothing where navigator.vibrate is missing', () => {
    Object.defineProperty(nav, 'vibrate', { value: undefined, configurable: true, writable: true })
    expect(() => vibrate(8)).not.toThrow()
  })

  it('never throws when the browser refuses', () => {
    stubVibrate(() => {
      throw new Error('no user gesture')
    })
    expect(() => vibrate(12)).not.toThrow()
  })
})
