// Moment 2 "place lands in plan" on the trip map (16-22, D-30, UI-SPEC Motion):
// pure timings and helpers shared by TripMap and PinDrop. No MapLibre import,
// so this stays out of the route's first JS.

import type { ExpressionSpecification } from 'maplibre-gl'
import type { PinFeature } from './pinImages'

export const PIN_DROP = {
  /** The pin waits for the camera to start easing to its day. */
  delayMs: 420,
  /** translateY(-26px) scale(.9) → one small bounce → rest. */
  dropMs: 520,
  /** The pulse ring starts as the pin touches down (85% of the drop). */
  ringDelayMs: 840,
  ringMs: 520,
  /** The route segment to the new pin draws after the pin has landed. */
  drawMs: 400,
  /** Marker and symbol pin overlap this long, so the swap never blinks. */
  settleMs: 300,
  /** Reduced motion: the pin fades in, nothing moves. */
  fadeMs: 150,
} as const

/** Time from the drop starting until the pin rests (the draw starts here). */
export function landedAfter(reduced: boolean): number {
  return reduced ? PIN_DROP.fadeMs : PIN_DROP.delayMs + PIN_DROP.dropMs
}

/**
 * The new route segment for a just-located pin: from the stop before it to it,
 * only when it is the last located stop of its day (adds go to the end of a
 * day). Null when there is nothing to draw (first stop, or a stop in the middle
 * whose route would change shape; that route is shown complete).
 */
export function landingSegment(pins: readonly PinFeature[], id: string): [number, number][] | null {
  const pin = pins.find((p) => p.properties.id === id)
  if (!pin) return null
  const day = pins.filter((p) => p.properties.day === pin.properties.day)
  const i = day.indexOf(pin)
  if (i < 1 || i !== day.length - 1) return null
  return [day[i - 1].geometry.coordinates, pin.geometry.coordinates]
}

/**
 * line-gradient for a route drawn up to `progress` (0–1) along the line
 * (line-progress needs lineMetrics on the source): colour before, nothing after.
 */
export function drawnTo(progress: number, colour: string): ExpressionSpecification {
  // A stop just past 1 leaves the whole line coloured at the end.
  const stop = progress >= 1 ? 1.01 : Math.max(0, progress)
  return ['step', ['line-progress'], colour, stop, 'rgba(0, 0, 0, 0)']
}

/** Draw progress at a moment of the 400 ms draw, eased out (--ease-out ≈ cubic out). */
export function drawProgress(elapsedMs: number): number {
  const t = Math.min(1, Math.max(0, elapsedMs / PIN_DROP.drawMs))
  return 1 - (1 - t) ** 3
}
