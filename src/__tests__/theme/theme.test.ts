import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_KEY, applyTheme, followSystemTheme, readThemePref, resolveTheme, syncThemeColor } from '@/lib/theme/theme'

// Appearance (D-03, UI-SPEC "Themes"): the device choice lives under
// barabula-theme (light | dark; absent = follow the OS).

let osDark = false
let listeners: Array<(e: { matches: boolean }) => void> = []

function stubMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('dark') ? osDark : false,
      media: query,
      addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.push(fn),
      removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) => {
        listeners = listeners.filter((l) => l !== fn)
      },
    }))
  )
}

function addThemeMetas() {
  for (const [media, color] of [
    ['(prefers-color-scheme: light)', '#EEF1F4'],
    ['(prefers-color-scheme: dark)', '#080D10'],
  ]) {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.media = media
    meta.content = color
    document.head.appendChild(meta)
  }
}

const metas = () => Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))

beforeEach(() => {
  osDark = false
  listeners = []
  stubMatchMedia()
  localStorage.clear()
  delete document.documentElement.dataset.theme
  document.head.innerHTML = ''
  addThemeMetas()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readThemePref', () => {
  it('is system when nothing is stored', () => {
    expect(readThemePref()).toBe('system')
  })

  it('reads light and dark', () => {
    localStorage.setItem(THEME_KEY, 'dark')
    expect(readThemePref()).toBe('dark')
    localStorage.setItem(THEME_KEY, 'light')
    expect(readThemePref()).toBe('light')
  })

  it('is system for an unknown value', () => {
    localStorage.setItem(THEME_KEY, 'sepia')
    expect(readThemePref()).toBe('system')
  })

  it('is system when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readThemePref()).toBe('system')
    spy.mockRestore()
  })
})

describe('applyTheme', () => {
  it('dark: sets data-theme, stores the choice and paints the bar #080D10', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(metas().map((m) => m.content)).toEqual(['#080D10', '#080D10'])
  })

  it('light: sets data-theme, stores the choice and paints the bar #EEF1F4', () => {
    osDark = true
    applyTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
    expect(metas().map((m) => m.content)).toEqual(['#EEF1F4', '#EEF1F4'])
  })

  it('system: removes the key and follows the OS', () => {
    localStorage.setItem(THEME_KEY, 'light')
    osDark = true
    applyTheme('system')
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
    expect(document.documentElement.dataset.theme).toBe('dark')
    // Each meta goes back to the colour of its own media query.
    expect(metas().map((m) => m.content)).toEqual(['#EEF1F4', '#080D10'])
  })

  it('system on a light OS is light', () => {
    applyTheme('system')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('still sets data-theme when storage refuses the write', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => applyTheme('dark')).not.toThrow()
    expect(document.documentElement.dataset.theme).toBe('dark')
    spy.mockRestore()
  })
})

describe('resolveTheme', () => {
  it('maps a preference to light or dark', () => {
    expect(resolveTheme('dark')).toBe('dark')
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('system')).toBe('light')
    osDark = true
    expect(resolveTheme('system')).toBe('dark')
  })
})

describe('syncThemeColor', () => {
  it('paints the bar for a stored dark choice after a reload', () => {
    localStorage.setItem(THEME_KEY, 'dark')
    syncThemeColor()
    expect(metas().map((m) => m.content)).toEqual(['#080D10', '#080D10'])
  })
})

describe('followSystemTheme', () => {
  it('re-applies on an OS change while the choice is System', () => {
    const stop = followSystemTheme()
    expect(listeners).toHaveLength(1)
    osDark = true
    listeners.forEach((l) => l({ matches: true }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    stop()
    expect(listeners).toHaveLength(0)
  })

  it('ignores OS changes while a fixed choice is stored', () => {
    localStorage.setItem(THEME_KEY, 'light')
    document.documentElement.dataset.theme = 'light'
    const stop = followSystemTheme()
    osDark = true
    listeners.forEach((l) => l({ matches: true }))
    expect(document.documentElement.dataset.theme).toBe('light')
    stop()
  })
})
