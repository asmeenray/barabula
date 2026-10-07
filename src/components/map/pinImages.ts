// Trip-plan "tag" pins (UI-SPEC "Map colour", D-02), drawn on demand.
// Pin numbers are Geist Mono, which map glyphs can't render, so each pin is a
// canvas image named pin-{state}-{nn}-{theme} and supplied lazily through
// MapLibre's missing-image resolver (TripMap). Only numbers and a check glyph
// are drawn; place names never reach the map canvas (T-16-45).
// Also the pure pin data: one GeoJSON point per located day stop, numbered
// like the board rows, and the selected day's route through them.

import { osmCoordsFrom } from '@/lib/geo-cache'
import { sortActivities } from '@/lib/plan/days'
import type { PlanActivity } from '@/lib/plan/types'

/** 'day' = accent pin with its stop number; 'selected' = a day (or visited, nn 00) pin at 1.15 with an outline. */
export type PinState = 'day' | 'visited' | 'selected'
export type PinTheme = 'light' | 'dark'
export interface PinSpec {
  state: PinState
  /** Stop number in its day, 1–99; 0 = the visited check. */
  num: number
  theme: PinTheme
}

const ID = /^pin-(day|visited|selected)-(\d\d)-(light|dark)$/

export function pinImageId({ state, num, theme }: PinSpec): string {
  return `pin-${state}-${String(Math.max(0, Math.min(99, num))).padStart(2, '0')}-${theme}`
}

/** The spec behind an id from pinImageId, or null for any other image id. */
export function parsePinImageId(id: string): PinSpec | null {
  const m = ID.exec(id)
  return m ? { state: m[1] as PinState, num: Number(m[2]), theme: m[3] as PinTheme } : null
}

export interface PinFeature {
  type: 'Feature'
  properties: {
    id: string
    day: number
    num: number
    /** Image for the pin at rest, and when hovered or selected. */
    img: string
    sel: string
  }
  geometry: { type: 'Point'; coordinates: [number, number] }
}

/** Located places with a day, in board order. Maybe and unlocated places get no pin. */
export function pinFeatures(activities: readonly PlanActivity[], theme: PinTheme): PinFeature[] {
  const out: PinFeature[] = []
  let day = 0
  let num = 0
  for (const a of sortActivities(activities)) {
    if (a.day_number === null) continue
    num = a.day_number === day ? num + 1 : 1
    day = a.day_number
    const c = osmCoordsFrom(a.extra_data)
    if (!c) continue // still counted: the pin number matches the row's
    const visited = a.extra_data?.visited === true
    const n = visited ? 0 : num
    out.push({
      type: 'Feature',
      properties: {
        id: a.id,
        day,
        num,
        img: pinImageId({ state: visited ? 'visited' : 'day', num: n, theme }),
        sel: pinImageId({ state: 'selected', num: n, theme }),
      },
      geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
    })
  }
  return out
}

/** The day's route: its located stops in order, or [] when there are fewer than two. */
export function dayRoute(pins: readonly PinFeature[], day: number | 'maybe'): [number, number][] {
  const line = pins.filter((p) => p.properties.day === day).map((p) => p.geometry.coordinates)
  return line.length > 1 ? line : []
}

// UI-SPEC colour tokens (globals.css): accent, on-accent, pin ring, selected outline.
export const PIN_COLOURS = {
  light: { accent: '#F2A900', on: '#16202B', ring: '#0B1014', outline: '#0B1014' },
  dark: { accent: '#FFC233', on: '#0E141B', ring: '#080D10', outline: '#FFFFFF' },
} as const
const VISITED_FILL = '#3A444F'
const VISITED_CHECK = '#E6E8EB'

let font = '600 12px ui-monospace, monospace'

/**
 * Loads Geist Mono 600 (the --font-geist-mono family from next/font) so the
 * first pins are drawn in it. Never rejects (a failed load draws in the fallback).
 */
export function loadPinFont(): Promise<unknown> {
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-geist-mono').trim()
  if (family) font = `600 12px ${family}`
  return document.fonts.load(font).catch(() => {})
}

const H = 28 // body height
const TIP = 8 // pointer depth below the body

/** The tag outline: rounded rect (radius 4) with a pointer at the bottom middle. */
function tag(x: number, y: number, w: number): Path2D {
  const r = 4
  const b = y + H
  const mx = x + w / 2
  const p = new Path2D()
  p.moveTo(x + r, y)
  p.arcTo(x + w, y, x + w, b, r)
  p.arcTo(x + w, b, mx, b, r)
  p.lineTo(mx + 6, b)
  p.lineTo(mx, b + TIP)
  p.lineTo(mx - 6, b)
  p.arcTo(x, b, x, y, r)
  p.arcTo(x, y, mx, y, r)
  p.closePath()
  return p
}

/** Draws one pin (browser only). Images are made at devicePixelRatio for MapLibre's addImage. */
export function drawPin(spec: PinSpec, pixelRatio: number): ImageData {
  const colours = PIN_COLOURS[spec.theme]
  const selected = spec.state === 'selected'
  const visited = spec.state === 'visited' || spec.num === 0
  const label = String(spec.num).padStart(2, '0')
  const canvas = document.createElement('canvas')
  // Resizing the canvas below resets this context's state, not the context.
  const c = canvas.getContext('2d') as CanvasRenderingContext2D
  c.font = font
  const tw = c.measureText(label).width
  const w = visited ? H : Math.max(H, Math.ceil(tw) + 14)
  // Ring 2 px outside the body; the selected outline sits 2 px further out and is 2 px wide.
  const m = selected ? 6 : 2
  const scale = selected ? 1.15 : 1
  canvas.width = Math.ceil((w + 2 * m) * scale * pixelRatio)
  canvas.height = Math.ceil((H + TIP + 2 * m) * scale * pixelRatio)
  c.scale(scale * pixelRatio, scale * pixelRatio)
  c.lineJoin = 'round'
  c.lineCap = 'round'
  const shape = tag(m, m, w)
  if (selected) {
    c.lineWidth = 12
    c.strokeStyle = colours.outline
    c.stroke(shape)
    // Clear the 2 px gap between the outline and the ring.
    c.globalCompositeOperation = 'destination-out'
    c.lineWidth = 8
    c.stroke(shape)
    c.globalCompositeOperation = 'source-over'
  }
  c.lineWidth = 4
  c.strokeStyle = colours.ring
  c.stroke(shape)
  c.fillStyle = visited ? VISITED_FILL : colours.accent
  c.fill(shape)
  const cx = m + w / 2
  const cy = m + H / 2
  if (visited) {
    c.lineWidth = 2
    c.strokeStyle = VISITED_CHECK
    c.beginPath()
    c.moveTo(cx - 5, cy)
    c.lineTo(cx - 1.5, cy + 3.5)
    c.lineTo(cx + 5, cy - 3.5)
    c.stroke()
  } else {
    // Centred by hand: digits sit on the baseline, about 8.5 px tall at 12 px.
    c.font = font
    c.fillStyle = colours.on
    c.fillText(label, cx - tw / 2, cy + 4.5)
  }
  return c.getImageData(0, 0, canvas.width, canvas.height)
}
