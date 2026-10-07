// Appearance (D-03, UI-SPEC "Themes"). The device choice lives in localStorage
// under barabula-theme ('light' | 'dark'; absent = follow the OS). The head
// script in src/app/layout.tsx applies it before first paint; these helpers
// apply a change live (You tab) and keep System in step with the OS.
// Kept tiny and dependency-free: ThemeSync loads it on every page.

export const THEME_KEY = 'barabula-theme'

export type ThemePref = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

/** `<meta name="theme-color">` per theme: the page colour (--bg). */
export const THEME_COLOR: Record<ResolvedTheme, string> = { light: '#EEF1F4', dark: '#080D10' }

const DARK_QUERY = '(prefers-color-scheme: dark)'

function osDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

/** The stored choice; 'system' when nothing (or anything unknown) is stored, or storage is blocked. */
export function readThemePref(): ThemePref {
  try {
    const v = window.localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref !== 'system') return pref
  return osDark() ? 'dark' : 'light'
}

/**
 * Browser bar colour. A fixed choice paints both media-tagged metas with its
 * colour; System puts each meta back to the colour of its own media query.
 */
export function syncThemeColor(pref: ThemePref = readThemePref()): void {
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const own: ResolvedTheme = meta.media.includes('dark') ? 'dark' : 'light'
    meta.content = THEME_COLOR[pref === 'system' ? own : pref]
  }
}

/** Store the choice and apply it now: html data-theme, meta theme-color. Never throws. */
export function applyTheme(pref: ThemePref): void {
  try {
    if (pref === 'system') window.localStorage.removeItem(THEME_KEY)
    else window.localStorage.setItem(THEME_KEY, pref)
  } catch {
    // Storage blocked: the change still applies for this page.
  }
  document.documentElement.dataset.theme = resolveTheme(pref)
  syncThemeColor(pref)
}

/** While the choice is System, follow OS light/dark changes live. Returns the unsubscribe. */
export function followSystemTheme(): () => void {
  if (typeof window.matchMedia !== 'function') return () => {}
  const list = window.matchMedia(DARK_QUERY)
  const onChange = () => {
    if (readThemePref() === 'system') document.documentElement.dataset.theme = resolveTheme('system')
  }
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}
