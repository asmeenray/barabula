'use client'

// The laptop plane cursor (UI-SPEC "Plane cursor", D-31, DESIGN-RESEARCH §16).
// A 28 px navy plane flies BESIDE the real cursor (+16 px, +12 px); the system
// cursor is never hidden. Only over the home blank pass; BlankPass loads this
// chunk only under (hover: hover) and (pointer: fine) without reduced motion.
// Follows with a spring (stiffness 380, damping 42); its heading comes from the
// spring's velocity, updated only above 0.5 px/frame, along the shortest
// angle. One transform write per animation frame through a ref, no React
// state per move, and the loop stops once the plane has settled. Fades out
// (150 ms) over text fields, on keyboard focus and after 2 s idle. No trail.

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { createPortal } from 'react-dom'

const OFFSET_X = 16
const OFFSET_Y = 12
const STIFFNESS = 380
const DAMPING = 42
/** Below this speed the heading holds (no jitter while settling). */
const TURN_MIN_PX_PER_FRAME = 0.5
const IDLE_MS = 2000
const FIELDS = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'

/** Shortest signed turn from `from` to `to`, in degrees (−180…180). */
export function shortestTurn(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180
}

export default function PlaneCursor({ area }: { area: RefObject<HTMLElement | null> }) {
  const planeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const zone = area.current
    const plane = planeRef.current
    if (!zone || !plane) return

    const pos = { x: 0, y: 0 }
    const vel = { x: 0, y: 0 }
    const target = { x: 0, y: 0 }
    let heading = -30
    let placed = false
    let shown = false
    let raf = 0
    let last = 0
    let idle = 0

    const show = (on: boolean) => {
      if (shown === on) return
      shown = on
      plane.style.opacity = on ? '1' : '0'
    }

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30) || 1 / 60
      last = now
      for (const axis of ['x', 'y'] as const) {
        const force = -STIFFNESS * (pos[axis] - target[axis]) - DAMPING * vel[axis]
        vel[axis] += force * dt
        pos[axis] += vel[axis] * dt
      }
      const perFrame = Math.hypot(vel.x, vel.y) / 60
      if (perFrame > TURN_MIN_PX_PER_FRAME) {
        const toward = (Math.atan2(vel.y, vel.x) * 180) / Math.PI
        heading += shortestTurn(heading, toward) * 0.25
      }
      plane.style.transform = `translate3d(${pos.x + OFFSET_X}px, ${pos.y + OFFSET_Y}px, 0) rotate(${heading}deg)`
      const settled =
        Math.abs(pos.x - target.x) < 0.1 && Math.abs(pos.y - target.y) < 0.1 && Math.hypot(vel.x, vel.y) < 1
      raf = settled ? 0 : requestAnimationFrame(step)
    }

    const fly = () => {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(step)
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      target.x = e.clientX
      target.y = e.clientY
      if (!placed) {
        placed = true
        pos.x = target.x
        pos.y = target.y
      }
      const overField = e.target instanceof Element && e.target.closest(FIELDS) !== null
      show(!overField)
      window.clearTimeout(idle)
      idle = window.setTimeout(() => show(false), IDLE_MS)
      fly()
    }
    const onLeave = () => show(false)
    const onFocus = (e: FocusEvent) => {
      if (e.target instanceof Element && e.target.matches(':focus-visible')) show(false)
    }

    zone.addEventListener('pointermove', onMove)
    zone.addEventListener('pointerleave', onLeave)
    zone.addEventListener('focusin', onFocus)
    return () => {
      zone.removeEventListener('pointermove', onMove)
      zone.removeEventListener('pointerleave', onLeave)
      zone.removeEventListener('focusin', onFocus)
      window.clearTimeout(idle)
      cancelAnimationFrame(raf)
    }
  }, [area])

  // In <body>, so no transformed ancestor can shift the fixed position.
  return createPortal(
    <div
      ref={planeRef}
      aria-hidden="true"
      data-plane-cursor=""
      className="pointer-events-none fixed top-0 left-0 z-50 size-7 text-navy opacity-0 transition-opacity duration-150 ease-[var(--ease-out)] will-change-transform"
      style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))' }}
    >
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
        {/* A plane heading right (0°): nose, swept wings, tail. */}
        <path
          d="M22 10.5H15L11 3H8.5L10.5 10.5H5L3 8H1.5L2.5 12L1.5 16H3L5 13.5H10.5L8.5 21H11L15 13.5H22Q23.5 12 22 10.5Z"
          fill="currentColor"
          stroke="#fff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>,
    document.body
  )
}
