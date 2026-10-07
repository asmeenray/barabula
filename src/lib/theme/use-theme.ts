'use client'

// React side of Appearance (D-03). useResolvedTheme() follows html data-theme
// live (whoever changes it: the You tab, the OS while on System, another
// tab), so the maps swap their style without a reload. useThemePref() is the
// You tab's control: the stored choice plus a setter that applies it.

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { THEME_KEY, applyTheme, followSystemTheme, readThemePref, type ResolvedTheme, type ThemePref } from './theme'

function readResolved(): ResolvedTheme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function subscribeResolved(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

/** 'light' | 'dark' as drawn right now (html data-theme). Server snapshot: light. */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribeResolved, readResolved, () => 'light')
}

// Same-tab changes notify here; other tabs arrive through the storage event.
const prefListeners = new Set<() => void>()

function subscribePref(onChange: () => void): () => void {
  prefListeners.add(onChange)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_KEY && e.key !== null) return
    applyTheme(readThemePref())
    onChange()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    prefListeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/** The stored choice (System · Light · Dark) and a setter that applies it at once. */
export function useThemePref(): [ThemePref, (pref: ThemePref) => void] {
  // Server snapshot 'system': the toggle settles on the stored choice after hydration.
  const pref = useSyncExternalStore(subscribePref, readThemePref, () => 'system' as const)

  // System follows the OS live (ThemeSync does the same on every page; this is idempotent).
  useEffect(() => (pref === 'system' ? followSystemTheme() : undefined), [pref])

  const setPref = useCallback((next: ThemePref) => {
    applyTheme(next)
    prefListeners.forEach((l) => l())
  }, [])

  return [pref, setPref]
}
