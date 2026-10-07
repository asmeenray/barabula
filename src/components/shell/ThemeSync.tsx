'use client'

// Renders nothing. Mounted once in AppShell so a System choice follows the OS
// on every page (D-03), and the browser bar colour matches a fixed Light or
// Dark choice after a reload (the head script sets data-theme; the
// media-tagged theme-color metas only know the OS setting).

import { useEffect } from 'react'
import { followSystemTheme, syncThemeColor } from '@/lib/theme/theme'

export function ThemeSync() {
  useEffect(() => {
    syncThemeColor()
    return followSystemTheme()
  }, [])
  return null
}
