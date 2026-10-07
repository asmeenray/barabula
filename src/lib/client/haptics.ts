// Haptics (D-29, D-30): a device-stored switch, on by default. Only Android
// browsers implement navigator.vibrate, and they ignore it before a user
// gesture, so on iOS and laptops this is a quiet no-op. Never throws.
// Callers: the moments in 16-20 (city pick, vibrate(8)) and 16-22 (place lands, vibrate(12)).

export const HAPTICS_KEY = 'barabula-haptics'

export function hapticsEnabled(): boolean {
  try {
    return window.localStorage.getItem(HAPTICS_KEY) !== 'off'
  } catch {
    return true
  }
}

/** On removes the key (the default); off stores 'off'. */
export function setHaptics(on: boolean): void {
  try {
    if (on) window.localStorage.removeItem(HAPTICS_KEY)
    else window.localStorage.setItem(HAPTICS_KEY, 'off')
  } catch {
    // Storage blocked: nothing to remember.
  }
}

export function vibrate(ms: number): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  if (!hapticsEnabled()) return
  try {
    navigator.vibrate(ms)
  } catch {
    // Some engines throw without a user gesture; a missed buzz is fine.
  }
}
