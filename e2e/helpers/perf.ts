import type { Page } from '@playwright/test'

/**
 * Budget helpers (handover section 4.6). Used by the phone-throttled project.
 */

/**
 * Slow 4G and a 4x CPU slowdown through CDP. Chromium only: other engines get
 * a clear skip message and no throttling (returns false).
 */
export async function throttle4G(page: Page): Promise<boolean> {
  const browserName = page.context().browser()?.browserType().name()
  if (browserName !== 'chromium') {
    console.warn(`throttle4G skipped: CDP throttling needs Chromium (got ${browserName ?? 'unknown'})`)
    return false
  }
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  return true
}

/** startTime (ms) of the last largest-contentful-paint entry, or null if none. */
export async function readLCP(page: Page): Promise<number | null> {
  return page.evaluate(
    () =>
      new Promise<number | null>((resolve) => {
        let last: number | null = null
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            if (entries.length) last = entries[entries.length - 1].startTime
          })
          observer.observe({ type: 'largest-contentful-paint', buffered: true })
          // Buffered entries arrive asynchronously; give them a moment.
          setTimeout(() => {
            observer.disconnect()
            resolve(last)
          }, 250)
        } catch {
          resolve(null)
        }
      })
  )
}

export type ScriptBytes = {
  totalBytes: number
  files: { url: string; bytes: number }[]
}

/**
 * Sum of encodedBodySize for script resources after load plus a 2 s idle.
 * Excludes anything under /maplibre/ and any script whose source contains
 * "GPUInitializationError" (the lazily loaded MapLibre bundle).
 */
export async function scriptBytes(
  page: Page,
  opts: { idleMs?: number; exclude?: (url: string) => boolean } = {}
): Promise<ScriptBytes> {
  await page.waitForLoadState('load')
  await page.waitForTimeout(opts.idleMs ?? 2000)

  const entries = await page.evaluate(() =>
    (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
      .filter((e) => e.initiatorType === 'script')
      .map((e) => ({ url: e.name, bytes: e.encodedBodySize }))
  )

  const files: ScriptBytes['files'] = []
  for (const entry of entries) {
    const pathname = new URL(entry.url).pathname
    if (pathname.startsWith('/maplibre/')) continue
    if (opts.exclude?.(entry.url)) continue
    const isMapLibre = await page.evaluate(async (url) => {
      try {
        const res = await fetch(url)
        return (await res.text()).includes('GPUInitializationError')
      } catch {
        return false
      }
    }, entry.url)
    if (isMapLibre) continue
    files.push(entry)
  }

  return { totalBytes: files.reduce((sum, f) => sum + f.bytes, 0), files }
}

/** startTime (ms) of the first performance entry with this name (mark or measure). */
export async function markTime(page: Page, name: string): Promise<number | undefined> {
  return page.evaluate((n) => performance.getEntriesByName(n)[0]?.startTime, name)
}

/**
 * renderTime (ms) of the element marked elementtiming="{identifier}" (Element
 * Timing API, Chromium), or null if it has not painted.
 */
export async function elementTime(page: Page, identifier: string): Promise<number | null> {
  return page.evaluate(
    (id) =>
      new Promise<number | null>((resolve) => {
        let found: number | null = null
        try {
          const observer = new PerformanceObserver((list) => {
            for (const e of list.getEntries() as (PerformanceEntry & { identifier?: string; renderTime?: number })[]) {
              if (e.identifier === id && found === null) found = e.renderTime || e.startTime
            }
          })
          observer.observe({ type: 'element', buffered: true })
          setTimeout(() => {
            observer.disconnect()
            resolve(found)
          }, 250)
        } catch {
          resolve(null)
        }
      }),
    identifier
  )
}
