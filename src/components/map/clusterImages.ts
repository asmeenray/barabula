// Places tab clusters (UI-SPEC "Color: Places pins and clusters", 16-18): an
// --ink disc of 32 / 40 / 48 px (< 10 / < 50 / ≥ 50 places) with the count in
// Geist Mono 12/600 in the --bg colour. Geist Mono is not available as map
// glyphs, so each disc is a canvas image named cluster-{count}-{theme},
// supplied on demand through MapLibre's missing-image resolver — the same
// pattern as the plan map's tag pins (pinImages.ts). Kept in its own module so
// none of it reaches the trip plan's map chunk (route JS budget, Q63).

import type { PinTheme } from './pinImages'

export interface ClusterSpec {
  /** Places in the cluster, 2–1000 (1000 reads "999+"). */
  count: number
  theme: PinTheme
}

const CLUSTER_ID = /^cluster-(\d{1,4})-(light|dark)$/
const CLUSTER_MAX = 1000

export const CLUSTER_COLOURS = {
  light: { fill: '#0B1014', text: '#EEF1F4' },
  dark: { fill: '#E6E8EB', text: '#080D10' },
} as const

export function clusterImageId({ count, theme }: ClusterSpec): string {
  return `cluster-${Math.max(2, Math.min(CLUSTER_MAX, Math.floor(count)))}-${theme}`
}

/** The spec behind an id from clusterImageId, or null for any other image id. */
export function parseClusterImageId(id: string): ClusterSpec | null {
  const m = CLUSTER_ID.exec(id)
  if (!m) return null
  const count = Number(m[1])
  return count >= 2 && count <= CLUSTER_MAX ? { count, theme: m[2] as PinTheme } : null
}

/** Disc diameter in px for a cluster of n places. */
export function clusterSize(count: number): 32 | 40 | 48 {
  return count < 10 ? 32 : count < 50 ? 40 : 48
}

export function clusterLabel(count: number): string {
  return count >= CLUSTER_MAX ? '999+' : String(count)
}

let font = '600 12px ui-monospace, monospace'

/** Loads Geist Mono 600 (next/font's --font-geist-mono) for the counts. Never rejects. */
export function loadClusterFont(): Promise<unknown> {
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-geist-mono').trim()
  if (family) font = `600 12px ${family}`
  return document.fonts.load(font).catch(() => {})
}

/** Draws one cluster disc (browser only), at devicePixelRatio for addImage. */
export function drawCluster(spec: ClusterSpec, pixelRatio: number): ImageData {
  const colours = CLUSTER_COLOURS[spec.theme]
  const d = clusterSize(spec.count)
  const label = clusterLabel(spec.count)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.ceil(d * pixelRatio)
  const c = canvas.getContext('2d') as CanvasRenderingContext2D
  c.scale(pixelRatio, pixelRatio)
  const r = d / 2
  c.beginPath()
  c.arc(r, r, r - 1, 0, Math.PI * 2)
  c.fillStyle = colours.fill
  c.fill()
  // A 2 px --bg ring inside the edge keeps touching discs and pins apart.
  c.lineWidth = 2
  c.strokeStyle = colours.text
  c.stroke()
  c.font = font
  c.fillStyle = colours.text
  // Centred by hand, as the pins are: digits are about 8.5 px tall at 12 px.
  c.fillText(label, r - c.measureText(label).width / 2, r + 4.5)
  return c.getImageData(0, 0, canvas.width, canvas.height)
}
